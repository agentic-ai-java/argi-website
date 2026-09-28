---
title: 运行配置
sidebar_label: 运行配置
description: 了解 ReactAgent.Builder 的运行配置、调用方式、状态恢复、流式取消回滚、观测和错误处理。
keywords: [ReactAgent, Builder, RunnableConfig, CompileConfig, ReAct, 运行配置, Agent Framework]
---

# 运行配置

`ReactAgent` 基于 Graph Core 运行。应用通常通过 `ReactAgent.builder()` 配置模型、工具、Hook、Interceptor、检查点和运行策略，再通过 `call(...)`、`invoke(...)` 或 `stream(...)` 执行。

## Builder 能力清单

refactor 分支中 `ReactAgent.Builder` 可确认的配置入口如下：

| 分类 | 配置入口 | 说明 |
| --- | --- | --- |
| 基本信息 | `name(...)`、`description(...)` | 设置 Agent 名称和描述。`name` 不能为空。 |
| 模型 | `model(ChatModel)`、`chatOptions(ChatOptions)`、`chatClient(ChatClient)` | 当前推荐使用 `model(ChatModel)`；`chatClient(ChatClient)` 在源码中仍存在且已标记 deprecated。 |
| 模型错误 | `throwOnModelError(boolean)` | 控制同步模型调用异常是否以原始异常抛出。 |
| 工具 | `tools(...)`、`methodTools(...)`、`toolCallbackProviders(...)`、`toolNames(...)`、`resolver(...)` | 支持直接工具、`@Tool` 方法、Provider、按名称解析和动态解析。 |
| 工具异常与上下文 | `toolExecutionExceptionProcessor(...)`、`toolContext(...)` | 配置工具异常处理器和工具上下文。 |
| 并行工具 | `parallelToolExecution(...)`、`maxParallelTools(...)`、`toolExecutionTimeout(...)`、`wrapSyncToolsAsAsync(...)` | 多个工具调用可以并行执行；默认最大并行数是 5，单个工具默认超时是 5 分钟。 |
| 检查点与编译 | `saver(...)`、`compileConfig(...)`、`releaseThread(...)` | 配置 Graph checkpoint、编译配置和 thread 释放。 |
| 提示 | `instruction(...)`、`systemPrompt(...)`、`templateRenderer(...)` | 设置 Agent 指令、系统提示和模板渲染器。 |
| 结构化输入输出 | `inputSchema(...)`、`inputType(...)`、`outputSchema(...)`、`outputType(...)` | 用于 Agent-as-tool、结构化调用和输出格式控制。 |
| 子图上下文 | `includeContents(...)`、`returnReasoningContents(...)`、`outputKey(...)`、`outputKeyStrategy(...)` | 控制子 Agent/子图接收和返回的上下文，以及输出合并策略。 |
| 消息修正 | `assistantMessageSanitizerEnabled(...)` | 默认启用 `AssistantMessageSanitizerInterceptor`，修正工具调用消息中 `content` 为 null 的情况。 |
| Hook 与 Interceptor | `hooks(...)`、`interceptors(...)`、`streamingInterceptors(...)` | 注入 Agent、模型、工具和流式输出阶段的扩展逻辑。 |
| 观测与日志 | `observationRegistry(...)`、`customObservationConvention(...)`、`advisorObservationConvention(...)`、`enableLogging(...)` | 接入 Spring AI ChatClient Observation 和框架日志。 |
| 序列化与执行器 | `stateSerializer(...)`、`executor(...)` | 自定义 Graph 状态序列化器和并行节点执行器。 |

## 调用方式

`ReactAgent` 支持多种输入形式：

| 方法 | 输入 | 说明 |
| --- | --- | --- |
| `call(String)` | 字符串 | 快速传入单条用户消息。 |
| `call(UserMessage)` | Spring AI `UserMessage` | 传入已有消息对象。 |
| `call(List<Message>)` | 消息列表 | 传入完整消息上下文。 |
| `call(Map<String, Object>)` | 状态 Map | 除 `messages` 和 `input` 外，可携带任意状态键。 |
| `call(..., RunnableConfig)` | 输入 + 运行配置 | 为本次调用指定 thread、checkpoint、metadata 等。 |

```java
import io.github.agentic.spring.ai.graph.RunnableConfig;
import io.github.agentic.spring.ai.graph.agent.ReactAgent;

RunnableConfig config = RunnableConfig.builder()
    .threadId("case-1001")
    .build();

AssistantMessage response = agent.call(
    Map.of(
        "input", "Summarize this support case.",
        "priority", "high"
    ),
    config
);
```

## 默认注入的运行逻辑

`ReactAgent` 初始化 Graph 时会注入部分默认逻辑：

| 默认行为 | 说明 |
| --- | --- |
| `InstructionAgentHook` | 总是注入，用于处理 `instruction(...)`。 |
| `ReturnDirectModelHook` | 当用户没有显式提供同名 Hook 时自动注入，用于处理 tool return direct 语义。 |
| `AssistantMessageSanitizerInterceptor` | 默认注册到模型 Interceptor 列表，可通过 `assistantMessageSanitizerEnabled(false)` 关闭。 |

Hook 和 Interceptor 按名称去重合并。`ReactAgent` 配置中的 Interceptor 优先于 Hook 提供的同名 Interceptor。

## 中断与恢复

`ReactAgent` 提供 `interrupt(...)` 和 `updateAgentState(...)`，用于向指定 `threadId` 的 Agent 状态写入反馈。调用时必须在 `RunnableConfig` 中提供 `threadId`。

```java
RunnableConfig config = RunnableConfig.builder()
    .threadId("approval-42")
    .build();

agent.interrupt("Approved by operator.", config);
```

Human-in-the-loop 场景通常还需要 checkpoint saver，否则中断后无法跨请求恢复执行状态。

## 流式取消回滚

`ReactAgent.stream(...)` 会在订阅时读取本轮执行前的 checkpoint。若流式执行被取消，框架会尽力把 thread 回滚到本轮开始前的 checkpoint，避免留下半截工具调用或孤立工具响应，导致下一轮消息序列无效。

这个行为依赖当前编译图中的 checkpoint saver；如果没有 saver，取消回滚不会发生。

## 模型异常处理

默认情况下，同步模型调用中的异常会被转换为一条带 `Exception:` 前缀的 `AssistantMessage`。启用 `throwOnModelError(true)` 后，模型异常会向外抛出，并保留原始异常类型和 cause。

```java
ReactAgent strictAgent = ReactAgent.builder()
    .name("strict_agent")
    .model(chatModel)
    .throwOnModelError(true)
    .build();
```

该选项不改变工具异常处理，也不会自动增加模型重试。模型重试应使用 `ModelRetryInterceptor`。

