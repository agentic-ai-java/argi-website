---
title: Versioned run definitions and recovery
description: Resolve pinned graph, tool, codec and application versions and reject incompatible recovery.
---

# Versioned run definitions and recovery

This guide uses the [current RC2 source baseline](../agent-framework/runtime-contracts.md).
`RunDefinitionRecord` stores references to four independent definitions: graph,
tool catalog, data codec and application. The references identify exact versions;
a worker must not silently substitute the latest deployed version.

## Resolve before executing

```java
import io.github.agentic.ai.graph.execution.definition.DefinitionKind;
import io.github.agentic.ai.graph.execution.definition.DefinitionReference;
import io.github.agentic.ai.graph.execution.definition.RunDefinitionRecord;

RunDefinitionRecord record = RunDefinitionRecord.of(
    DefinitionReference.of(DefinitionKind.GRAPH, "invoice", "1"),
    DefinitionReference.of(DefinitionKind.TOOL_CATALOG, "billing", "1"),
    DefinitionReference.of(DefinitionKind.CODEC, "billing-json", "1"),
    DefinitionReference.of(DefinitionKind.APPLICATION, "billing", "1"));
```

Register definitions with `DefinitionRegistry` and serialize the record with
`RunDefinitionRecordCodec`. Declare the worker's supported definition kinds,
record schema version and readable codec references using `WorkerCapabilities`.
Call `RunDefinitionAdmission.resolve(...)` before dispatching application code.

For a stored `RunSpec`, use `RunDefinitionRecord.forRun(...)` and the `resolve`
overload that receives that run. It also checks that the recorded graph matches the
admitted run. Persistence of this envelope is application-owned; creating the record
does not automatically attach it to every checkpoint.

```shell
bash tools/run.sh argi-graph-example/versioned-recovery
```

The executable registry contains version-one and version-two invoice definitions.
Restoring a version-one record still resolves version one. Removing that definition
produces `NOT_REGISTERED`, rather than falling back to version two.
An unsupported codec is rejected before dispatch as well.

The registry values in this local example are small data definitions. They do not
constitute an autonomous worker or serialized executable code.

## Require truthful recovery capabilities

Declare all relevant component roles, including custom nodes, chat memory, store
and background tools. Each is `DATA_ONLY`, `INSTANCE_BOUND` or
`NOT_APPLICABLE`. Omitting a role is distinct from explicitly declaring it unused.

`RunDefinitionAdmission.requireRecoverableComponents(...)` rejects instance-bound
components and missing declarations. `requireDurableMode(storeCapabilities, ...)`
also checks the backend's durable capability contract.

`MemoryRunStore` rejects durable mode. Local suppliers, in-process task handles
and `BoundedTaskRepository` cannot be made recoverable merely by labeling them
data-only. A production backend must supply its real guarantees, and registered
definitions must remain available for the lifetime of persisted runs.

## Run storage and execution are separate

The existing `argi-graph-example/recoverable-runs` module demonstrates:

- Application-owned trusted context and data-only `RunSpec` serialization.
- Submission deduplication and session reservations.
- Physical leases, renewal and stale-owner fencing.
- Atomic run/task/checkpoint/journal/outbox commits.
- Conflict rejection without partially changing the stored checkpoint.

```shell
bash tools/run.sh argi-graph-example/recoverable-runs
```

These are storage contracts. They do not schedule tasks, deliver outbox events,
guarantee exactly-once external effects or recover a Java closure after a crash.
The memory implementation is useful for local contract checks, not restart durability.

## Explicit checkpoint thread identities

Keep a stable `RunnableConfig.threadId(...)` for checkpointed sessions.
Missing thread IDs now produce an observable warning under the compatibility policy.
Applications can require explicit IDs using the JVM property:

```shell
java -Dargi.checkpoint.requireExplicitThreadId=true ...
```

The policy also exposes `CheckpointThreadIdPolicy.setRequireExplicitThreadId(true)`.
This is a process-wide setting; configure it at startup, not per request.
A thread ID is a storage key, not an authenticated tenant or user identity.
