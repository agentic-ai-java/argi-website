---
title: Agent Framework 快速开始
sidebar_label: 快速开始
description: 使用 ARGI Agent Framework 创建一个基于 ReactAgent 的智能体。
---

# Agent Framework 快速开始

Agent Framework 提供面向智能体应用的上层 API。当前核心入口是 `ReactAgent`：它接收 Spring AI 的 `ChatModel`，可以绑定工具，并在推理、工具调用和观察结果之间循环执行。

## 添加依赖

使用 BOM 管理版本后，引入 Agent Framework：

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>argi-agent-framework</artifactId>
</dependency>
```

`argi-agent-framework` 依赖 `argi-graph-core`。如果应用只直接使用 `ReactAgent`，通常不需要再显式声明 Graph Core 依赖。

## 创建 ReactAgent

`ReactAgent` 使用 Spring AI 的 `ChatModel`。模型实例由应用按所选模型提供方创建或注入。

```java
import io.github.agentic.ai.graph.agent.ReactAgent;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.annotation.Tool;

import java.time.LocalDate;

class DateTools {

    @Tool(description = "Get the current date.")
    String currentDate() {
        return LocalDate.now().toString();
    }
}

ChatModel chatModel = obtainChatModel();

ReactAgent agent = ReactAgent.builder()
    .name("assistant")
    .model(chatModel)
    .instruction("Answer concisely and call tools when external data is required.")
    .methodTools(new DateTools())
    .build();

AssistantMessage response = agent.call("今天是几号？");
System.out.println(response.getText());
```

## 常用构建选项

| 方法 | 用途 |
| --- | --- |
| `model(ChatModel)` | 设置底层模型。 |
| `tools(...)` | 传入 Spring AI `ToolCallback`。 |
| `methodTools(...)` | 将带有 `@Tool` 的对象方法转换为工具。 |
| `instruction(...)` | 设置 Agent 级任务指令。 |
| `systemPrompt(...)` | 设置模型调用使用的系统提示。 |
| `saver(...)` | 设置检查点存储，用于会话状态与恢复。 |
| `hooks(...)` | 注册 Agent 或 Model 执行阶段的 Hook。 |
| `interceptors(...)` | 注册模型或工具调用拦截器。 |
| `outputType(...)` / `outputSchema(...)` | 约束模型输出结构。 |
| `throwOnModelError(true)` | 模型同步调用失败时抛出原始异常，而不是转换为 `AssistantMessage`。 |

## 接着阅读

- [Agents 介绍](./agents-intro.md)
- [ReAct Agent 理论基础](./react-agent-theory.md)
- [Tools 工具](./tools.md)
- [Hooks 与 Interceptors](./hooks-interceptors.md)
