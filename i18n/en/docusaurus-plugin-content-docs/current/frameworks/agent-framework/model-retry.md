---
title: Model call retries
description: Attempts, failure classification, backoff and the run deadline in ModelRetryInterceptor.
---

# Model call retries

## Baseline and dependencies

This page describes how `ModelRetryInterceptor` decides whether to repeat a single failed
model call. The baseline is Core
[c6e453f20](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6),
checked on 2026-11-24, which includes the merged
[#356](https://github.com/agentic-ai-java/argi/pull/356) (controlled model retry, for
[#313](https://github.com/agentic-ai-java/argi/issues/313)). The source version is
`2.1.0-RC2-SNAPSHOT`; this does not mean the commit is published to Maven Central, and the
same SNAPSHOT string does not guarantee the same source.

| Type | Module | Package |
| --- | --- | --- |
| `ModelRetryInterceptor` | `argi-agent-framework` | `io.github.agentic.ai.agent.orchestration.interceptor.modelretry` |
| `RetryPolicy`, `ModelCallFailureCategory`, `TypeBasedModelCallFailureClassifier` and the rest of the contract | `argi-agent-api` | `io.github.agentic.ai.agent.retry` |

Both engines register it through `interceptors(...)`: the independent
`io.github.agentic.ai.agent.react.ReActAgent.builder(client).interceptors(List.of(retry))`
and the graph-based `ReactAgent.builder().interceptors(retry)`. The interceptor class
currently lives in `argi-agent-framework`, so an independent ReActAgent that uses it also
pulls in that module and its transitive dependencies.

## Recommended configuration

```java
ModelRetryInterceptor retry = ModelRetryInterceptor.builder()
    .maxAttempts(3)                       // includes the first call
    .initialDelay(1000)                   // wait 1 s before the second call
    .backoffMultiplier(2.0)               // then multiply each wait by 2
    .maxDelay(30000)                      // upper bound of one wait
    .failureClassifier(new TypeBasedModelCallFailureClassifier())
    .deadlineReserve(Duration.ofMillis(500))
    .build();

ReActAgent agent = ReActAgent.builder(client)
    .interceptors(List.of(retry))
    .build();
```

New applications should set `failureClassifier` explicitly. Without it the interceptor keeps
the legacy message-text decision described below.

## Defaults

| Builder method | Default | Meaning |
| --- | --- | --- |
| `maxAttempts` | `3` | Total calls including the first; must be ≥ 1. |
| `initialDelay` | `1000` ms | Wait after the first failure. |
| `backoffMultiplier` | `2.0` | Factor for each following wait; finite and ≥ 1.0. |
| `maxDelay` | `30000` ms | Upper bound of a single wait. |
| `retryableCategories` | `TRANSIENT`, `RATE_LIMITED` | Failure categories that may be retried. |
| `deadlineReserve` | `0` | Time that must remain before the run deadline to start another call. |
| `failureClassifier` | not set | When not set, `retryableExceptionPredicate` decides. |

With the defaults there are at most 3 calls, with waits of 1 s and 2 s.

## Which failures are retried

Each failure is mapped to a `ModelCallFailureCategory`; `retryableCategories` then decides:

| Category | Meaning | Retried by default |
| --- | --- | --- |
| `TRANSIENT` | Temporary failure; a later call may succeed | Yes |
| `RATE_LIMITED` | The provider asked the caller to slow down | Yes |
| `PERMANENT` | The request itself was rejected | No |
| `CANCELLED` | Cancelled or interrupted | Never |
| `UNKNOWN` | Could not be classified | No |

**With `failureClassifier` set**, the classifier decides and `retryableExceptionPredicate` is
not consulted. The default `TypeBasedModelCallFailureClassifier` reads types only, never
message text, and walks up to 32 levels of the cause chain:

- `CancellationException`, `InterruptedException` → `CANCELLED`
- `SocketTimeoutException`, `TimeoutException`, `IOException` → `TRANSIENT`
- anything else → `UNKNOWN`, not retried

It never produces `RATE_LIMITED` or `PERMANENT`. When a provider reports 429 and similar
conditions through its own exception types, supply a classifier and keep the default as
the fallback:

```java
ModelCallFailureClassifier classifier = failure ->
    failure instanceof MyProviderRateLimitException
        ? new ModelCallFailure(ModelCallFailureCategory.RATE_LIMITED, failure)
        : new TypeBasedModelCallFailureClassifier().classify(failure);
```

**Without `failureClassifier` (legacy configuration)**, the default predicate inspects message
text and class names, for example a message containing `connection`, `timeout`, `socket` or
`i/o error`, or a cause whose class name contains `IOException`, `TimeoutException` or
`SSLException`. A match becomes `TRANSIENT`, anything else `PERMANENT`. A permanent error whose
message happens to contain "timeout" is therefore retried; scenario 4 of the offline example
shows this.

## Attempts, deadline and cancellation

After a failure the interceptor decides in this order:

1. Cancellation: if the cause chain contains a `CancellationException` or the thread is
   interrupted, a `CancellationException` is thrown immediately and no further call is made.
   A classifier that returns `CANCELLED` stops the sequence with `CANCELLED`.
2. The category is not in `retryableCategories`: stop with `NON_RETRYABLE`.
3. `maxAttempts` is reached: stop with `ATTEMPTS_EXHAUSTED`.
4. Now plus the next wait is not before the run deadline: stop with `DEADLINE_EXCEEDED`.
5. Otherwise wait and retry.

Before every call it also checks that the run is still active (a stopped run throws the
run control's own exception) and stops with `DEADLINE_EXCEEDED` when the deadline has passed
or the remaining time is ≤ `deadlineReserve`.

The deadline comes from the run's `ExecutionGuard`. The independent ReActAgent passes the
control of its execution context, whose deadline is set with
`TrustedExecutionContext.builder().deadline(...)`; the graph-based framework passes the guard
of its run configuration. With a guard present the wait runs in 100 ms slices and checks the
guard before each slice, so a cancelled or expired run ends the wait without another call.
Without a deadline only `maxAttempts` bounds the sequence.

## What the caller sees on failure

When the sequence stops, a `RuntimeException` is thrown whose `getCause()` is the last
provider failure:

| Stop reason | Exception message |
| --- | --- |
| `ATTEMPTS_EXHAUSTED` | `Model call failed, maximum number of retries reached.` |
| `NON_RETRYABLE` | `Model call failed (non-retryable exception)` |
| `DEADLINE_EXCEEDED` | `Model call failed, the run deadline does not allow another attempt` |
| `CANCELLED` | `Model call failed, the attempt was cancelled` |
| `EXECUTION_STOPPED` | `Model call failed, the run stopped` |

The current baseline does not expose a typed `RetryStopReason` on the exception; treat the
message as diagnostic only and do not branch on it. Inspect `getCause()` to tell provider
errors apart. With the independent ReActAgent, the `CompletableFuture` returned by
`invoke(...)` fails with this exception and a `stream(...)` subscriber receives `onError`.

## Combining with model fallback

When you also use `ModelFallbackInterceptor`, register the fallback interceptor first
(outermost) and the retry interceptor after it, so each model is retried to exhaustion before
the next candidate is tried.

## Streaming calls

When the interceptor receives a streaming `ModelResponse` (the graph-based `ReactAgent` with
streaming enabled), a failure is retried only if no chunk has been emitted downstream yet; once
partial output was produced the failure ends the stream, so output is never duplicated. Each
subscription owns its own attempt budget.

The independent ReActAgent with `streamModel(true)` is different: the engine consumes the stream
and emits deltas inside the model call and hands the interceptor a non-streaming response, so a
transient failure after partial deltas **is still retried**, the new deltas are appended to the
same message ID, and the complete snapshot replaces them afterwards. See
[Model fallback and the streaming switch boundary](./model-fallback.md#how-the-two-engines-differ);
scenario 9 of its offline example verifies this. The offline example on this page covers the
non-streaming `call` path only.

## Running the offline example

`examples/model-retry/` in the website repository drives the real independent ReAct engine
and `ModelRetryInterceptor` with a scripted fake `ChatClient`. It requires JDK 17+ and Maven
3.9.1+. In the Core repository, check out the pinned commit and run:

```bash
git checkout c6e453f20fcb1c7837d92b321aa18ec5a46ccab6
./mvnw -B -pl :argi-agent-framework -am install -DskipTests
```

From the website repository root:

```bash
mvn -B -f examples/model-retry/pom.xml compile exec:java
```

Downloading dependencies needs the network; running the example needs neither network nor
credentials. On success it prints:

```text
PASS: transient retry, attempt bound, UNKNOWN not retried, legacy predicate, custom classifier, deadline stop
```

A failed assertion fails the command; it does not depend on `-ea`.

## Coverage and limits

| Topic | What the offline example checks |
| --- | --- |
| Transient failure recovered | Two `IOException`s, then success: 3 calls. |
| Attempt bound | Three `IOException`s: fails as exhausted, cause is the last failure. |
| No message parsing | An `IllegalArgumentException` mentioning "timeout" is `UNKNOWN`: 1 call. |
| Legacy predicate | Without a classifier the same exception is retried 3 times. |
| Custom classification | A provider exception mapped to `RATE_LIMITED` is retried and succeeds. |
| Deadline | The next wait outlives the deadline, so no second call is made. |
| Cancellation, `deadlineReserve`, streaming | Not repeated here; covered by the upstream tests at the pinned commit below. |
| Graph-based `ReactAgent` | Neither this example nor the upstream retry tests run through that engine; this page describes it from source only. |

Sources: [ModelRetryInterceptor](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/main/java/io/github/agentic/ai/agent/orchestration/interceptor/modelretry/ModelRetryInterceptor.java),
the [retry contract](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/main/java/io/github/agentic/ai/agent/retry),
and the upstream tests [ModelRetryControllerTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/test/java/io/github/agentic/ai/agent/retry/ModelRetryControllerTest.java) (including `deadlineReserve`),
[ModelRetryCancellationTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/test/java/io/github/agentic/ai/agent/orchestration/interceptors/ModelRetryCancellationTest.java)
and [ModelRetryInterceptorTest](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/test/java/io/github/agentic/ai/agent/orchestration/interceptors/ModelRetryInterceptorTest.java) (including streaming).
This retry covers one model call only: it does not switch models, replay tool calls or keep a
persistent retry budget. Passing offline does not validate a real provider. This page and its
Chinese counterpart cover only the model-retry item of
[#372](https://github.com/agentic-ai-java/argi/issues/372).

## Separate from context window budgets

Retries decide whether to call again after a failure; they do not ensure that a request fits the current model window. See [Context window budgets](./context-window-budget) for full-request estimation, compaction, pairing validation, and dispatch rejection. Test interceptor ordering for your composition.
