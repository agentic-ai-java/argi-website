---
title: 观测与生命周期
sidebar_label: 观测与生命周期
description: 了解 Graph Core 的 GraphLifecycleListener、GraphObservationLifecycleListener 与 Graph/Node/Edge observation 扩展点。
keywords: [Graph, Observation, GraphLifecycleListener, GraphObservationLifecycleListener, Micrometer]
---

# 观测与生命周期

Graph Core 在执行过程中提供两类观测入口：轻量生命周期监听器和基于 Micrometer Observation 的观测组件。生命周期监听器适合做日志、审计、调试和自定义事件；Observation 组件适合接入指标和链路追踪。

## GraphLifecycleListener

`GraphLifecycleListener` 可以通过 `CompileConfig.withLifecycleListener(...)` 注册。当前接口包含以下回调：

| 回调 | 触发时机 |
| --- | --- |
| `onStart(nodeId, state, config)` | 节点开始执行时。 |
| `before(nodeId, state, config, curTime)` | 节点执行前。 |
| `after(nodeId, state, config, curTime)` | 节点执行后。 |
| `onError(nodeId, state, ex, config)` | 节点执行出现异常时。 |
| `onComplete(nodeId, state, config)` | 节点成功完成时。 |

```java
import io.github.agentic.ai.graph.CompileConfig;
import io.github.agentic.ai.graph.GraphLifecycleListener;

GraphLifecycleListener listener = new GraphLifecycleListener() {
    @Override
    public void before(String nodeId, Map<String, Object> state, RunnableConfig config, Long curTime) {
        System.out.println("Before node: " + nodeId);
    }

    @Override
    public void onError(String nodeId, Map<String, Object> state, Throwable ex, RunnableConfig config) {
        System.err.println("Node failed: " + nodeId + ", error=" + ex.getMessage());
    }
};

CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .withLifecycleListener(listener)
        .build()
);
```

## Observation 集成

`GraphObservationLifecycleListener` 实现了 `GraphLifecycleListener`，用于把 Graph 执行和节点执行映射到 Micrometer Observation。构造函数支持：

| 构造方式 | 说明 |
| --- | --- |
| `new GraphObservationLifecycleListener(observationRegistry)` | 不采集状态内容，只记录执行链路。 |
| `new GraphObservationLifecycleListener(observationRegistry, captureContent, maxContentLength)` | 可选择采集输入/输出内容，并限制内容长度。 |

```java
import io.github.agentic.ai.graph.CompileConfig;
import io.github.agentic.ai.graph.observation.GraphObservationLifecycleListener;
import io.micrometer.observation.ObservationRegistry;

ObservationRegistry registry = ObservationRegistry.create();

CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .observationRegistry(registry)
        .withLifecycleListener(new GraphObservationLifecycleListener(registry))
        .build()
);
```

`GraphObservationLifecycleListener` 使用 `GraphLifecycleListener.EXECUTION_ID_KEY` 在状态中关联一次 Graph 执行的 observation context。框架内部会围绕 Graph 和节点创建 observation，并在成功或异常时停止。

## 可扩展的 Observation 类型

main 分支中可以确认以下 observation 扩展类型：

| 范围 | 类型 |
| --- | --- |
| Graph | `GraphObservationContext`、`GraphObservationConvention`、`DefaultGraphObservationConvention`、`GraphObservationHandler`、`GraphObservationDocumentation` |
| Node | `GraphNodeObservationContext`、`GraphNodeObservationConvention`、`DefaultGraphNodeObservationConvention`、`GraphNodeObservationHandler`、`GraphNodeObservationDocumentation` |
| Edge | `GraphEdgeObservationContext`、`GraphEdgeObservationConvention`、`DefaultGraphEdgeObservationConvention`、`GraphEdgeObservationHandler`、`GraphEdgeObservationDocumentation` |
| 指标与清理 | `GraphMetricsGenerator`、`ObservationContentSanitizer`、`ArgiObservationMetricNames`、`ArgiObservationMetricAttributes` |

当前 metric 名称使用 `argi.*`。应用侧应使用框架公开的配置与观测约定，避免自行拼接指标名。
