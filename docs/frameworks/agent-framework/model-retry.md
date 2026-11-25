---
title: 模型调用重试
description: ModelRetryInterceptor 的重试次数、失败分类、退避与运行截止时间。
---

# 模型调用重试

## 基线与依赖

本文描述 `ModelRetryInterceptor` 在单次模型调用失败后如何决定是否重试。基线为 Core
[c6e453f20](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6)，
2026-11-24 核对，包含已合并的 [#356](https://github.com/agentic-ai-java/argi/pull/356)
（受控模型重试，对应 [#313](https://github.com/agentic-ai-java/argi/issues/313)）。
源码版本为 `2.1.0-RC2-SNAPSHOT`，不代表该提交已发布到 Maven Central；相同 SNAPSHOT
字符串也不保证相同源码。

| 类型 | 模块 | 包 |
| --- | --- | --- |
| `ModelRetryInterceptor` | `argi-agent-framework` | `io.github.agentic.ai.agent.orchestration.interceptor.modelretry` |
| `RetryPolicy`、`ModelCallFailureCategory`、`TypeBasedModelCallFailureClassifier` 等契约 | `argi-agent-api` | `io.github.agentic.ai.agent.retry` |

两种引擎都通过 `interceptors(...)` 注册：独立的
`io.github.agentic.ai.agent.react.ReActAgent.builder(client).interceptors(List.of(retry))`，
以及 graph-based `ReactAgent.builder().interceptors(retry)`。拦截器类目前位于
`argi-agent-framework`，因此独立 ReActAgent 使用它时也需要引入该模块及其传递依赖。

## 推荐配置

```java
ModelRetryInterceptor retry = ModelRetryInterceptor.builder()
    .maxAttempts(3)                       // 含第一次调用，最多 3 次
    .initialDelay(1000)                   // 第二次调用前等待 1 秒
    .backoffMultiplier(2.0)               // 之后每次乘 2
    .maxDelay(30000)                      // 单次等待上限
    .failureClassifier(new TypeBasedModelCallFailureClassifier())
    .deadlineReserve(Duration.ofMillis(500))
    .build();

ReActAgent agent = ReActAgent.builder(client)
    .interceptors(List.of(retry))
    .build();
```

新应用应显式设置 `failureClassifier`。不设置时沿用旧的“按异常文本判断”行为，见下文。

## 默认值

| Builder 方法 | 默认值 | 含义 |
| --- | --- | --- |
| `maxAttempts` | `3` | 总调用次数，包含第一次，必须 ≥ 1。 |
| `initialDelay` | `1000` 毫秒 | 第一次失败后的等待时间。 |
| `backoffMultiplier` | `2.0` | 后续等待依次相乘，必须是 ≥ 1.0 的有限数。 |
| `maxDelay` | `30000` 毫秒 | 单次等待上限。 |
| `retryableCategories` | `TRANSIENT`、`RATE_LIMITED` | 允许重试的失败类别。 |
| `deadlineReserve` | `0` | 距离运行截止时间至少还剩多少才开始下一次调用。 |
| `failureClassifier` | 未设置 | 未设置时由 `retryableExceptionPredicate` 判断。 |

按默认值，最多 3 次调用，两次等待分别为 1 秒和 2 秒。

## 哪些失败会重试

每次失败先归入一个 `ModelCallFailureCategory`，再由 `retryableCategories` 决定是否重试：

| 类别 | 含义 | 默认是否重试 |
| --- | --- | --- |
| `TRANSIENT` | 临时故障，下次可能成功 | 是 |
| `RATE_LIMITED` | 提供商要求降速 | 是 |
| `PERMANENT` | 请求本身被拒绝 | 否 |
| `CANCELLED` | 已取消或被中断 | 永不重试 |
| `UNKNOWN` | 无法分类 | 否 |

**设置了 `failureClassifier`**：由分类器决定，`retryableExceptionPredicate` 不再参与。
默认的 `TypeBasedModelCallFailureClassifier` 只看异常类型，不读消息文本，沿 cause 链最多检查 32 层：

- `CancellationException`、`InterruptedException` → `CANCELLED`
- `SocketTimeoutException`、`TimeoutException`、`IOException` → `TRANSIENT`
- 其他 → `UNKNOWN`，不重试

它不会产出 `RATE_LIMITED` 或 `PERMANENT`。提供商用自有异常表示 429 等情况时，
自定义分类器并保留默认分类作为兜底：

```java
ModelCallFailureClassifier classifier = failure ->
    failure instanceof MyProviderRateLimitException
        ? new ModelCallFailure(ModelCallFailureCategory.RATE_LIMITED, failure)
        : new TypeBasedModelCallFailureClassifier().classify(failure);
```

**未设置 `failureClassifier`（兼容旧配置）**：默认谓词按消息文本和类名判断，
例如消息包含 `connection`、`timeout`、`socket`、`i/o error`，或 cause 链中类名包含
`IOException`、`TimeoutException`、`SSLException`。命中归为 `TRANSIENT`，否则为 `PERMANENT`。
因此消息恰好含 “timeout” 的永久错误也会被重试；离线示例第 4 个场景演示了这一点。

## 次数、截止时间与取消

一次失败后的判断顺序：

1. 取消：cause 链中有 `CancellationException`，或线程已被中断时，立即抛出 `CancellationException`，不会再调用；
   分类器返回 `CANCELLED` 时以 `CANCELLED` 停止。
2. 类别不在 `retryableCategories` 中：停止，原因 `NON_RETRYABLE`。
3. 已达到 `maxAttempts`：停止，原因 `ATTEMPTS_EXHAUSTED`。
4. 当前时间加上下一次等待不早于运行截止时间：停止，原因 `DEADLINE_EXCEEDED`。
5. 否则等待后重试。

每次调用开始前还会检查：运行已被停止时由运行控制抛出它自己的异常；截止时间已过，
或剩余时间 ≤ `deadlineReserve` 时以 `DEADLINE_EXCEEDED` 停止。

截止时间来自运行的 `ExecutionGuard`。独立 ReActAgent 传入执行上下文的控制，
截止时间取自 `TrustedExecutionContext.builder().deadline(...)`；graph-based 框架传入运行配置的 guard。
有 guard 时，等待按 100 毫秒切片进行，每片前检查 guard，取消或过期的运行会提前结束等待，
不会再发出调用。没有截止时间时只受 `maxAttempts` 约束。

## 失败时调用方看到什么

序列停止时抛出 `RuntimeException`，`getCause()` 是最后一次提供商失败：

| 停止原因 | 异常消息 |
| --- | --- |
| `ATTEMPTS_EXHAUSTED` | `Model call failed, maximum number of retries reached.` |
| `NON_RETRYABLE` | `Model call failed (non-retryable exception)` |
| `DEADLINE_EXCEEDED` | `Model call failed, the run deadline does not allow another attempt` |
| `CANCELLED` | `Model call failed, the attempt was cancelled` |
| `EXECUTION_STOPPED` | `Model call failed, the run stopped` |

当前基线没有在异常上暴露类型化的 `RetryStopReason`，消息仅用于诊断，不建议据此做控制流。
需要区分提供商错误时，检查 `getCause()`。独立 ReActAgent 中，`invoke(...)` 返回的
`CompletableFuture` 以该异常失败，`stream(...)` 的订阅者收到 `onError`。

## 与模型回退一起使用

同时使用 `ModelFallbackInterceptor` 时，先注册回退拦截器（最外层），再注册重试拦截器，
这样每个模型先重试到用尽，再切换下一个候选模型。

## 流式调用

当拦截器拿到的是流式 `ModelResponse`（graph-based `ReactAgent` 开启流式时）时，
只有在还没有向下游输出任何 chunk 之前失败才会重试；已经输出部分内容后失败会直接结束，
避免重复输出。每次订阅各自拥有独立的次数预算。

独立 ReActAgent 的 `streamModel(true)` 不同：引擎在模型调用内部消费流并发出增量，
交给拦截器的是非流式响应，所以输出部分增量后的临时失败**仍会重试**，新的增量追加在同一个消息 ID 后面，
随后由完整快照替换。详见[模型回退与流式切换边界](./model-fallback.md#两种引擎的差别)，
该页离线示例的场景 9 验证了这一行为。本页离线示例只验证非流式 `call` 路径。

## 运行离线示例

网站仓库的 `examples/model-retry/` 用脚本化的假 `ChatClient` 驱动真实的独立 ReAct 引擎和
`ModelRetryInterceptor`。要求 JDK 17+、Maven 3.9.1+。在 Core 仓库检出固定提交后执行：

```bash
git checkout c6e453f20fcb1c7837d92b321aa18ec5a46ccab6
./mvnw -B -pl :argi-agent-framework -am install -DskipTests
```

在网站仓库根目录执行：

```bash
mvn -B -f examples/model-retry/pom.xml compile exec:java
```

依赖下载需要网络，示例执行无需网络或凭据。成功时输出：

```text
PASS: transient retry, attempt bound, UNKNOWN not retried, legacy predicate, custom classifier, deadline stop
```

断言失败会使命令失败，不依赖 `-ea`。

## 验证映射与限制

| 内容 | 离线示例中的验证 |
| --- | --- |
| 临时失败重试后成功 | 两次 `IOException` 后成功，共 3 次调用。 |
| 次数上限 | 连续 3 次 `IOException`，以次数用尽失败，cause 为最后一次失败。 |
| 不读消息文本 | 消息含 “timeout” 的 `IllegalArgumentException` 归为 `UNKNOWN`，只调用 1 次。 |
| 旧谓词行为 | 不设分类器时同一异常被重试 3 次。 |
| 自定义分类 | 自有异常映射为 `RATE_LIMITED`，重试后成功。 |
| 截止时间 | 下一次等待超过截止时间，不再发出第二次调用。 |
| 取消、`deadlineReserve`、流式 | 本示例未重复测试，依据下方固定提交的上游测试。 |
| graph-based `ReactAgent` | 本示例和上游重试测试都没有经过该引擎，本页对它的描述只依据源码。 |

依据：[ModelRetryInterceptor 源码](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/main/java/io/github/agentic/ai/agent/orchestration/interceptor/modelretry/ModelRetryInterceptor.java)、
[重试契约](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/main/java/io/github/agentic/ai/agent/retry)，
以及上游测试 [ModelRetryControllerTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/test/java/io/github/agentic/ai/agent/retry/ModelRetryControllerTest.java)（含 `deadlineReserve`）、
[ModelRetryCancellationTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/test/java/io/github/agentic/ai/agent/orchestration/interceptors/ModelRetryCancellationTest.java)
和 [ModelRetryInterceptorTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/test/java/io/github/agentic/ai/agent/orchestration/interceptors/ModelRetryInterceptorTest.java)（含流式）。
本重试只针对单次模型调用：不切换模型、不重放工具调用、不维护持久化重试预算。
离线通过不代表真实提供商已验证。本页及英文对应页只覆盖
[#372](https://github.com/agentic-ai-java/argi/issues/372) 的模型重试项。
