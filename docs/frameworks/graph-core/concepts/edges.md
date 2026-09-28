---
title: 边 Edges
sidebar_label: 边 Edges
description: 了解 Graph 中的边路由机制，包括普通边、条件边（Conditional Edges）与多分支并行路由。
keywords: [Edges, 边, 条件边, ConditionalEdges, 路由控制, 工作流分支]
---

# 边（Edges）

在 Graph 中，**边（Edges）** 定义了执行逻辑在不同节点之间的流转方向和停止条件。边是实现分支选择、循环迭代和条件跳出的核心路由机制。

---

## 边的主要类型

根据路由决策的确定性，边主要分为两类：

1. **普通边（Normal Edges）**：确定性的固定转换，前置节点完成后无条件流向后置节点。
2. **条件边（Conditional Edges）**：根据当前状态动态计算下一步去往哪个节点。

---

## 普通边（固定路由）

如果节点 A 总是无条件流向节点 B，可以使用 `addEdge` 方法直接建立单向连接：

```java
import static io.github.agentic.spring.ai.graph.StateGraph.START;
import static io.github.agentic.spring.ai.graph.StateGraph.END;

// 从 START 到流程第一步，再固定流转至总结节点并结束
stateGraph.addEdge(START, "classifier_node")
          .addEdge("classifier_node", "summarize_node")
          .addEdge("summarize_node", END);
```

---

## 条件边（Conditional Edges）

当流程需要根据大模型输出、业务规则或异常状态动态分支时，使用 `addConditionalEdges` 方法：

```java
import static io.github.agentic.spring.ai.graph.action.AsyncEdgeAction.edge_async;
import java.util.Map;

// 动态路由函数：根据状态中的 intent 决定下一个节点
stateGraph.addConditionalEdges(
    "classifier_node",
    edge_async(state -> {
        String intent = (String) state.value("intent").orElse("unknown");
        if ("refund".equals(intent)) {
            return "handle_refund";
        } else if ("query".equals(intent)) {
            return "search_knowledge";
        }
        return "human_agent";
    }),
    Map.of(
        "handle_refund", "refund_node",
        "search_knowledge", "search_node",
        "human_agent", "human_review_node"
    )
);
```

- **路由函数**：返回决策标记字符串（如 `handle_refund`）。
- **映射字典（Mapping）**：将决策标记映射为拓扑中真实存在的节点名称。

条件边可使用以下接口：

| 接口 | 是否接收 `RunnableConfig` | 返回值 | 说明 |
| --- | --- | --- | --- |
| `EdgeAction` | 否 | `String` | 同步计算下一跳标记。 |
| `EdgeActionWithConfig` | 是 | `String` | 同步计算，并读取运行配置。 |
| `AsyncEdgeAction` | 否 | `CompletableFuture<String>` | 异步计算下一跳标记。 |
| `AsyncEdgeActionWithConfig` | 是 | `CompletableFuture<String>` | 异步计算，并读取运行配置。 |
| `CommandAction` / `AsyncCommandAction` | 是 | `Command` | 同时返回下一跳和状态更新。 |
| `MultiCommandAction` / `AsyncMultiCommandAction` | 是 | `MultiCommand` | 返回多个下一跳，用于并行路由。 |

---

## 多出边与并行执行

在 Graph 中，一个节点可以拥有多个出边（Fan-out）。当一个节点完成时，所有由它引出的目标节点将被同时触发并行执行：

```java
// 从 start_node 同时触发 node_a 和 node_b
stateGraph.addEdge("start_node", "node_a")
          .addEdge("start_node", "node_b");

// 汇聚到 end_node
stateGraph.addEdge("node_a", "end_node")
          .addEdge("node_b", "end_node");
```

关于并行节点的状态合并与冲突解决，可参考后续示例 Demo 中的并行节点部分。

### 多命令并行路由

`MultiCommand` 可以在一次条件判断中返回多个目标节点。框架会将这些目标节点作为并行分支执行，并按状态键策略合并结果。

```java
import io.github.agentic.spring.ai.graph.action.MultiCommand;
import static io.github.agentic.spring.ai.graph.action.AsyncMultiCommandAction.node_async;

stateGraph.addParallelConditionalEdges(
    "planner",
    node_async((state, config) -> new MultiCommand(
        List.of("search_docs", "search_tickets"),
        Map.of("fanout", true)
    )),
    Map.of(
        "search_docs", "doc_search_node",
        "search_tickets", "ticket_search_node"
    )
);
```
