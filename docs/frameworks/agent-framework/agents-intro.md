---
title: Agents 介绍
sidebar_label: Agents 介绍
description: 了解 ARGI 中的 ReactAgent、ReAct 循环、工具调用、Hook 与 Interceptor。
keywords: [Agents, ReactAgent, ReAct, ToolCallback, Hook, Interceptor, Agent Framework]
---

# Agents 介绍

Agent 将语言模型、工具和运行时控制逻辑组合在一起，用于处理需要多步推理、外部工具调用和状态管理的任务。

ARGI Agent Framework 的核心实现是 `ReactAgent`。它构建在 Graph Core 之上：底层由 `StateGraph` 表示执行拓扑，模型节点负责推理和生成工具调用，工具节点执行工具并把观察结果写回状态，然后由图边决定继续循环还是结束。

## 结构化任务规划

需要显式的多步骤计划时，可以选择 [结构化任务规划](/docs/frameworks/agent-framework/planner)。`ArgiPlanner` 支持不调用模型的单步规划，以及基于模型的依赖 DAG 拆解；它只生成和校验计划，不执行工具，也不替换 Todo 或现有 flow agents。

## ReAct 循环

ReAct 表示 Reasoning + Acting。`ReactAgent` 的典型执行过程包括：

1. 接收用户输入，并写入 Agent 状态。
2. 调用 `ChatModel` 进行推理，模型可以直接回答，也可以生成工具调用。
3. 如果存在工具调用，Agent 执行匹配的 `ToolCallback`。
4. 工具结果作为观察结果回到消息上下文。
5. Agent 继续调用模型，直到模型返回最终答案，或被 Hook、Interceptor、检查点恢复流程等运行时策略改变执行路径。

## 最小示例

`ReactAgent` 不绑定特定模型厂商。应用只需要提供 Spring AI 的 `ChatModel`，并按需配置工具。

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
    .name("date_agent")
    .model(chatModel)
    .instruction("Use tools when the answer depends on runtime information.")
    .methodTools(new DateTools())
    .build();

AssistantMessage response = agent.call("今天的日期是什么？");
System.out.println(response.getText());
```

## 核心配置

main 分支中的 `ReactAgent.Builder` 暴露了下列能力。表格只列框架已经提供的配置入口；具体模型、工具和持久化组件仍由应用选择。

| 能力 | Builder 入口 | 说明 |
| --- | --- | --- |
| 模型 | `model(ChatModel)`、`chatOptions(ChatOptions)` | 使用 Spring AI 的 `ChatModel`，不绑定特定模型厂商。`chatClient(ChatClient)` 仍存在，但当前代码中已标记为 deprecated。 |
| 工具 | `tools(...)`、`methodTools(...)`、`toolCallbackProviders(...)`、`toolNames(...)`、`resolver(...)` | 支持直接工具、`@Tool` 方法、Spring AI `ToolCallbackProvider`、按名称动态解析工具。 |
| 工具运行时 | `toolContext(...)`、`toolExecutionExceptionProcessor(...)` | 向工具传入上下文，或接入 Spring AI 的工具异常处理器。 |
| 并行与异步工具 | `parallelToolExecution(...)`、`maxParallelTools(...)`、`toolExecutionTimeout(...)`、`wrapSyncToolsAsAsync(...)` | 多个工具调用可并行执行；默认最大并行数为 5，单个工具默认超时为 5 分钟。 |
| 指令 | `description(...)`、`instruction(...)`、`systemPrompt(...)`、`templateRenderer(...)` | 描述 Agent、设置任务指令、系统提示和模板渲染器。 |
| 状态与恢复 | `saver(...)`、`compileConfig(...)`、`releaseThread(...)` | 接入 Graph Core checkpoint，并控制编译配置与线程释放行为。 |
| 结构化 I/O | `inputSchema(...)`、`inputType(...)`、`outputSchema(...)`、`outputType(...)` | 为 Agent-as-tool 或子图调用定义结构化输入输出。 |
| 子图输出 | `includeContents(...)`、`returnReasoningContents(...)`、`outputKey(...)`、`outputKeyStrategy(...)` | 控制子 Agent 是否接收父上下文、是否返回中间推理、输出写入哪个状态键以及如何合并。 |
| Hook 与 Interceptor | `hooks(...)`、`interceptors(...)`、`streamingInterceptors(...)` | 注入模型调用、工具调用、流式输出、上下文编辑、重试、回退等运行时逻辑。 |
| 观测与日志 | `observationRegistry(...)`、`customObservationConvention(...)`、`advisorObservationConvention(...)`、`enableLogging(...)` | 接入 Micrometer Observation 和框架日志。 |
| 序列化与执行器 | `stateSerializer(...)`、`executor(...)` | 自定义状态序列化器，并为并行节点提供执行器。 |
| 错误传播 | `throwOnModelError(...)` | 控制模型异常是否作为原始异常抛出。 |

### 模型

`model(ChatModel)` 设置底层模型。`ChatModel` 来自 Spring AI，由应用选择 OpenAI、DeepSeek 或其他模型适配实现。

### 工具

Agent Framework 支持两类常用工具配置：

- `methodTools(...)`：传入带有 Spring AI `@Tool` 注解的对象，框架通过 `ToolCallbacks.from(...)` 转换为工具。
- `tools(...)`：直接传入已经构建好的 `ToolCallback`。

### 指令与系统提示

`instruction(...)` 用于描述 Agent 的任务角色和行为约束。`systemPrompt(...)` 用于设置模型调用时的系统提示。两者都存在于 main 分支的 `ReactAgent` builder 中。

```java
ReactAgent agent = ReactAgent.builder()
    .name("reviewer")
    .model(chatModel)
    .instruction("Review the user input and return concise improvement suggestions.")
    .systemPrompt("You are a careful technical reviewer.")
    .build();
