---
title: 会话 Threads
sidebar_label: 会话 Threads
description: 了解 Graph 中的会话隔离模型与检查点机制，支持多轮交互、记忆持久化与状态恢复。
keywords: [Threads, 会话, Checkpointer, 检查点, 状态恢复, 多租户]
---

# 会话（Threads）

在 AI 应用程序和对话式智能体中，不同的用户或业务流程需要维护互相独立的运行上下文。Graph 通过 **会话（Threads）** 机制实现多租户或多流程的状态隔离。

---

## 会话标识符（`threadId`）

会话是分配给状态检查点（Checkpoint）序列的唯一标识符。通过在 `RunnableConfig` 中指定 `threadId`，图引擎会在每次超级步骤（Super-step）执行后，自动将当前状态快照与下一个待执行节点 ID 关联保存到指定的会话中。

```java
import io.github.agentic.spring.ai.graph.RunnableConfig;
import java.util.Map;

// 为用户会话生成独立的配置
RunnableConfig config = RunnableConfig.builder()
    .threadId("session-user-10086")
    .build();

// 首次调用：图执行并基于该 threadId 持久化状态
graph.invoke(Map.of("message", "你好，我是张三"), config);

// 二次调用：传入相同的 threadId，图引擎将无缝承接前序状态
graph.invoke(Map.of("message", "请问我的名字是什么？"), config);
```

---

## 检查点（Checkpointer）协同

会话的能力建立在检查点持久化层（Checkpointer）的基础之上：

1. **会话级记忆**：在多轮对话中，同一 `threadId` 的后续请求可自动加载此前的会话历史与上下文。
2. **人机协同（HITL）**：当图在某个节点挂起等待人工干预时，工作流状态在当前 `threadId` 下安全保存，人工审批完成后可在该 `threadId` 处断点续传。
3. **时间旅行（Time Travel）**：通过指定 `threadId` 并回溯历史检查点，支持重试、状态修正或不同分支推演。

每个 Checkpoint 记录的核心元数据包括：
- **`state`**：当前超级步骤的完整状态快照。
- **`nextNodeId`**：图中接下来等待执行的节点标识符。
