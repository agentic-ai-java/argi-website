---
title: 流式消息 ID 与消息视图
description: 独立 ReActAgent 的增量追加、快照替换和调用内消息标识。
---

# 流式消息 ID 与消息视图

## 基线与依赖

本文针对独立的 `io.github.agentic.ai.agent.react.ReActAgent`，不是 graph-based
`ReactAgent` 或 Graph 流式 API。基线为 Core
[ef67b8e08](https://github.com/agentic-ai-java/argi/tree/ef67b8e083746899da43c0a056b76b71db9e92ab)，
2026-11-17 核对，包含已合并的 [#358](https://github.com/agentic-ai-java/argi/pull/358)。
源码版本为 `2.1.0-RC2-SNAPSHOT`，不代表该提交已发布到 Maven Central；
相同 SNAPSHOT 字符串也不保证相同源码。本页不替换固定旧基线的
[runtime contracts](./runtime-contracts.md)。

示例依赖 `io.github.agentic-ai-java:argi-agent-core:2.1.0-RC2-SNAPSHOT`，
传递引入中立 ChatClient、Agent 和 Runtime 契约。无需 Spring Boot、Graph、
Extensions BOM、模型适配器或 API key。先从固定提交构建安装依赖。

显式使用 `ReActAgent.builder(client).streamModel(true).build()` 开启模型流式调用，
再通过 `agent.stream(request, context)` 订阅 `Flow.Publisher<AgentEvent>`。
本文只覆盖显式启用路径，不把普通 `call` 当作流式调用。

## 消费规则

| 事件 | 消费动作 |
| --- | --- |
| `AgentEvent.MessageDelta` | 按 `messageId()` 追加 `text()`。 |
| `AgentEvent.Message` | 按同一 ID 替换为 `message().text()`，不能再次追加。 |
| `AgentEvent.Finished` | 保存 `outcome()`；消息快照不是整个运行成功的证明。 |
| `onError` | 标记运行失败；没有快照的增量仍是未完成文本。 |

例如增量 `He`、`llo` 后收到完整快照 `Hello`，最终显示 `Hello`，不是 `HelloHello`。
结构化修复还可能用同一 ID 替换终态消息，所以不能永久忽略同 ID 的后续快照。

```java
if (event instanceof AgentEvent.MessageDelta delta) {
    text.merge(delta.messageId(), delta.text(), String::concat);
} else if (event instanceof AgentEvent.Message message) {
    text.put(message.messageId(), message.message().text());
}
```

这只是文本展示投影。需要角色、工具调用或其他内容时，请保存完整 `ChatMessage`。

## ID 边界与失败行为

- 当前基线使用 `model-0`、`model-1` 等模型轮次 ID，工具结果使用 `tool-<callId>`。
  应使用事件返回的 ID，不要解析或自行构造这些格式。
- 同一轮增量与快照共享 ID，不同轮次和工具结果分别存储。
- ID 只在单次调用内有效。第二次调用也可以从 `model-0` 开始。
  每次调用新建视图；汇总多次调用时，用应用层调用标识与消息 ID 组成联合键，
  不能只按会话 ID 或消息 ID 汇总。
- 没有文本增量的工具轮也可能有快照；不能要求快照前一定有 delta。
- 模型轮次要求恰好一条 assistant 消息，多消息响应会被拒绝。
- 失败或取消可能留下增量而没有快照，应显示为未完成，不能当作已交付答案。
  取消订阅不保证还会收到终止回调，应用也要维护自己的取消状态。
- 本契约不保证跨进程恢复、重放去重、全局唯一性或提供商 ID 原样透传。

## 运行离线示例

网站仓库的 `examples/stream-message-identity/` 包含完整假 `ChatClient` 和消息视图，
通过真实 ReAct 引擎产生事件。要求 JDK 17+、Maven 3.9.1+。
在 Core 仓库检出固定提交后执行：

```bash
git checkout ef67b8e083746899da43c0a056b76b71db9e92ab
./mvnw -B -pl :argi-agent-core -am install -DskipTests
```

在网站仓库根目录执行：

```bash
mvn -B -f examples/stream-message-identity/pom.xml compile exec:java
```

依赖下载需要网络，示例执行无需网络或凭据。成功时输出：

```text
PASS: turn identity, snapshot replacement, invocation isolation, failure projection
```

断言失败会使命令失败，不依赖 `-ea`。

## 验证映射与限制

| 内容 | 离线示例中的验证 |
| --- | --- |
| 增量和快照不重复显示 | 拆分文本并替换快照，断言最终值。 |
| 多轮与工具隔离 | 两轮模型调用加本地工具，检查三个消息。 |
| 调用间隔离 | 同一个 agent 运行两次，新建独立视图，允许重复的 `model-0`。 |
| 失败的部分文本 | delta 后失败，检查部分文本保留且没有快照。 |
| 取消、修复、无文本工具轮 | 本示例未重复测试，契约依据下方固定提交的上游测试。 |

依据：[ReActAgent 源码](https://github.com/agentic-ai-java/argi/blob/ef67b8e083746899da43c0a056b76b71db9e92ab/argi-agent/argi-agent-core/src/main/java/io/github/agentic/ai/agent/react/ReActAgent.java)
和[消息 ID 回归测试](https://github.com/agentic-ai-java/argi/blob/ef67b8e083746899da43c0a056b76b71db9e92ab/argi-agent/argi-agent-core/src/test/java/io/github/agentic/ai/agent/react/ReActAgentStreamMessageIdTest.java)。
离线通过不代表真实提供商、浏览器 UI 或网络取消已验证。
本页及英文对应页只覆盖 [#372](https://github.com/agentic-ai-java/argi/issues/372) 的消息标识项。
