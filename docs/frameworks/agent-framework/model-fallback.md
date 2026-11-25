---
title: 模型回退与流式切换边界
description: ModelFallbackInterceptor 的候选顺序、流式首事件切换边界、取消处理及与重试的组合。
---

# 模型回退与流式切换边界

## 基线与依赖

本文描述 `ModelFallbackInterceptor` 在模型调用失败时如何切换到备用模型。基线为 Core
[c6e453f20](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6)，
2026-11-25 核对，包含已合并的 [#368](https://github.com/agentic-ai-java/argi/pull/368)
（流式回退的取消感知切换边界，对应 [#210](https://github.com/agentic-ai-java/argi/issues/210)）。
源码版本为 `2.1.0-RC2-SNAPSHOT`，不代表该提交已发布到 Maven Central；相同 SNAPSHOT
字符串也不保证相同源码。

`ModelFallbackInterceptor` 位于 `argi-agent-framework` 模块，包为
`io.github.agentic.ai.agent.orchestration.interceptor.modelfallback`。两种引擎都通过
`interceptors(...)` 注册；独立 ReActAgent 使用它时也需要引入该模块及其传递依赖。

## 配置

```java
ModelFallbackInterceptor fallback = ModelFallbackInterceptor.builder()
    .addFallbackClient(backupClient)      // 按添加顺序尝试
    .addFallbackClient(lastResortClient)
    .build();

ReActAgent agent = ReActAgent.builder(primaryClient)
    .interceptors(List.of(fallback))
    .build();
```

- 至少要添加一个备用 `ChatClient`，否则 `build()` 抛出 `IllegalArgumentException`。
- 主模型是引擎自己的 `ChatClient`。主模型失败后，按添加顺序依次尝试备用模型，直到某个成功或全部失败。
- 切换时复用同一个请求（系统消息、工具、选项不变），只替换 `ChatClient`。
- 没有可配置的失败分类：除取消外，任何失败都会触发切换。需要按类型决定是否重试，应组合
  [模型调用重试](./model-retry.md)。

## 全部失败时

所有候选都失败时抛出 `RuntimeException`，消息形如
`All clients failed after 3 attempts (primary, fallback-1, fallback-2)`，`getCause()` 是最后一个候选的失败。

## 取消与运行控制

- 每次调用候选模型之前，都会检查请求上的 `ExecutionGuard`。运行已被取消或已过截止时间时，
  抛出运行控制自己的异常，不再调用任何模型，主模型也不例外。
- 失败的 cause 链（最多 32 层）中有 `CancellationException` 时，原样抛出该取消异常，不切换。
  cause 链中有 `InterruptedException` 时，转换为 `CancellationException` 并恢复线程中断标记。
- 同步路径上，线程已被中断也视为取消。

## 流式切换边界

当一次调用返回**流式响应**时，回退拦截器在流上加一道切换边界：

| 失败发生的时机 | 行为 |
| --- | --- |
| 还没有向下游发出任何事件 | 切换到下一个候选模型，调用方只看到新模型的输出。 |
| 已经发出过文本增量、工具调用、用量或响应事件 | 直接以该失败结束流，不切换，避免两个模型的输出拼在一起。 |
| 失败是取消（含被包装的取消） | 无论在边界哪一侧，都以 `CancellationException` 结束，不切换。 |

每次订阅流式响应都有自己独立的切换状态，重复订阅不会接着上一次的切换进度。
切换到下一个候选的调用在 `boundedElastic` 线程上发起，不会阻塞发出失败信号的线程。

### 两种引擎的差别

这条边界只在拦截器拿到的是**流式** `ModelResponse` 时生效：

- **graph-based `ReactAgent`**：开启流式时，`AgentLlmNode` 把流式响应交给拦截器链，边界生效。
- **独立 `ReActAgent`**：`streamModel(true)` 时，引擎在模型调用内部消费提供商的流，
  一边向调用方发出 `AgentEvent.MessageDelta`，一边收集完整响应，最后交给拦截器的是**非流式**响应。
  拦截器看不到已经输出过增量，因此：
  - 首个增量之前失败：切换干净，调用方只看到备用模型的文本（示例场景 7）。
  - 输出部分增量之后失败：**仍然会切换**，备用模型的增量追加在同一个消息 ID 后面，
    增量视图会出现两个模型拼接的文本，例如 `Draft` + `Done` 显示为 `DraftDone`；
    随后同 ID 的完整快照把它替换为 `Done`（示例场景 8）。
  - `ModelRetryInterceptor` 在这条路径上也一样：输出部分增量后的临时失败会被重试，
    新的增量同样追加在后面（示例场景 9）。

在独立 ReActAgent 上同时使用流式输出和回退/重试时，消费方必须遵守
[流式消息 ID 与消息视图](./stream-message-identity.md)的规则：以同 ID 的完整快照为准，
不要把增量拼接结果当作最终答案。

## 与模型重试一起使用

先注册回退拦截器（最外层），再注册重试拦截器：

```java
ReActAgent agent = ReActAgent.builder(primaryClient)
    .interceptors(List.of(fallback, retry))
    .build();
```

这样每个模型先按重试策略重试到用尽，再切换到下一个候选。示例场景 4 中，
主模型连续 3 次临时失败后才调用备用模型（主模型 3 次、备用模型 1 次）。
顺序反过来时，重试包住整个回退序列：只有整个序列失败、且该失败被判定为可重试时才会重试，
每次重试都从主模型重新开始（本页示例未测试这种顺序）。

## 运行离线示例

网站仓库的 `examples/streaming-fallback/` 用脚本化的假 `ChatClient` 驱动真实的独立 ReAct 引擎、
`ModelFallbackInterceptor` 和 `ModelRetryInterceptor`。要求 JDK 17+、Maven 3.9.1+。
在 Core 仓库检出固定提交后执行：

```bash
git checkout c6e453f20fcb1c7837d92b321aa18ec5a46ccab6
./mvnw -B -pl :argi-agent-framework -am install -DskipTests
```

在网站仓库根目录执行：

```bash
mvn -B -f examples/streaming-fallback/pom.xml compile exec:java
```

依赖下载需要网络，示例执行无需网络或凭据。成功时输出：

```text
PASS: non-streaming fallback, exhaustion, cancellation, retry ordering, stream switch boundary, independent ReAct streaming before/after output, retry after output
```

断言失败会使命令失败，不依赖 `-ea`。

## 验证映射与限制

| 场景 | 离线示例中的验证 |
| --- | --- |
| 1 非流式回退 | 主模型失败，备用模型回答，各调用 1 次。 |
| 2 全部失败 | 消息列出候选序列，cause 为最后一个失败。 |
| 3 取消 | 主模型抛出 `CancellationException`，调用方收到取消，备用模型调用 0 次。 |
| 4 与重试组合 | 回退在外、重试在内：主模型 3 次、备用模型 1 次。 |
| 5 流式边界：输出前失败 | 直接用流式 handler 驱动拦截器（即 graph 引擎的形态），干净切换到备用模型。 |
| 6 流式边界：输出后失败 | 同上，输出 `Draft` 后失败，流以错误结束，备用模型调用 0 次。 |
| 7 独立 ReAct 流式：输出前失败 | 增量只有备用模型的 `Done`。 |
| 8 独立 ReAct 流式：输出后失败 | 仍切换，增量为 `DraftDone`，快照为 `Done`。 |
| 9 独立 ReAct 流式：输出后重试 | 重试再次调用，增量为 `DraftDone`，快照为 `Done`。 |
| graph-based `ReactAgent` 端到端 | 未测试；场景 5、6 只验证拦截器本身的流式契约。 |

依据：[ModelFallbackInterceptor 源码](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/main/java/io/github/agentic/ai/agent/orchestration/interceptor/modelfallback/ModelFallbackInterceptor.java)、
[独立 ReActAgent 源码](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-core/src/main/java/io/github/agentic/ai/agent/react/ReActAgent.java)
和上游测试 [ModelFallbackSwitchBoundaryTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/test/java/io/github/agentic/ai/agent/orchestration/interceptors/ModelFallbackSwitchBoundaryTest.java)。
离线通过不代表真实提供商已验证。本页及英文对应页只覆盖
[#372](https://github.com/agentic-ai-java/argi/issues/372) 的流式回退项。
