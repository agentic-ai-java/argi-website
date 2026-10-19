---
title: Batched array loops
description: Dispatch ordered JSON array slices with explicit batch sizes while preserving legacy element framing.
---

# Batched array loops

`LoopMode.array(batchSize)` sends an ordered slice of the input array on each iteration.
It reduces the number of child-agent invocations when a child can handle several
items per request. This is sequential batching, not parallel execution.

```java
import io.github.agentic.ai.graph.agent.flow.agent.LoopAgent;
import io.github.agentic.ai.graph.agent.flow.agent.loop.LoopMode;

// worker is an application-configured child agent.
LoopAgent loop = LoopAgent.builder()
    .name("invoice-batches")
    .subAgent(worker)
    .loopStrategy(LoopMode.array(5))
    .build();
```

The default converter reads the last message as a JSON array. A custom converter
can provide a list through `LoopMode.array(batchSize, converter)`.

## Framing and compatibility

| Configuration | Input | Dispatch messages |
| --- | --- | --- |
| `LoopMode.array(2)` | `[1,2,3,4,5]` | `[1,2]`, `[3,4]`, `[5]` |
| Explicit batch size `1` | `[1,2]` | `[1]`, `[2]` |
| Legacy `new ArrayLoopStrategy()` | `[1,2]` | `1`, `2` |

A positive batch size is required. Empty input produces no work. The final batch
can be shorter, and a batch larger than the input consumes the remaining elements.
Explicit batch size one still uses JSON array framing, unlike the legacy constructor.

```shell
bash tools/run.sh argi-agent-example/batched-array-loop
```

This example exercises the actual initialization and dispatch strategy and inspects
its messages without invoking a model. Connect the same strategy to a `LoopAgent`
to execute a child agent; tune the batch size to the child's input budget.
The example does not claim model-quality or throughput measurements.
