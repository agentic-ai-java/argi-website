---
title: Model fallback and the streaming switch boundary
description: Candidate order, the first-event streaming switch boundary, cancellation and combining ModelFallbackInterceptor with retries.
---

# Model fallback and the streaming switch boundary

## Baseline and dependencies

This page describes how `ModelFallbackInterceptor` switches to alternative models when a model
call fails. The baseline is Core
[c6e453f20](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6),
checked on 2026-11-25, which includes the merged
[#368](https://github.com/agentic-ai-java/argi/pull/368) (cancellation-aware switch boundary for
streaming fallback, for [#210](https://github.com/agentic-ai-java/argi/issues/210)). The source
version is `2.1.0-RC2-SNAPSHOT`; this does not mean the commit is published to Maven Central, and
the same SNAPSHOT string does not guarantee the same source.

`ModelFallbackInterceptor` lives in the `argi-agent-framework` module, package
`io.github.agentic.ai.agent.orchestration.interceptor.modelfallback`. Both engines register it
through `interceptors(...)`; an independent ReActAgent that uses it also pulls in that module and
its transitive dependencies.

## Configuration

```java
ModelFallbackInterceptor fallback = ModelFallbackInterceptor.builder()
    .addFallbackClient(backupClient)      // tried in the order added
    .addFallbackClient(lastResortClient)
    .build();

ReActAgent agent = ReActAgent.builder(primaryClient)
    .interceptors(List.of(fallback))
    .build();
```

- At least one fallback `ChatClient` is required; otherwise `build()` throws
  `IllegalArgumentException`.
- The primary model is the engine's own `ChatClient`. After it fails, the fallback clients are
  tried in the order they were added until one succeeds or all have failed.
- A switch reuses the same request (system message, tools and options unchanged) and replaces
  only the `ChatClient`.
- There is no failure classification to configure: every failure except a cancellation triggers
  a switch. To decide by failure type whether to repeat a call, combine it with
  [model call retries](./model-retry.md).

## When every candidate fails

When all candidates fail, a `RuntimeException` is thrown with a message such as
`All clients failed after 3 attempts (primary, fallback-1, fallback-2)`; `getCause()` is the
last candidate's failure.

## Cancellation and run control

- Before every candidate call, including the primary, the request's `ExecutionGuard` is checked.
  A cancelled or expired run throws the run control's own exception and no model is called.
- If the failure's cause chain (up to 32 levels) contains a `CancellationException`, that
  cancellation is rethrown as is and no switch happens. An `InterruptedException` in the chain
  is turned into a `CancellationException` and the thread's interrupt flag is restored.
- On the synchronous path an already interrupted thread is also treated as a cancellation.

## The streaming switch boundary

When a call returns a **streaming response**, the interceptor adds a switch boundary to the
stream:

| When the failure happens | Behaviour |
| --- | --- |
| Before any event was emitted downstream | Switch to the next candidate; the caller only sees the new model's output. |
| After a text delta, tool call, usage or response event | End the stream with that failure and do not switch, so the output of two models is never concatenated. |
| The failure is a cancellation (also when wrapped) | On either side of the boundary, end with a `CancellationException` and do not switch. |

Each subscription of a streaming response owns its switch state, so a repeated subscription does
not resume an earlier switch sequence. The call to the next candidate is dispatched on a
`boundedElastic` thread so it does not block the thread that delivered the failure.

### How the two engines differ

The boundary only applies when the interceptor receives a **streaming** `ModelResponse`:

- **Graph-based `ReactAgent`**: with streaming enabled, `AgentLlmNode` passes the streaming
  response through the interceptor chain, so the boundary applies.
- **Independent `ReActAgent`**: with `streamModel(true)` the engine consumes the provider stream
  inside the model call, emitting `AgentEvent.MessageDelta` to the caller while it collects the
  complete response, and hands the interceptor a **non-streaming** response. The interceptor
  cannot see that deltas were already emitted, therefore:
  - A failure before the first delta switches cleanly; the caller only sees the backup's text
    (example scenario 7).
  - A failure after partial deltas **still switches**. The backup's deltas are appended to the
    same message ID, so the delta view shows the two models concatenated, for example `Draft` +
    `Done` shown as `DraftDone`; the complete snapshot with the same ID then replaces it with
    `Done` (example scenario 8).
  - `ModelRetryInterceptor` behaves the same way on this path: a transient failure after partial
    deltas is retried and the new deltas are appended as well (example scenario 9).

When you combine streaming output with fallback or retries on the independent ReActAgent,
consumers must follow the rules in
[streaming message identity](./stream-message-identity.md): treat the complete snapshot with the
same ID as authoritative and never present the concatenated deltas as the final answer.

## Combining with model retries

Register the fallback interceptor first (outermost) and the retry interceptor after it:

```java
ReActAgent agent = ReActAgent.builder(primaryClient)
    .interceptors(List.of(fallback, retry))
    .build();
```

Each model is then retried to exhaustion before the next candidate is tried. In example
scenario 4 the backup is called only after three transient failures of the primary (3 primary
calls, 1 backup call). In the reverse order the retry wraps the whole fallback sequence: it
retries only when the whole sequence failed and that failure is classified as retryable, and
each retry starts again from the primary (this order is not tested by the example).

## Running the offline example

`examples/streaming-fallback/` in the website repository drives the real independent ReAct
engine, `ModelFallbackInterceptor` and `ModelRetryInterceptor` with scripted fake `ChatClient`s.
It requires JDK 17+ and Maven 3.9.1+. In the Core repository, check out the pinned commit and run:

```bash
git checkout c6e453f20fcb1c7837d92b321aa18ec5a46ccab6
./mvnw -B -pl :argi-agent-framework -am install -DskipTests
```

From the website repository root:

```bash
mvn -B -f examples/streaming-fallback/pom.xml compile exec:java
```

Downloading dependencies needs the network; running the example needs neither network nor
credentials. On success it prints:

```text
PASS: non-streaming fallback, exhaustion, cancellation, retry ordering, stream switch boundary, independent ReAct streaming before/after output, retry after output
```

A failed assertion fails the command; it does not depend on `-ea`.

## Coverage and limits

| Scenario | What the offline example checks |
| --- | --- |
| 1 Non-streaming fallback | The primary fails, the backup answers; one call each. |
| 2 Every candidate fails | The message lists the candidate sequence; the cause is the last failure. |
| 3 Cancellation | The primary throws `CancellationException`; the caller gets the cancellation and the backup is called 0 times. |
| 4 Combined with retries | Fallback outside, retry inside: 3 primary calls, 1 backup call. |
| 5 Stream boundary, failure before output | Drives the interceptor with a streaming handler (the graph engine's shape); clean switch to the backup. |
| 6 Stream boundary, failure after output | Same, failing after `Draft`: the stream ends with the error, the backup is called 0 times. |
| 7 Independent ReAct streaming, failure before output | Deltas contain only the backup's `Done`. |
| 8 Independent ReAct streaming, failure after output | Still switches: deltas `DraftDone`, snapshot `Done`. |
| 9 Independent ReAct streaming, retry after output | Retried: deltas `DraftDone`, snapshot `Done`. |
| Graph-based `ReactAgent` end to end | Not tested; scenarios 5 and 6 verify only the interceptor's own streaming contract. |

Sources: [ModelFallbackInterceptor](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/main/java/io/github/agentic/ai/agent/orchestration/interceptor/modelfallback/ModelFallbackInterceptor.java),
the [independent ReActAgent](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-core/src/main/java/io/github/agentic/ai/agent/react/ReActAgent.java)
and the upstream test [ModelFallbackSwitchBoundaryTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/test/java/io/github/agentic/ai/agent/orchestration/interceptors/ModelFallbackSwitchBoundaryTest.java).
Passing offline does not validate a real provider. This page and its Chinese counterpart cover
only the streaming-fallback item of
[#372](https://github.com/agentic-ai-java/argi/issues/372).
