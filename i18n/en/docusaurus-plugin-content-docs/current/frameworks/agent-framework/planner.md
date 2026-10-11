---
title: Structured Task Planning
sidebar_label: Structured Planning
description: Generate direct or decomposed task plans with ArgiPlanner and validate capability references, schemas, and dependency DAGs.
keywords: [ArgiPlanner, PlanSpec, PlanStep, Planner, DAG, Todo, Agent Framework]
---

# Structured Task Planning

`ArgiPlanner` is an opt-in plan-generation adapter. It returns a validated `PlanSpec` describing objectives, steps, and dependencies. It **does not execute tools, run agents, or schedule the plan**. Use it when a multi-step task needs an explicit planning contract. Continue using `TodoListInterceptor` and `WriteTodosTool` when prompt-guided task tracking is sufficient.

## Prerequisites and dependency

The examples require Java 17 and a Core version containing the `io.github.agentic.ai.graph.agent.planner` package. These APIs are new with the Core Planner change; older releases do not contain them. The current development version is `2.1.0-RC2-SNAPSHOT`. Until a release is available, build and install Core from source containing this change rather than assuming that this snapshot is on Maven Central:

```shell
./mvnw -pl :argi-agent-framework -am -DskipTests install
```

Add the dependency to the application. Applications importing the matching BOM can omit the explicit version:

```xml
<dependency>
    <groupId>io.github.agentic-ai-java</groupId>
    <artifactId>argi-agent-framework</artifactId>
    <version>2.1.0-RC2-SNAPSHOT</version>
</dependency>
```

Provide already-authorized tools and agents, plus a Spring AI `ChatModel` without default tool callbacks. See [Tools](/docs/frameworks/agent-framework/tools) and [Multi-agent orchestration](/docs/frameworks/agent-framework/multi-agent) for creating those application dependencies. The planner neither discovers nor authorizes capabilities and adds no Extensions, Redis, or persistence dependency.

## Choose a planning mode

| Mode | Use when | Behavior |
| --- | --- | --- |
| `DIRECT` | The application knows one registered capability can satisfy a simple task. | Creates one `PENDING` step without a model call or execution. |
| `DECOMPOSE` | A task needs multiple steps, serial dependencies, or parallel branches. | Calls the model and returns a dependency graph only after schema and business validation. |

The application explicitly selects the mode; the model does not decide it. `DIRECT` requires a registered `directTarget`; `DECOMPOSE` requires `directTarget` to be `null`. The application owns the positive `revision`.

## Register capabilities and generate plans

The following class can be used in an application. Inject its constructor arguments: `planningModel` is a tool-free model with no execution side effects; `searchTool` and `writerAgent` are real, already-authorized capabilities. The example assumes JSON string outputs for both capabilities and object input for the writer. Adjust these contracts to match the actual capabilities.

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

Calling `direct("Find the release notes")` creates `step-1` referencing the actual tool name. Calling `decompose("Research two sources and summarize them", 1)` requests model decomposition. Both methods return plan data only, without invoking registered capabilities.

`PlanCapability.tool` reads the tool's actual name, description, and input schema from its `ToolCallback`; the application supplies the output schema. `PlanCapability.agent` reads the agent name and description; the application supplies both schemas. Neither descriptor retains an execution callback. Tool references use `tool:<name>`, agent references use `agent:<name>`, and generated plans may reference only exact keys in this catalog.

## Express serial and parallel dependencies

`dependencies` contains upstream `stepId` values, independent of the order of the `steps` list. Steps without mutual dependencies can describe parallel work, but the planner starts no threads and performs no concurrent execution.

This complete example uses authorized descriptors to construct two research branches and a summary step depending on both:

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

| stepId | dependencies | Relationship |
| --- | --- | --- |
| `source-a` | `[]` | Independent research branch. |
| `source-b` | `[]` | Independent research branch. |
| `summary` | `["source-a", "source-b"]` | Depends on both branches. |

For a serial plan, make each later step depend on the preceding step. This example describes dependencies, not arguments, data bindings, or an executable Graph. A future executor must handle input mapping, scheduling, and completion checks.

## Validation and failure handling

`PlanValidator` defaults to 64 steps and dependency depth 16; both limits can be set explicitly. Depth counts nodes on the longest dependency path, so an independent step has depth 1.

Before a plan is returned, validation checks:

- Version, required fields, field types, nonblank text, and unique step IDs.
- Existing dependency references and acyclicity across all connected components.
- Exact execution-target resolution against the catalog.
- Structural equality of input/output schemas with registered contracts.
- Step-count and longest-path limits.
- Only `PENDING` statuses with null `result` and `error` in generated plans.

Contracts use self-contained Draft 2020-12 JSON Schema. Local `$ref` / `$dynamicRef` references are supported; remote references and different dialects are rejected. Model text cannot add capabilities, change contracts, or declare completed statuses. Natural-language objectives and completion criteria are neither execution evidence nor tool permissions.

Invalid structure or business constraints raise `PlanValidationException`. Stop processing that plan rather than falling back to direct execution of model output. Provider exceptions propagate without implicit retries. Models with default tool callbacks, tool-call responses, empty responses, and multiple generations are rejected. Side effects in a custom `ChatModel.call` implementation remain the application's responsibility.

## Encode, store, and restore

`PlannerExample.encode` and `restore` demonstrate JSON round trips with `PlanCodec` and business validation. The current `schemaVersion` is 1, independent of the application-owned `revision`. Encoding preserves IDs, dependencies, and lifecycle data. Decoding rejects unknown versions, missing/extra fields, duplicate JSON keys, and trailing data.

`PlanCodec.jsonSchema()` returns the authoritative wire schema. Supported statuses are `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, and `SKIPPED`. Generation permits only `PENDING`; other statuses and outcomes are reserved for a trusted executor.

A restored `COMPLETED` status or `result` **is not proof of execution**. `validate` checks structure, not replay authority or execution-level output conformance. Plans from models or other untrusted sources must also pass `validateGenerated`; decoding alone must never trigger execution.

An application can store encoded JSON separately or write the plan under a new application-owned state key in an existing Graph node. The framework adds no automatic reducer, changes no checkpoint format, and starts no execution after restoration. Replanning applications must preserve IDs of unchanged steps and increment revision themselves; this adapter provides neither cross-revision ID reconciliation nor replan.

## Boundaries with Todo, Flow, and tool journals

| Capability | Purpose |
| --- | --- |
| Todo | Tracks task content and progress through model guidance; it does not guarantee dependency or execution order. |
| Planner | Generates and validates versioned plan data without executing it. |
| Flow / Graph | Runs application-defined execution topology; it does not automatically convert PlanSpec into a graph. |
| Single tool-call journal | Records one model tool dispatch, distinct from a multi-step task plan. |

This additive, opt-in API leaves Todo schemas/statuses, flow-agent defaults, and historical state/checkpoint formats unchanged. No migration is required. Execution, replanning, cross-worker scheduling, and persistence belong to separate tasks. Adoption adds an explicit planner call; rollback removes that call and the application's new plan-storage key.
