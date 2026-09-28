---
title: 内置工具
sidebar_label: 内置工具
description: 了解 Agent Framework 中的内置工具、文件系统工具、异步工具、工具上下文和任务工具。
keywords: [ReactAgent, Built-in Tools, ShellTool, FileSystemTools, TaskTools, AsyncToolCallback, ToolContext]
---

# 内置工具

Agent Framework 可以直接使用 Spring AI 的 `ToolCallback`、`@Tool` 方法和 `ToolCallbackProvider`。此外，refactor 分支中还提供了一批面向 Agent 运行时的内置工具和工具扩展点。

## 工具注册方式

| 入口 | 说明 |
| --- | --- |
| `tools(ToolCallback...)` | 直接传入工具回调。 |
| `methodTools(Object...)` | 从带 Spring AI `@Tool` 注解的方法生成工具。 |
| `toolCallbackProviders(...)` | 从 Spring AI `ToolCallbackProvider` 获取工具。 |
| `toolNames(...)` + `resolver(...)` | 按工具名通过 `ToolCallbackResolver` 动态解析。 |
| Hook / Interceptor 提供工具 | `DefaultBuilder` 会收集 Hook 与 ModelInterceptor 暴露的工具，并按名称去重。 |

## Shell 与搜索工具

| 类 | 说明 |
| --- | --- |
| `ShellTool` | 基于 `ShellSessionManager` 执行 shell 命令，支持工作目录、启动/关闭命令、超时、输出行数、环境变量等配置。 |
| `ShellTool2` | 另一组 shell 工具构建入口。 |
| `ShellSessionManager` | 管理按 `threadId` 隔离的 shell session，支持输出截断和脱敏规则。 |
| `GlobSearchTool` | 在指定根目录下按 glob 匹配文件，支持最大结果数。 |
| `GrepSearchTool` | 在指定根目录下搜索文本，可配置是否使用 ripgrep 和最大文件大小。 |
| `WebFetchTool` | 发起 Web fetch，源码中包含 DNS 固定、地址解析和 HTTP 传输相关实现。 |
| `WriteTodosTool` | 写入待办列表，支持事件处理器。 |

```java
import io.github.agentic.spring.ai.graph.agent.ReactAgent;
import io.github.agentic.spring.ai.graph.agent.tools.GlobSearchTool;
import io.github.agentic.spring.ai.graph.agent.tools.GrepSearchTool;
import io.github.agentic.spring.ai.graph.agent.tools.ShellTool;

ToolCallback shell = ShellTool.builder("/workspace")
    .withCommandTimeout(30_000)
    .withMaxOutputLines(200)
    .build();

ToolCallback glob = GlobSearchTool.builder("/workspace")
    .maxResults(100)
    .build();

ToolCallback grep = GrepSearchTool.builder("/workspace")
    .withUseRipgrep(true)
    .withMaxFileSizeMb(5)
    .build();

ReactAgent agent = ReactAgent.builder()
    .name("developer_agent")
    .model(chatModel)
    .tools(shell, glob, grep)
    .build();
```

## 文件系统工具

`io.github.agentic.spring.ai.graph.agent.extension.tools.filesystem` 包提供文件读写、编辑、列表、glob 和 grep 工具。

| 类 | 说明 |
| --- | --- |
| `FileSystemTools` | 文件系统工具集合构建器。 |
| `ReadFileTool` | 读取文件内容，支持 offset 和 limit。 |
| `WriteFileTool` | 写入文件。 |
| `EditFileTool` | 按 `oldString` / `newString` 编辑文件，支持 replace all。 |
| `ListFilesTool` | 列出目录文件。 |
| `GlobTool` | 按 glob 匹配文件。 |
| `GrepTool` | 按 pattern 搜索文件内容。 |
| `FilesystemBackend`、`LocalFilesystemBackend` | 文件系统后端抽象和本地实现。 |

```java
import io.github.agentic.spring.ai.graph.agent.extension.tools.filesystem.FileSystemTools;

FileSystemTools fileSystemTools = FileSystemTools.builder()
    .rootDir("/workspace")
    .maxFileSizeMb(5)
    .build();

ReactAgent agent = ReactAgent.builder()
    .name("file_agent")
    .model(chatModel)
    .methodTools(fileSystemTools)
    .build();
```

