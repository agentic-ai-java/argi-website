---
title: 节点 Nodes
sidebar_label: 节点 Nodes
description: 了解 Graph 中的节点定义，包括 AsyncNodeAction、上下文注入与内置的 START/END 节点。
keywords: [Nodes, 节点, AsyncNodeAction, START, END, 智能体图, 函数式接口]
---

# 节点（Nodes）

在 Graph 中，**节点（Node）** 是执行计算和状态变更的最小逻辑单元。每个节点接收全局状态作为输入，完成运算、LLM 调用或副作用操作后，返回对全局状态的增量更新（`Map<String, Object>`）。

---

## 节点函数式接口

框架提供同步、异步和带配置的函数式接口定义节点：

| 接口 | 输入 | 输出 | 适用场景 |
| --- | --- | --- | --- |
| `NodeAction` | `OverAllState` | `Map<String, Object>` | 同步业务逻辑。 |
| `NodeActionWithConfig` | `OverAllState`、`RunnableConfig` | `Map<String, Object>` | 需要读取 `threadId`、上下文或运行配置的同步逻辑。 |
| `AsyncNodeAction` | `OverAllState` | `CompletableFuture<Map<String, Object>>` | 非阻塞或异步节点。 |
| `AsyncNodeActionWithConfig` | `OverAllState`、`RunnableConfig` | `CompletableFuture<Map<String, Object>>` | 同时需要异步执行和运行配置的节点。 |
| `AsyncCommandAction` | `OverAllState`、`RunnableConfig` | `CompletableFuture<Command>` | 节点执行后同时更新状态并决定下一个节点。 |
| `AsyncMultiCommandAction` | `OverAllState`、`RunnableConfig` | `CompletableFuture<MultiCommand>` | 节点执行后更新状态并路由到多个并行节点。 |

### 使用 `node_async` 适配同步代码

由于图底层基于响应式与异步流水线运行，您可以使用 `AsyncNodeAction.node_async` 工具方法将标准的同步业务逻辑包装为异步节点：

```java
import static io.github.agentic.ai.graph.action.AsyncNodeAction.node_async;
import java.util.Map;

// 定义一个基础计算节点
var searchNode = node_async(state -> {
    String query = (String) state.value("query").orElse("");
    String searchResult = "搜索结果: " + query;
    return Map.of("documents", searchResult);
});

// 添加到图拓扑中
stateGraph.addNode("search_node", searchNode);
```

### 使用带配置的节点

```java
import static io.github.agentic.ai.graph.action.AsyncNodeActionWithConfig.node_async;

var configAwareNode = node_async((state, config) -> {
    String threadId = config.threadId().orElse("default");
    // 基于会话 ID 执行会话专属逻辑
    return Map.of("thread_acknowledged", threadId);
});

stateGraph.addNode("config_node", configAwareNode);
```

### 使用 Command 节点同时更新状态和路由

当节点的输出既包含状态更新，又包含下一跳选择时，可以使用 `CommandAction` / `AsyncCommandAction`。

```java
import io.github.agentic.ai.graph.action.Command;
import static io.github.agentic.ai.graph.action.AsyncCommandAction.node_async;

stateGraph.addNode("classify_and_route", node_async((state, config) -> {
    String intent = classify(state);
    return new Command(intent, Map.of("intent", intent));
}), Map.of(
    "faq", "answer_faq",
    "ticket", "create_ticket"
));
```

如果一次需要路由到多个节点，可以使用 `MultiCommand` / `AsyncMultiCommandAction`，并配合 `addParallelConditionalEdges` 或相应节点重载构建并行分支。

---

## 特殊内置节点

框架预定义了两个特殊的端点节点，用于标识图执行的起点与终点：

### 1. `START` 节点

`START` 是图的虚拟入口节点。当用户调用 `graph.invoke(inputs)` 时，输入状态首先经由从 `START` 发出的边流向第一个业务节点：

```java
import static io.github.agentic.ai.graph.StateGraph.START;

// 指定图从 START 节点进入分类节点
stateGraph.addEdge(START, "classifier_node");
```

### 2. `END` 节点

`END` 是图的虚拟终止节点。当执行流转到达 `END` 节点时，当前图的执行宣告完成，图引擎输出最终状态：

```java
import static io.github.agentic.ai.graph.StateGraph.END;

// 当回复生成完成后走向结束
stateGraph.addEdge("generate_reply_node", END);
```
