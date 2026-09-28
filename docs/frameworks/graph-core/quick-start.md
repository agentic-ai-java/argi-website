---
title: Graph Core 快速开始
sidebar_label: 快速开始
description: 使用 Agentic AI Graph Core 创建、编译并执行一个状态图。
keywords: [Graph Core, StateGraph, CompiledGraph, OverAllState, Agentic AI]
---

# Graph Core 快速开始

Agentic AI Graph Core 是状态图工作流运行时。它将工作流建模为节点、边和共享状态：节点执行工作并返回状态更新，边决定下一步执行哪个节点，状态在图执行过程中持续合并和传递。

## 添加依赖

使用 BOM 管理版本后，引入 Graph Core：

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>agentic-ai-graph-core</artifactId>
</dependency>
```

## 创建并执行 StateGraph

下面示例定义一个只有一个业务节点的图。图从 `START` 进入 `greet` 节点，节点读取输入状态并写入 `message`，最后流转到 `END`。

```java
import io.github.agentic.spring.ai.graph.CompiledGraph;
import io.github.agentic.spring.ai.graph.KeyStrategyFactory;
import io.github.agentic.spring.ai.graph.OverAllState;
import io.github.agentic.spring.ai.graph.StateGraph;
import io.github.agentic.spring.ai.graph.state.strategy.ReplaceStrategy;

import java.util.Map;
import java.util.Optional;

import static io.github.agentic.spring.ai.graph.StateGraph.END;
import static io.github.agentic.spring.ai.graph.StateGraph.START;
import static io.github.agentic.spring.ai.graph.action.AsyncNodeAction.node_async;

KeyStrategyFactory strategies = () -> Map.of(
    "message", new ReplaceStrategy()
);

StateGraph graph = new StateGraph(strategies)
    .addNode("greet", node_async(state -> {
        String name = (String) state.value("name").orElse("World");
        return Map.of("message", "Hello " + name);
    }))
    .addEdge(START, "greet")
    .addEdge("greet", END);

CompiledGraph compiledGraph = graph.compile();

Optional<OverAllState> result = compiledGraph.invoke(Map.of("name", "Agentic AI"));
String message = (String) result.orElseThrow().value("message").orElseThrow();
System.out.println(message);
```

## 核心对象

| 对象 | 作用 |
| --- | --- |
| `StateGraph` | 声明图结构，添加节点、普通边、条件边、并行条件边或子图。 |
| `CompiledGraph` | `StateGraph` 编译后的可执行对象，提供 `invoke(...)`、`stream(...)` 等执行入口。 |
| `OverAllState` | 图执行时的共享状态。节点读取状态，并返回 `Map<String, Object>` 作为状态更新。 |
| `KeyStrategyFactory` | 为状态键提供合并策略，例如覆盖、追加或自定义合并。 |
| `RunnableConfig` | 传递运行时配置，例如 `threadId`、checkpoint 和上下文数据。 |

## 何时使用 Graph Core

当应用需要明确控制以下行为时，优先使用 Graph Core：

- 固定步骤、条件分支、循环或并行执行。
- 节点之间共享状态，并需要明确的状态合并策略。
- 使用检查点保存执行进度，并在中断后恢复。
- 将子图作为父图中的节点复用。
- 需要流式观察每个节点输出。

如果只需要标准 ReAct 循环，优先使用 [Agent Framework](../agent-framework/quick-start.md) 中的 `ReactAgent`；它已经基于 Graph Core 封装了常见 Agent 执行流程。
