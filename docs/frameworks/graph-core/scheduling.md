---
title: 定时调度
sidebar_label: 定时调度
description: 使用 Graph Core 的 ScheduledAgentTask、ScheduleConfig 和 ScheduledAgentManager 管理定时图执行。
keywords: [Graph, Scheduling, ScheduleConfig, ScheduledAgentTask, ScheduledAgentManager, 定时任务]
---

# 定时调度

Graph Core 提供了本地定时执行图的基础类。`ScheduleConfig` 描述调度策略，`ScheduledAgentTask` 绑定 `CompiledGraph` 和调度配置，`ScheduledAgentManager` 管理已注册任务。

## 核心类型

| 类型 | 说明 |
| --- | --- |
| `ScheduleConfig` | 定义调度模式、输入、运行配置、重试和生命周期监听器。 |
| `ScheduledAgentTask` | 负责按调度策略执行 `CompiledGraph`。创建时会注册到全局 `ScheduledAgentManager`。 |
| `ScheduledAgentManager` | 管理任务注册、注销、查询、活动任务统计和关闭。 |
| `DefaultScheduledAgentManager` | 默认本地实现。 |
| `ScheduledAgentManagerFactory` | 获取全局 manager 实例。 |
| `ScheduleLifecycleListener` | 监听调度开始、停止、执行开始、执行完成和执行失败。 |

## 调度模式

`ScheduleConfig.ScheduleMode` 当前包含以下模式：

| 模式 | 配置入口 | 说明 |
| --- | --- | --- |
| `CRON` | `cronExpression(String)` | 使用 cron 表达式触发。 |
| `FIXED_DELAY` | `fixedDelay(long)` | 上一次执行完成后延迟指定毫秒再执行。 |
| `FIXED_RATE` | `fixedRate(long)` | 按固定频率执行。 |
| `ONE_TIME` | `initialDelay(long)` | 延迟指定毫秒后执行一次。 |
| `TRIGGER` | `trigger(Trigger)` | 使用 Spring `Trigger` 自定义触发逻辑。 |

`ScheduleConfig` 根据设置的字段推断模式：cron 优先，其次是 fixed delay、fixed rate、initial delay 和 trigger。

## 创建定时任务

```java
import io.github.agentic.ai.graph.RunnableConfig;
import io.github.agentic.ai.graph.scheduling.ScheduleConfig;
import io.github.agentic.ai.graph.scheduling.ScheduledAgentTask;

import java.time.Duration;
import java.util.Map;

ScheduleConfig config = ScheduleConfig.builder()
    .cronExpression("0 */5 * * * *")
    .inputs(Map.of("input", "Run scheduled analysis"))
    .runnableConfig(RunnableConfig.builder()
        .threadId("scheduled-analysis")
        .build())
    .maxRetries(2)
    .retryDelay(Duration.ofSeconds(10))
    .build();

ScheduledAgentTask task = new ScheduledAgentTask(compiledGraph, config).start();
```

## 生命周期监听

`ScheduleLifecycleListener.ScheduleEvent` 当前包含：

| 事件 | 说明 |
| --- | --- |
| `STARTED` | 调度任务已启动。 |
| `STOPPED` | 调度任务已停止。 |
| `EXECUTION_STARTED` | 单次图执行开始。 |
| `EXECUTION_COMPLETED` | 单次图执行完成，回调数据为结果状态。 |
| `EXECUTION_FAILED` | 单次图执行失败，回调数据为异常。 |

```java
ScheduleConfig config = ScheduleConfig.builder()
    .fixedRate(60_000)
    .initialDelay(5_000)
    .inputs(Map.of("input", "Collect metrics"))
    .addListener((event, data) -> {
        System.out.println("Schedule event: " + event);
    })
    .build();
```

## 管理任务

```java
import io.github.agentic.ai.graph.scheduling.ScheduledAgentManager;
import io.github.agentic.ai.graph.scheduling.ScheduledAgentManagerFactory;

ScheduledAgentManager manager = ScheduledAgentManagerFactory.getInstance().getManager();

String taskId = task.getTaskId();
int activeCount = manager.getActiveTaskCount();

manager.getTask(taskId).ifPresent(ScheduledAgentTask::stop);
```

`ScheduledAgentTask.stop()` 会取消底层 `ScheduledFuture`，并从 active manager 中注销任务。

