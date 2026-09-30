---
title: 图 Graph
sidebar_label: 图 Graph
description: 了解 Graph 核心架构设计，包括 StateGraph、CompiledGraph 与图工作流生命周期。
keywords: [Graph, StateGraph, CompiledGraph, 编译图, 工作流, 核心概念]
---

# 图（Graph）

Graph 将智能体工作流建模为有向图。通过组合状态、节点与边，您可以构建出高度可控、可恢复的循环或分支工作流系统。

## 核心三大要素

构建智能体图工作流由三个关键组件构成：

1. **状态（State）**：由 `OverAllState` 表示的共享数据结构，承载应用在执行过程中的当前快照。
2. **节点（Nodes）**：执行业务逻辑的最小函数单元（实现 `AsyncNodeAction` 或 `AsyncNodeActionWithConfig`）。节点读取当前状态，执行计算或外部调用（如大模型调用、API 请求），并返回更新后的状态键值对。
3. **边（Edges）**：控制流程走向的路由规则（实现 `AsyncEdgeAction` 或 `AsyncEdgeActionWithConfig`）。边根据当前状态动态或固定地决定下一个被调度的节点。

> **简而言之**：节点完成具体工作，边决定下一步去往何处，状态则负责跨节点的数据共享与持久化。

---

## StateGraph

`StateGraph` 是图的声明式拓扑定义载体。开发者在 `StateGraph` 中注册状态键、更新合并策略（KeyStrategy）、添加节点和边，完成对智能体工作流结构的建模。

```java
import io.github.agentic.ai.graph.StateGraph;
import io.github.agentic.ai.graph.state.strategy.ReplaceStrategy;

// 初始化 StateGraph 并定义状态键的更新策略
StateGraph stateGraph = new StateGraph()
    .addKey("messages", new AppendStrategy())
    .addKey("status", new ReplaceStrategy());
```

---

## 编译图（CompiledGraph）

在图正式投入运行之前，必须调用 `.compile()` 进行图的编译。

### 为什么需要编译？

编译步骤提供了对图拓扑结构的静态健全性校验：
- 检查是否存在未连接的孤立节点。
- 检查起点（`START`）与终点（`END`）的可达性。
- 注入运行时参数，如持久化检查点管理器（Checkpointer）、人工介入中断点（Interrupts）等。

```java
import io.github.agentic.ai.graph.CompiledGraph;

// 编译图生成可执行的 CompiledGraph 实例
CompiledGraph graph = stateGraph.compile();

// 启动执行并获取最终状态
Map<String, Object> inputs = Map.of("input", "Hello Agent");
Map<String, Object> result = graph.invoke(inputs);
```

在使用图之前，**必须**完成编译。编译后的 `CompiledGraph` 是线程安全且可重复调用的执行实例。
