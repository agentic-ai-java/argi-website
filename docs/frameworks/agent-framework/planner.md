---
title: 结构化任务规划
sidebar_label: 结构化任务规划
description: 使用 ArgiPlanner 生成简单任务或多步骤依赖计划，并校验能力引用、Schema 与 DAG。
keywords: [ArgiPlanner, PlanSpec, PlanStep, Planner, DAG, Todo, Agent Framework]
---

# 结构化任务规划

`ArgiPlanner` 是可选的计划生成 adapter。它返回经过校验的 `PlanSpec`，用于描述任务目标、步骤及依赖关系，**不会执行工具、运行 Agent 或自动调度计划**。需要多步骤任务的显式计划契约时使用它；只需要提示模型维护待办列表时，继续使用 `TodoListInterceptor` 与 `WriteTodosTool`。

## 前置条件与依赖

本文示例需要 Java 17，以及包含 `io.github.agentic.ai.graph.agent.planner` 包的 Core 版本。此功能随 Core Planner 变更新增；旧发布版本不包含这些 API。当前开发版本为 `2.1.0-RC2-SNAPSHOT`。正式发布前，应先从包含此变更的 Core 源码构建并安装，而不是假设该快照已经发布到 Maven Central：

```shell
./mvnw -pl :argi-agent-framework -am -DskipTests install
```

然后在应用中引入依赖。已使用对应版本 BOM 的应用可以省略显式版本：

```xml
<dependency>
    <groupId>io.github.agentic-ai-java</groupId>
    <artifactId>argi-agent-framework</artifactId>
    <version>2.1.0-RC2-SNAPSHOT</version>
</dependency>
```

还需准备应用已经授权的工具、Agent，以及不带默认工具回调的 Spring AI `ChatModel`。工具和 Agent 的创建方式见 [工具调用](/docs/frameworks/agent-framework/tools) 与 [多智能体](/docs/frameworks/agent-framework/multi-agent)。Planner 不会代替应用发现或授权能力，也不新增 Extensions、Redis 或持久化依赖。

## 选择规划模式

| 模式 | 适用场景 | 行为 |
| --- | --- | --- |
| `DIRECT` | 应用确定一个已注册能力可以完成简单任务。 | 生成一个 `PENDING` 步骤，不调用模型，也不执行该步骤。 |
| `DECOMPOSE` | 任务需要多个步骤、串行依赖或并行分支。 | 调用模型生成依赖图，完成 Schema 与业务校验后才返回计划。 |

模式由应用明确选择，而不是由模型自行决定。`DIRECT` 必须指定已注册的 `directTarget`；`DECOMPOSE` 的 `directTarget` 必须为 `null`。`revision` 由应用管理，必须为正数。

## 注册能力并生成计划

下面的类可直接放入应用。构造参数由应用注入：`planningModel` 是无工具执行副作用的规划模型，`searchTool` 与 `writerAgent` 是已经授权的实际能力。示例约定搜索和写作输出均为 JSON 字符串，写作输入为对象；应按真实能力调整这些契约。

```java
import io.github.agentic.ai.graph.agent.Agent;
import io.github.agentic.ai.graph.agent.planner.ArgiPlanner;
import io.github.agentic.ai.graph.agent.planner.PlanCapability;
import io.github.agentic.ai.graph.agent.planner.PlanCodec;
import io.github.agentic.ai.graph.agent.planner.PlanSpec;
import io.github.agentic.ai.graph.agent.planner.PlanValidator;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;

public final class PlannerExample {

    private final ArgiPlanner planner;
    private final PlanValidator validator;
    private final PlanCodec codec = new PlanCodec();
    private final String searchTarget;

    public PlannerExample(ChatModel planningModel,
            ToolCallback searchTool, Agent writerAgent) {
        PlanCapability search = PlanCapability.tool(
            searchTool, "{\"type\":\"string\"}");
        PlanCapability writer = PlanCapability.agent(
            writerAgent, "{\"type\":\"object\"}", "{\"type\":\"string\"}");
        this.validator = new PlanValidator(List.of(search, writer), 64, 16);
        this.planner = new ArgiPlanner(planningModel, this.validator);
        this.searchTarget = search.executionTarget();
    }

    public PlanSpec direct(String objective) {
        return this.planner.plan(new ArgiPlanner.Request(
            objective, 1, ArgiPlanner.Mode.DIRECT, this.searchTarget));
    }

    public PlanSpec decompose(String objective, long revision) {
        return this.planner.plan(new ArgiPlanner.Request(
            objective, revision, ArgiPlanner.Mode.DECOMPOSE, null));
    }

    public String encode(PlanSpec plan) {
        this.validator.validate(plan);
        return this.codec.encode(plan);
    }

    public PlanSpec restore(String json) {
        PlanSpec plan = this.codec.decode(json);
        this.validator.validate(plan);
        return plan;
    }
}
```

调用 `direct("Find the release notes")` 会生成一个引用实际工具名称的 `step-1`；调用 `decompose("Research two sources and summarize them", 1)` 会请求模型拆解任务。两种方法都只返回计划数据，不执行注册的能力。

`PlanCapability.tool` 从 `ToolCallback` 的真实定义提取名称、描述和输入 Schema，输出 Schema 由应用提供；`PlanCapability.agent` 提取 Agent 的名称和描述，输入/输出 Schema 均由应用提供。它们不保留执行回调。工具引用为 `tool:<name>`，Agent 引用为 `agent:<name>`；生成的计划只能引用本次注册表中的精确键。

