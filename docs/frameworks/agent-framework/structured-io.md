---
title: 结构化输入输出
sidebar_label: 结构化 I/O
description: 了解 ReactAgent 的 inputSchema、inputType、outputSchema、outputType、outputKey 和 AgentTool。
keywords: [ReactAgent, inputSchema, inputType, outputSchema, outputType, outputKey, AgentTool]
---

# 结构化输入输出

`ReactAgent` 支持通过 schema 或 Java 类型描述输入输出。这些配置主要用于两类场景：把 Agent 暴露为工具，以及让 Agent 的输出写入指定状态键并按策略合并。

## 输入结构

| 配置 | 说明 |
| --- | --- |
| `inputSchema(String)` | 直接提供 JSON Schema 字符串。 |
| `inputType(Type)` | 提供 Java 类型，框架在 Agent-as-tool 时使用 Spring AI 的 JSON Schema 生成能力。 |

当使用 `AgentTool.create(agent)` 或 `AgentTool.getFunctionToolCallback(agent)` 时，`AgentTool` 会读取子 Agent 的 `inputSchema` 或 `inputType`，并把原始 schema 包装到名为 `input` 的工具参数中。

```java
import io.github.agentic.spring.ai.graph.agent.AgentTool;
import io.github.agentic.spring.ai.graph.agent.ReactAgent;

record ResearchRequest(String topic, int maxItems) {}

ReactAgent researchAgent = ReactAgent.builder()
    .name("research_agent")
    .model(chatModel)
    .description("Researches a topic and returns concise findings.")
    .instruction("Use the input topic and maxItems to prepare findings.")
    .inputType(ResearchRequest.class)
    .build();

ToolCallback researchTool = AgentTool.create(researchAgent);
```

## 输出结构

| 配置 | 说明 |
| --- | --- |
| `outputSchema(String)` | 直接提供输出格式说明。 |
| `outputType(Class<?>)` | 使用 Spring AI `BeanOutputConverter` 生成格式提示。 |
| `outputKey(String)` | 指定 Agent 输出写入状态中的键。未设置时默认从 `messages` 中取最后一条 `AssistantMessage`。 |
| `outputKeyStrategy(KeyStrategy)` | 指定 `outputKey` 对应状态键的合并策略。未设置时使用 `ReplaceStrategy`。 |

```java
record ReviewResult(String decision, String reason) {}

ReactAgent reviewer = ReactAgent.builder()
    .name("reviewer")
    .model(chatModel)
    .instruction("Return the review result in the required structure.")
    .outputType(ReviewResult.class)
    .outputKey("review_result")
    .build();
```

当设置了 `outputKey` 时，`ReactAgent.call(...)` 会从最终状态的该键中读取 `AssistantMessage`。如果状态中不存在该键，会抛出异常。

## 子 Agent 上下文控制

`ReactAgent` 作为子图或子 Agent 使用时，可通过以下配置控制上下文：

| 配置 | 说明 |
| --- | --- |
| `includeContents(boolean)` | 是否把父状态中的消息上下文传给子 Agent。 |
| `returnReasoningContents(boolean)` | 子 Agent 完成后是否把中间推理消息返回给父流程。 |
| `outputKey(String)` | 子 Agent 结果写入父状态的键。 |
| `outputKeyStrategy(KeyStrategy)` | 结果写入父状态时的合并策略。 |

```java
ReactAgent writer = ReactAgent.builder()
    .name("writer")
    .model(chatModel)
    .instruction("Write a short draft.")
    .includeContents(false)
    .returnReasoningContents(false)
    .outputKey("draft")
    .build();
```

## AgentTool 调用行为

`AgentTool` 会把一个 `ReactAgent` 包装成 Spring AI `ToolCallback`：

1. 工具名来自 `agent.name()`。
2. 工具描述来自 `agent.description()`。
3. 工具输入 schema 来自 `inputSchema` 或 `inputType`，并包装到 `input` 参数。
4. 执行时从工具调用 JSON 中提取 `input` 字段。
5. 如果父工具上下文中有 `RunnableConfig`，子 Agent 会复用父配置并派生 `threadId`，同时清空运行时 context。
6. 子 Agent 返回最后一条 `AssistantMessage`，再由 `MessageToolCallResultConverter` 转成工具结果。

```java
ReactAgent coordinator = ReactAgent.builder()
    .name("coordinator")
    .model(chatModel)
    .instruction("Call the research tool when the request requires research.")
    .tools(AgentTool.getFunctionToolCallback(researchAgent))
    .build();
```

如果子 Agent 抛出 `GraphRunnerException` 或返回结果中没有 `AssistantMessage`，`AgentTool` 会把错误包装为工具执行异常。

