---
title: Bounded background tasks
description: Bound local task execution, queues and retained results with BoundedTaskRepository.
---

# Bounded background tasks

`BoundedTaskRepository` is an opt-in, JVM-local implementation of `TaskRepository`.
It limits execution slots, waiting tasks and retained results independently.
Use the [current RC2 source revision](./runtime-contracts.md).

```java
import io.github.agentic.ai.graph.agent.tools.task.BoundedTaskRepository;
import java.time.Duration;

try (BoundedTaskRepository tasks =
        new BoundedTaskRepository(2, 8, 100, Duration.ofMinutes(10))) {
    var task = tasks.putTask("invoice-42", () -> "invoice checked");
    if (task.waitForCompletion(5000)) {
        String result = task.getResult();
        // Check task.getError() as well; completion can represent failure.
    }
}
```

The arguments above allow two execution slots, eight waiting tasks, 100 retained
terminal results and ten minutes of retention measured from execution exit.
Close the repository explicitly or register it with a bean destroy method.

## Observe backpressure

```shell
bash tools/run.sh argi-agent-example/background-tasks
```

The example holds one task behind a completion gate, queues a second, and observes:

1. A third submission is rejected because capacity is full.
2. Reusing the first task's ID is rejected.
3. Releasing the gate lets both accepted tasks finish in order.
4. The first retained result is removed explicitly, and resources are closed.

The gate makes this deterministic without relying on sleeps or external services.
A `RejectedExecutionException` message is diagnostic text, not a stable reason code.

## Lifecycle and limits

- Duplicate IDs remain reserved until execution has exited and the retained result
  has been removed or expired.
- Cancelling a running task does not release its slot until the supplier exits.
- Removing or clearing an active task hides it without cancelling it or freeing capacity.
- A caller-owned executor is never shut down by the repository.
- Results expire or are evicted; this is not an audit log.

This repository is instance-bound and cannot resume work after JVM loss.
Its inherited tenant-aware lookup delegates to ordinary lookup; it does not provide
tenant isolation. Use an application-owned repository with appropriate isolation for
multi-tenant tasks. See [recovery capabilities](../graph-core/versioned-recovery.md)
before combining local background tasks with durable execution requirements.