## 工具上下文

状态感知工具可以通过 `ToolContext` 获取当前 Graph 状态、运行配置和可写状态 Map。

| 类型 | 说明 |
| --- | --- |
| `StateAwareToolCallback` | 标记工具需要注入状态上下文。 |
| `ToolContextConstants` | 定义 Agent 状态、运行配置、状态更新 Map 等上下文键。 |
| `ToolContextHelper` | 提供类型安全的读取方法，如 `getConfig(...)`、`getState(...)`、`getStateForUpdate(...)`、`getMetadata(...)`。 |
| `ToolStateCollector` | 汇总多个工具的状态更新，用于并行工具执行后合并状态。 |

```java
import io.github.agentic.spring.ai.graph.agent.tools.ToolContextHelper;
import org.springframework.ai.chat.model.ToolContext;

Optional<RunnableConfig> config = ToolContextHelper.getConfig(toolContext);
Optional<OverAllState> state = ToolContextHelper.getState(toolContext);
Optional<Map<String, Object>> stateForUpdate = ToolContextHelper.getStateForUpdate(toolContext);
```

## 异步与可取消工具

| 类型 | 说明 |
| --- | --- |
| `AsyncToolCallback` | 支持异步执行的工具接口，返回 `CompletableFuture<String>`。 |
| `CancellableAsyncToolCallback` | 支持协作式取消的异步工具接口。 |
| `AsyncToolCallbackAdapter` | 将同步 `ToolCallback` 包装为异步工具。 |
| `CancellationToken`、`DefaultCancellationToken` | 取消信号接口与默认实现。 |
| `ToolCancelledException` | 工具取消异常。 |

`ReactAgent.Builder` 中的 `parallelToolExecution(...)`、`maxParallelTools(...)`、`toolExecutionTimeout(...)` 和 `wrapSyncToolsAsAsync(...)` 会影响工具节点的执行方式。

```java
ReactAgent agent = ReactAgent.builder()
    .name("parallel_tool_agent")
    .model(chatModel)
    .tools(slowApiTool, databaseTool)
    .parallelToolExecution(true)
    .maxParallelTools(3)
    .toolExecutionTimeout(Duration.ofSeconds(30))
    .wrapSyncToolsAsAsync(true)
    .build();
```

## 多模态工具结果

| 类型 | 说明 |
| --- | --- |
| `ToolMultimodalResult` | 表示工具返回的多模态结果。 |
| `OutputFormat` | 描述多模态输出格式。 |
| `MultimodalToolCallResultConverter` | 将多模态工具结果转换为模型可接收结果。 |
| `MultimodalBase64ToolCallResultConverter` | 面向 base64 数据的多模态结果转换器。 |

## 任务工具

任务工具用于把子任务提交到后台执行，并在之后读取结果。

| 类型 | 说明 |
| --- | --- |
| `TaskTool` | 创建后台任务。 |
| `TaskOutputTool` | 读取后台任务输出。 |
| `TaskToolsBuilder` | 构建任务相关工具。 |
| `TaskRepository`、`DefaultTaskRepository` | 任务存储接口和默认实现。 |
| `BackgroundTask` | 后台任务对象。 |
| `AgentSpec`、`AgentSpecLoader` | 从 markdown 或资源加载 Agent 规格。 |
| `AgentSpecReactAgentFactory` | 基于 `AgentSpec` 创建 `ReactAgent`。 |

```java
import io.github.agentic.spring.ai.graph.agent.tools.task.TaskToolsBuilder;

ReactAgent worker = ReactAgent.builder()
    .name("worker")
    .model(chatModel)
    .instruction("Complete the delegated task and return the result.")
    .build();

List<ToolCallback> taskTools = TaskToolsBuilder.builder()
    .subAgent("general", worker)
    .build();

ReactAgent agent = ReactAgent.builder()
    .name("task_agent")
    .model(chatModel)
    .tools(taskTools)
    .build();
```