```

### 状态与检查点

`ReactAgent` 基于 Graph Core 执行。调用 `saver(...)` 可以为 Agent 配置检查点存储，用于跨会话保存状态或支持恢复。

```java
import io.github.agentic.ai.graph.RunnableConfig;
import io.github.agentic.ai.graph.agent.ReactAgent;
import io.github.agentic.ai.graph.checkpoint.savers.MemorySaver;

ReactAgent agent = ReactAgent.builder()
    .name("stateful_agent")
    .model(chatModel)
    .saver(new MemorySaver())
    .build();

RunnableConfig config = RunnableConfig.builder()
    .threadId("user-123")
    .build();

agent.call("记住：我的项目叫 Atlas。", config);
agent.call("我的项目叫什么？", config);
```

## Hook 与 Interceptor

Hook 用于在 Agent 或模型调用阶段注入运行时逻辑。Interceptor 用于拦截模型调用或工具调用。

main 分支提供了内置的 `ModelCallLimitHook` 与 `ToolErrorInterceptor`：

```java
import io.github.agentic.ai.graph.agent.ReactAgent;
import io.github.agentic.ai.graph.agent.hook.modelcalllimit.ModelCallLimitHook;
import io.github.agentic.ai.graph.agent.interceptor.toolerror.ToolErrorInterceptor;

ReactAgent agent = ReactAgent.builder()
    .name("guarded_agent")
    .model(chatModel)
    .hooks(ModelCallLimitHook.builder().runLimit(5).build())
    .interceptors(ToolErrorInterceptor.builder().build())
    .build();
```

## 模型错误处理

默认情况下，同步模型调用中捕获到的异常会被转换为内容带有 `Exception:` 前缀的 `AssistantMessage`。如果应用需要保留原始异常类型和 cause，可以启用 `throwOnModelError(true)`。

```java
ReactAgent agent = ReactAgent.builder()
    .name("strict_agent")
    .model(chatModel)
    .throwOnModelError(true)
    .build();
```

该选项不改变工具异常处理，也不会自动增加重试逻辑。
