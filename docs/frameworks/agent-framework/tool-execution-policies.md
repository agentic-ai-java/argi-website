---
title: Tool execution policies
description: Apply authorization, argument validation, business outcomes and effect-aware retries at the tool boundary.
---

# Tool execution policies

Use the [current RC2 source baseline](./runtime-contracts.md). The executable
`argi-agent-example/tool-execution-policies` module exercises the actual
`AgentToolNode` dispatcher with a local invoice tool.

## Authenticate before constructing execution context

Attach an application-owned `TrustedExecutionContext` to `RunnableConfig` after
authenticating the caller. It contains tenant/principal references, run and correlation IDs,
optional deadline, budget and delegation scope. These are identities and limits, not credentials.

```java
import io.github.agentic.ai.graph.RunnableConfig;
import io.github.agentic.ai.graph.execution.PrincipalReference;
import io.github.agentic.ai.graph.execution.TenantReference;
import io.github.agentic.ai.graph.execution.TrustedExecutionContext;

RunnableConfig config = RunnableConfig.builder()
    .threadId("invoice-session")
    .trustedExecutionContext(TrustedExecutionContext.builder()
        .tenant(new TenantReference("application-iam", "tenant-a"))
        .principal(new PrincipalReference("application-iam", "reviewer"))
        .runId("invoice-run")
        .correlationId("invoice-trace")
        .build())
    .build();
```

The fixed identities above are a local example. Never deserialize user-supplied JSON and
treat it as authenticated context. A serialized context reference must be resolved and
revalidated by the application's `TrustedExecutionContextResolver`.

## Enforce authorization on execution

```java
import io.github.agentic.ai.graph.agent.interceptor.authorization.AuthorizationDecision;
import io.github.agentic.ai.graph.agent.interceptor.authorization.ToolAuthorizationInterceptor;

ToolAuthorizationInterceptor authorization = new ToolAuthorizationInterceptor(
    (name, identity) -> "reviewInvoice".equals(name)
            && "tenant-a".equals(identity.tenant().id())
        ? AuthorizationDecision.allow()
        : AuthorizationDecision.deny("Invoice access is not granted"));
```

Register this interceptor with the agent's `interceptors(...)`. Strict mode is enabled
by default: missing trusted context returns `auth-denied` without invoking the tool.
Evaluate permissions on every attempt; when composing retry interceptors, place
authorization inside the retry boundary so each attempt is checked again.
A tool-selection result is never authorization.

At this baseline, `ToolAuthorizationPolicy.requireMatchingTenant()` only requires a
non-null tenant. Despite its name, it does **not** compare the caller with a resource's
tenant. Use an application policy for resource-scoped permission checks.

## Validate arguments before dispatch

Enable `ReactAgent.builder().validateToolArguments(true)`; it is off by default.
The validation subset includes JSON object input, required fields, types, enum, numeric
bounds, additional-property rejection and local `$ref` expansion. This is not a complete
JSON Schema engine. Current guards bound arguments to 64 KiB, traversal depth to 64,
and collection size to 1,000. Remote references are rejected, not fetched.

The example's `invoiceId` must be a positive integer. Invalid input has zero callback
invocations. At this revision, validation returns status `error` with `errorCode`
and `fieldPath`; the existence of a `VALIDATION_DENIED` constant does not mean
this path emits that status.

## Map business results explicitly

```java
import io.github.agentic.ai.api.tool.ToolResult;
import io.github.agentic.ai.graph.agent.interceptor.BusinessOutcomeMapperRegistry;
import java.util.Map;

BusinessOutcomeMapperRegistry outcomes = BusinessOutcomeMapperRegistry.builder()
    .declare("reviewInvoice", (call, result) ->
        new ToolResult(result.content(), true, Map.of("errorCode", "INVOICE_DECLINED")))
    .build();
```

This mapper intentionally treats every result of the sample ledger as a decline.
A production mapper should inspect the documented response contract of that tool.
Register it with `businessOutcomeMappers(outcomes)`. A mapper that changes a successful
result into a failure produces `business-failed` and a model-visible error.
Unregistered payloads are not searched for words such as "error" or "declined".

| Scenario in the example | Status | Tool callback count |
| --- | --- | --- |
| Missing trusted identity | `auth-denied` | 0 |
| Permission denied | `auth-denied` | 0 |
| Invalid invoice ID | `error`, with validation metadata | 0 |
| Registered business decline | `business-failed` | 1 |
| Same payload, no mapper | `SUCCESS` | 1 |

The status vocabulary is not uniformly wired at this baseline.
`ToolCallResponse.isError()` recognizes `error` and `business-failed`;
check `auth-denied` explicitly when implementing application control flow.

## Retry according to effects

`EffectAwareToolRetryInterceptor` uses a `ToolEffectRegistry`, a failure classifier
and optionally a reconciler. Explicitly classify tools as `READ_ONLY`, `IDEMPOTENT`,
`RECONCILABLE` or `UNSAFE`. Unknown effects default to unsafe.

The `EffectAwareRetries` entry point injects a timeout followed by a possible success:
a read-only operation makes two attempts, whereas an unsafe operation stops after one
with an uncertain-effect result. A timeout does not prove that an external write failed.
For reconcilable writes, verify the remote outcome before considering another execution.

```shell
bash tools/run.sh argi-agent-example/tool-execution-policies \
  -Dexample.mainClass=io.github.agentic.ai.examples.EffectAwareRetries
```

## Choose a tool-selection failure policy

| Policy | Selector failure behavior |
| --- | --- |
| `FAIL_OPEN_ALL_TOOLS` | Compatibility default; keeps all available tools |
| `FAIL_CLOSED_ALWAYS_INCLUDE` | Keeps only available `alwaysInclude` tools |
| `FAIL_CLOSED_THROW` | Throws `ToolSelectionFailedException` before downstream model invocation |

Opt-in strict policies expose an `ActionDecision` with an action type and stable
reason code. It is an operational signal, not private reasoning and not a separate
task executor. A legal empty selection can request a final response without being a failure.

```shell
bash tools/run.sh argi-agent-example/tool-execution-policies \
  -Dexample.mainClass=io.github.agentic.ai.examples.SelectionFailurePolicies
```

This entry point injects an unavailable selector. It demonstrates policy behavior
without a network call; normal selection requires a configured neutral `ChatClient`.
