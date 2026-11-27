---
title: Context window budgets
description: Estimate the full model request, compact on demand, and refuse dispatch when it exceeds one model context window.
---

# Context window budgets

## Baseline and dependencies

This guide covers the context window budgets item in
[ARGI #372](https://github.com/agentic-ai-java/argi/issues/372). Verified on 2026-11-25 against Core
[c6e453f20](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6),
including merged [#352](https://github.com/agentic-ai-java/argi/pull/352).
The source version is `2.1.0-RC2-SNAPSHOT`: **source availability does not mean that this commit
is published to Maven Central**. An identical SNAPSHOT version string does not identify identical
source. Install the required modules from this pinned commit before running the example.

| Types | Module | Package |
| --- | --- | --- |
| `ContextWindowBudget`, `ContextBudgetInterceptor` | `argi-agent-api` | `io.github.agentic.ai.agent.budget` |
| `RequestTokenEstimator`, `ApproximateRequestTokenEstimator`, `RequestTokenEstimate`, `EstimationAccuracy` | `argi-agent-api` | Same as above |
| `BudgetComponent`, `BudgetViolation`, `RequestCompactor`, `ContextWindowBudgetExceededException` | `argi-agent-api` | Same as above |
| `ToolCallPairingValidator` | `argi-agent-api` | Same as above |
| `SummarizationRequestCompactor` | `argi-agent-framework` | `io.github.agentic.ai.agent.orchestration.hook.messages` |
| Independent `ReActAgent` | `argi-agent-core` | `io.github.agentic.ai.agent.react` |

The budget interceptor is **opt-in**. It only takes effect when explicitly registered, has no compactor
by default, and does not automatically enable run-level spending limits.

## What the budget limits

Despite its name, `inputTokenLimit` is the **whole model context window**, not the usable input allowance.

```text
systemTokens + messageTokens + toolSchemaTokens + outputReserve <= inputTokenLimit
usableInputTokens() = inputTokenLimit - outputReserve
```

For example, `new ContextWindowBudget(8192, 1024)` means a window of 8192, an output reserve of
1024, and 7168 tokens available for input. Both arguments must be positive and
`outputReserve < inputTokenLimit`. **Equality is allowed; one estimated token above the window is refused.**

This is one request window for one model, not cumulative tokens, money, calls, or a deadline for a run.
A multi-model run needs a budget for each model. Do not assume that switching models automatically
adapts an existing budget.

## Wire a real Agent

This wiring uses the independent ReActAgent. `client` is the application ChatClient;
the offline fixture supplies a fake that needs no credentials.

```java
import io.github.agentic.ai.agent.budget.ContextBudgetInterceptor;
import io.github.agentic.ai.agent.budget.ContextWindowBudget;
import io.github.agentic.ai.agent.react.ReActAgent;
import java.util.List;

ContextBudgetInterceptor budget = ContextBudgetInterceptor.builder()
    .budget(new ContextWindowBudget(8192, 1024))
    // Default: ApproximateRequestTokenEstimator; no compactor
    .build();

ReActAgent agent = ReActAgent.builder(client)
    .interceptors(List.of(budget))
    .build();
```

Register the gate **after every request-rewriting interceptor (innermost)** so it sees the final request.
This is the `ContextBudgetInterceptor.ORDERING_CONTRACT`, covered by a Core chain-level test,
not non-bypassable terminal runtime enforcement. A rewrite that grows the request after the check
can bypass the gate. This guide does not promise unverified retry/fallback or other chain ordering;
add chain-level tests for those combinations.

## Estimate the whole request

`RequestTokenEstimate` separates the system message, conversation messages, disclosed tool schemas,
and output reserve. The default `ApproximateRequestTokenEstimator` uses a heuristic of four characters
per token, rounded up:

- The system message is counted separately. Conversation counting includes text, available binary
  data length, and tool-call arguments.
- Static and dynamic tool registries are merged, with static bindings winning name conflicts;
  explicit `tools(...)` selection then filters them. `tools(List.of())` disables tools, so a large
  undispatched catalog does not consume schema budget.
- Names, descriptions, and input schemas of dispatched tool bindings count. The separate tool-description
  catalog used for auxiliary tool selection does not count toward the main request.
- Explicit `GenerationOptions.maxTokens()` makes the output component
  `max(budget.outputReserve(), maxTokens)`. A smaller maxTokens does not reduce the reserve;
  a larger value can make the request exceed the window by itself.

The default accuracy is `APPROXIMATE`, not a hard provider-tokenizer guarantee, particularly for
multimodal billing or protocol overhead. Plug in a `RequestTokenEstimator` returning `EXACT` or
`CONSERVATIVE` when appropriate, but the implementation must justify that accuracy. Changing the
label does not make a heuristic exact. The gate compares the returned numbers; it does not add
a safety margin automatically.

## Overflow, compaction, and re-estimation

The actual `interceptModel` implementation at this commit executes in this order:

1. Estimate the full incoming request. If the total is at most the window, call the next handler immediately.
2. On overflow, invoke `RequestCompactor.compact(request)` once if configured. It must not return null.
3. **Only on the path that invoked a compactor**, validate its messages with `ToolCallPairingValidator` first.
4. Re-estimate the resulting request (also re-estimate the original if no compactor exists).
5. Throw `ContextWindowBudgetExceededException` if still oversized; otherwise dispatch only the compacted request.

This is not a compaction loop. The gate does not silently truncate or dispatch a still-oversized request.
Pairing validation happens **before** the second estimate. The already-fitting fast path does not
perform additional pairing validation through this interceptor.

`RequestCompactor` is a functional interface: `ModelRequest compact(ModelRequest request)`.
Applications may reduce disclosed tools, preserve essential context, or summarize safely;
removing tool results while retaining their calls is not safe. A compactor should not enlarge a request,
but the actual enforcement is that the re-estimated result fits, not a component-by-component
monotonic-size check.

### Reuse existing summarization

This adapter requires `argi-agent-framework` and a configured summary ChatClient:

```java
import io.github.agentic.ai.agent.orchestration.hook.messages.SummarizationRequestCompactor;
import io.github.agentic.ai.agent.orchestration.hook.summarization.SummarizationHook;

SummarizationHook hook = SummarizationHook.builder()
    .chatClient(summaryClient)
    .maxTokensBeforeSummary(4000)
    .messagesToKeep(4)
    .build();

ContextBudgetInterceptor budgetWithSummary = ContextBudgetInterceptor.builder()
    .budget(new ContextWindowBudget(8192, 1024))
    .compactor(new SummarizationRequestCompactor(hook))
    .build();
```

The adapter calls `hook.beforeModel(messages, config)` and rebuilds the messages. A second constructor
accepts `RunnableConfig`. It does not change the hook threshold, retained-history, or failure policy:
when no summary is needed or a failed summary retains history, it may return the original request,
which the budget gate can still reject. Shortening conversation cannot fix oversized system prompts
or tool schemas on its own.

**Summarization can make a separate model call.** Do not assume that the outer main-request gate
protects it: control the summary model window, cost, timeout, and failure policy separately.
A successful summary does not guarantee that the main request passes budget or pairing validation.

## Tool pairing and structured failures

Compacted-message pairing checks toolCallId for missing results, unknown results, duplicate calls,
duplicate results, and results preceding calls. The corresponding kinds are `MISSING_TOOL_RESULT`,
`UNKNOWN_TOOL_RESULT`, `DUPLICATE_TOOL_CALL`, `DUPLICATE_TOOL_RESULT`, and `RESULT_BEFORE_CALL`.
A failure throws `ToolCallPairingValidator.PairingException`; `violation()` provides the kind and ID.
Do not misreport it as a token overflow.

The overflow exception exposes `estimate()`, `violation()`, and `dominantComponent()`.
The current gate produces `violation().component() == TOTAL`.
Use `estimatedTokens()`, `limitTokens()`, and `excessTokens()` for structured diagnostics.
`dominantComponent()` is the largest of the four components, useful for deciding whether to reduce
tools, summarize history, or shorten output. It is not an independently exceeded component quota,
nor proof that reducing only that component will suffice. Do not parse exception text or log sensitive request bodies.

## Offline reproduction and boundaries

The repository directory `examples/context-window-budget` contains an executable Java fixture.
First install dependencies from the pinned Core checkout, then run from the website checkout:

```bash
# Core checkout; JDK 17+ / Maven 3.9.1+
mvn -B -pl :argi-agent-framework -am install -DskipTests   -Dcheckstyle.skip -Dspring-javaformat.skip

# Website checkout; first resolve plugins/dependencies, then reproduce offline
mvn -B -f examples/context-window-budget/pom.xml compile exec:java
mvn -B -o -f examples/context-window-budget/pom.xml compile exec:java
```

The fixture uses real `ReActAgent.invoke` for equality, one-token overflow, zero provider calls on
rejection, and successful/unsuccessful compaction with re-estimation. A direct interceptor assertion
checks that broken tool pairing fails before the second estimate. It also checks all four components,
tool selection, static precedence, and the maxTokens reserve floor. The fake estimator uses `EXACT`
only for deterministic fixture units, not provider token counts.

**Not covered:** live providers, multimodal tokenizer accuracy, graph-based ReactAgent,
retry/fallback composition, streaming, cancellation, or end-to-end limits on summary model calls.
The budget class at this baseline only overrides `interceptModel`; it does not provide a separate
streaming override. This is not evidence that every streaming entry point is protected.

See [Messages](./messages), [Memory and summarization](./memory),
[Hooks and interceptors](./hooks-interceptors), and the separate [Model retries](./model-retry).

## Source references

- [ContextBudgetInterceptor](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/main/java/io/github/agentic/ai/agent/budget/ContextBudgetInterceptor.java)
- [ApproximateRequestTokenEstimator](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/main/java/io/github/agentic/ai/agent/budget/ApproximateRequestTokenEstimator.java)
- [SummarizationRequestCompactor](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/main/java/io/github/agentic/ai/agent/orchestration/hook/messages/SummarizationRequestCompactor.java)
