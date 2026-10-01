---
title: 运行配置
sidebar_label: 运行配置
description: 了解 Graph Core 中 CompileConfig 与 RunnableConfig 的配置项，包括检查点、中断、观测、Store、运行态元数据和并行策略。
keywords: [Graph, CompileConfig, RunnableConfig, 中断, 检查点, Store, Observation, 并行执行]
---

# 运行配置

Graph Core 把配置分为两层：`CompileConfig` 作用于图编译后的执行实例，`RunnableConfig` 作用于单次运行。前者适合放检查点、生命周期监听器和默认 Store，后者适合放 thread、checkpoint、stream mode、运行态 metadata 和 context。

## CompileConfig

`CompileConfig` 在 `StateGraph.compile(...)` 时传入。main 分支当前可确认的配置项如下：

| 配置项 | Builder 入口 | 说明 |
| --- | --- | --- |
| 检查点 | `saverConfig(SaverConfig)` | 注册一个或多个 checkpoint saver。默认配置会注册 `MemorySaver`。 |
| 递归限制 | `recursionLimit(int)` | 限制图执行递归深度，值必须大于 0。 |
| 线程释放 | `releaseThread(boolean)` | 配合 checkpoint saver 的 `release(RunnableConfig)` 使用，用于释放指定 thread 的状态。 |
| 中断前置点 | `interruptBefore(...)`、`interruptsBefore(...)` | 在指定节点执行前中断。 |
| 中断后置点 | `interruptAfter(...)`、`interruptsAfter(...)` | 在指定节点执行后中断。 |
| 边选择前中断 | `interruptBeforeEdge(boolean)` | 节点完成后、条件边选择前中断，便于检查分支决策前的状态。 |
| 生命周期监听器 | `withLifecycleListener(GraphLifecycleListener)` | 监听节点开始、前置、后置、完成和异常事件。 |
| 观测注册表 | `observationRegistry(ObservationRegistry)` | 为 Graph 观测链路提供 Micrometer `ObservationRegistry`。默认是 `ObservationRegistry.NOOP`。 |
| 长期 Store | `store(Store)` | 配置长期记忆 Store。Store 与 checkpoint saver 是两类不同组件。 |

```java
import io.github.agentic.ai.graph.CompileConfig;
import io.github.agentic.ai.graph.GraphLifecycleListener;
import io.github.agentic.ai.graph.checkpoint.config.SaverConfig;
import io.github.agentic.ai.graph.checkpoint.savers.MemorySaver;
import io.github.agentic.ai.graph.store.stores.MemoryStore;

SaverConfig saverConfig = SaverConfig.builder()
    .register(new MemorySaver())
    .build();

CompileConfig compileConfig = CompileConfig.builder()
    .saverConfig(saverConfig)
    .recursionLimit(100)
    .interruptBefore("review")
    .interruptBeforeEdge(true)
    .withLifecycleListener(new GraphLifecycleListener() {})
    .store(new MemoryStore())
    .build();

CompiledGraph graph = stateGraph.compile(compileConfig);
```

## RunnableConfig

`RunnableConfig` 在 `invoke(...)`、`stream(...)` 或 Agent 调用时传入。它描述本次运行的会话、恢复位置、流式模式和运行时环境。

| 配置项 | Builder 入口 | 说明 |
| --- | --- | --- |
| 会话 ID | `threadId(String)` | checkpoint saver 用它区分不同会话。使用持久化或恢复时通常必须提供。 |
| checkpoint ID | `checkPointId(String)` | 指定历史 checkpoint，用于读取历史状态或重放。 |
| 下一节点 | `nextNode(String)` | 指定恢复或继续执行时的下一节点。 |
| 流式模式 | `streamMode(CompiledGraph.StreamMode)` | 控制流式输出模式，默认是 `VALUES`。 |
| 人工反馈 | `addHumanFeedback(InterruptionMetadata)`、`resume()`、`withResume()` | 为中断恢复写入人工反馈元数据。 |
| 状态补丁 | `addStateUpdate(Map<String, Object>)` | 通过 metadata 携带状态更新。 |
| 推理内容合并 | `mergeReasoningContent(boolean)`、`withMergeReasoningContent(boolean)` | 控制流式 AssistantMessage metadata 中 reasoning content 的合并方式。 |
| checkpoint 保留数 | `checkpointsNumRetained(int)` | 控制 saver 为本次运行保留的最新 checkpoint 数；小于等于 0 表示不裁剪。 |
| 并行节点执行器 | `addParallelNodeExecutor(...)`、`defaultParallelExecutor(...)` | 为指定或全部并行节点设置 `Executor`。 |
| 并行聚合策略 | `addParallelNodeAggregationStrategy(...)`、`defaultParallelAggregationStrategy(...)` | 使用 `NodeAggregationStrategy.ALL_OF` 或 `ANY_OF` 控制并行分支汇合策略。 |
| 长期 Store | `store(Store)` | 为本次运行提供 Store，会覆盖或补充编译期配置。 |

```java
import io.github.agentic.ai.graph.NodeAggregationStrategy;
import io.github.agentic.ai.graph.RunnableConfig;
import io.github.agentic.ai.graph.store.stores.MemoryStore;

RunnableConfig config = RunnableConfig.builder()
    .threadId("user-123")
    .checkpointsNumRetained(20)
    .mergeReasoningContent(true)
    .defaultParallelAggregationStrategy(NodeAggregationStrategy.ALL_OF)
    .store(new MemoryStore())
    .build();

graph.invoke(Map.of("input", "hello"), config);
```

## metadata 与 context

`RunnableConfig` 中同时存在 `metadata` 和 `context`，两者用途不同。

| 项目 | 特性 | 使用场景 |
| --- | --- | --- |
| `metadata` | 构建后按运行配置保存，主要表达本次运行的环境和控制信息。 | `threadId` 以外的用户 ID、应用名、人工反馈、checkpoint 保留数、并行策略。 |
| `context` | 运行中可变，不会作为 `OverAllState` 持久化。 | 节点间临时传递对象、动态工具回调、一次运行内的临时缓存。 |

```java
RunnableConfig config = RunnableConfig.builder()
    .threadId("ticket-42")
    .addMetadata(RunnableConfig.USER_ID_METADATA_KEY, "alice")
    .addMetadata(RunnableConfig.APP_NAME_METADATA_KEY, "support-console")
    .build();

config.context().put("requestStartTime", System.currentTimeMillis());
```

## 并行聚合策略

`NodeAggregationStrategy` 目前包含两个枚举值：

| 策略 | 行为 |
| --- | --- |
| `ALL_OF` | 等待所有并行分支完成后继续，这是默认语义。 |
| `ANY_OF` | 任一分支完成后继续，使用最先完成分支的结果。 |

当某个并行节点需要特殊策略时，使用 `addParallelNodeAggregationStrategy(targetNodeId, strategy)`；当所有并行节点使用相同策略时，使用 `defaultParallelAggregationStrategy(strategy)`。