## 表达串行与并行依赖

`dependencies` 保存上游步骤的 `stepId`，与 `steps` 列表顺序无关。两个没有互相依赖的步骤可以表达并行工作，但 Planner 不会启动线程或自动并发执行。

下面的完整示例使用已授权的能力描述符构造两个研究分支，以及依赖两个分支的汇总步骤：

```java
import io.github.agentic.ai.graph.agent.planner.PlanCapability;
import io.github.agentic.ai.graph.agent.planner.PlanSpec;
import io.github.agentic.ai.graph.agent.planner.PlanStep;
import io.github.agentic.ai.graph.agent.planner.PlanValidator;

import java.util.List;

public final class ParallelPlanExample {

    public static PlanSpec build(PlanCapability search, PlanCapability writer) {
        PlanSpec plan = new PlanSpec(PlanSpec.CURRENT_SCHEMA_VERSION, 1,
            "Research two sources and summarize them", List.of(
                step("source-a", "Research the first source", search, List.of()),
                step("source-b", "Research the second source", search, List.of()),
                step("summary", "Summarize both sources", writer,
                    List.of("source-a", "source-b"))));
        new PlanValidator(List.of(search, writer)).validateGenerated(plan);
        return plan;
    }

    private static PlanStep step(String id, String objective,
            PlanCapability capability, List<String> dependencies) {
        return new PlanStep(id, objective, dependencies,
            capability.executionTarget(), capability.inputSchema(),
            capability.outputSchema(), "Satisfy the objective and output contract",
            PlanStep.Status.PENDING, null, null);
    }
}
```

| stepId | dependencies | 关系 |
| --- | --- | --- |
| `source-a` | `[]` | 独立研究分支。 |
| `source-b` | `[]` | 独立研究分支。 |
| `summary` | `["source-a", "source-b"]` | 依赖两个研究分支。 |

纯串行计划可让每个后续步骤只依赖前一个步骤。上述例子表达依赖关系，不生成步骤参数、数据绑定或可执行 Graph；未来执行器仍需负责输入映射、调度及完成判定。

## 校验与失败处理

`PlanValidator` 默认最多允许 64 个步骤、依赖深度 16，也可以像上例一样显式配置。深度按最长依赖路径上的节点数计算，独立步骤的深度为 1。

返回计划前会校验：

- 版本、必填字段、字段类型、非空文本及唯一 `stepId`。
- 每个依赖是否存在，以及所有连通分量是否无环。
- 执行目标能否在注册表中精确解析。
- 输入/输出 Schema 是否与注册能力的契约结构一致。
- 步骤数和最长依赖路径是否超过限制。
- 模型生成的步骤是否全部为 `PENDING`，且 `result`、`error` 都为 `null`。

Schema 使用自包含的 Draft 2020-12 JSON Schema，支持本地 `$ref` / `$dynamicRef`，不允许远程引用或更换 dialect。模型不能通过生成文本添加能力、改写契约或声明已完成状态。自然语言目标和完成判据不是执行证据，也不能赋予工具权限。

结构或业务约束不满足时抛出 `PlanValidationException`，应用应停止该计划的后续处理，不应降级为直接执行模型输出。模型提供方异常直接传播，不会隐式重试。带默认工具回调的模型、工具调用响应、空响应或多个 generation 都会被拒绝；自定义 `ChatModel.call` 的副作用仍由应用负责控制。

## 编码、保存与恢复

`PlannerExample.encode` 与 `restore` 展示了 `PlanCodec` 的 JSON 往返和业务校验。`schemaVersion` 当前为 1，与应用管理的 `revision` 不同。编码保留 stepId、依赖关系和生命周期字段，解码拒绝未知版本、缺失/额外字段、重复 JSON key 及尾随数据。

`PlanCodec.jsonSchema()` 返回权威 wire Schema。`status` 支持 `PENDING`、`RUNNING`、`COMPLETED`、`FAILED`、`SKIPPED`；生成阶段只能使用 `PENDING`，其他状态及结果预留给可信执行器。

从存储中恢复的 `COMPLETED` 或 `result` **不是执行证明**。`validate` 只校验结构，不授权重放，也不把结果与输出 Schema 作执行级校验。模型或其他不可信来源的计划还必须经过 `validateGenerated`，不能只 decode 后就执行。

应用可以将计划编码后单独保存，或在已有 Graph 节点中把计划写入新的应用自有 state key。框架不会自动添加 reducer、修改 checkpoint 格式或恢复后启动执行。跨 revision 的重规划由应用保留未变化步骤的 stepId，并自行递增 revision；Planner 不实现 ID 对齐或 replan。

## 与 Todo、Flow 和工具调用日志的边界

| 能力 | 用途 |
| --- | --- |
| Todo | 维护待办内容与进度，向模型提供提示，不保证依赖或执行顺序。 |
| Planner | 生成和校验可版本化计划数据，不执行计划。 |
| Flow / Graph | 承载应用定义的执行拓扑，不会自动把 PlanSpec 转成执行图。 |
| 单次工具调用日志 | 记录一次模型工具分派，与多步骤任务计划不同。 |

此 API 为可选新增路径，不改变现有 Todo Schema/status、flow agent 默认行为或历史 state/checkpoint 格式，无需迁移。计划执行、重新规划、跨 Worker 调度和持久化由其他任务负责；采用时只需增加显式 Planner 调用，撤回时移除该调用及新增计划存储键即可。
