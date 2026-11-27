/*
 * Copyright 2026 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy at https://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package example;

import io.github.agentic.ai.agent.*;
import io.github.agentic.ai.agent.budget.*;
import io.github.agentic.ai.agent.interceptor.*;
import io.github.agentic.ai.agent.react.ReActAgent;
import io.github.agentic.ai.api.chat.*;
import io.github.agentic.ai.api.tool.*;
import io.github.agentic.ai.runtime.execution.*;
import java.time.Clock;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Deterministic offline fixture; counts below are fixture units, not provider tokens. */
public final class ContextWindowBudgetExample {
    static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }

    static final class FakeClient implements ChatClient {
        final AtomicInteger calls = new AtomicInteger();
        volatile ChatRequest lastRequest;
        public CompletionStage<ChatResponse> call(ChatRequest request) {
            calls.incrementAndGet();
            lastRequest = request;
            return CompletableFuture.completedFuture(new ChatResponse(null, "offline",
                    List.of(ChatMessage.assistant("ok")), List.of(), FinishReason.STOP,
                    new Usage(1L, 1L, 2L), Map.of()));
        }
        public ChatClientCapabilities capabilities() { return ChatClientCapabilities.basic(); }
        public Flow.Publisher<ChatEvent> stream(ChatRequest request) {
            throw new UnsupportedOperationException("call-only fixture");
        }
    }

    static AgentExecutionContext context() {
        var trusted = TrustedExecutionContext.builder()
                .tenant(new TenantReference("example", "tenant"))
                .principal(new PrincipalReference("example", "user"))
                .runId("budget-example").correlationId("budget-example")
                .budget(ExecutionBudget.unlimited()).delegationScope(DelegationScope.none()).build();
        return new AgentExecutionContext(trusted, Clock.systemUTC());
    }

    static Throwable invoke(FakeClient client, ContextBudgetInterceptor gate) throws Exception {
        var agent = ReActAgent.builder(client).interceptors(List.of(gate)).build();
        try (var context = context()) {
            var outcome = agent.invoke(AgentRequest.messages(List.of(ChatMessage.user("hi"))), context)
                    .get(10, TimeUnit.SECONDS);
            check(outcome.status() == AgentOutcome.Status.COMPLETED, "unexpected outcome " + outcome.status());
            return null;
        } catch (ExecutionException failure) {
            return failure.getCause();
        }
    }

    static boolean hasCause(Throwable failure, Class<? extends Throwable> type) {
        for (Throwable next = failure; next != null; next = next.getCause()) {
            if (type.isInstance(next)) return true;
        }
        return false;
    }

    static ContextBudgetInterceptor gate(ContextWindowBudget budget, RequestTokenEstimator estimator,
            RequestCompactor compactor) {
        return ContextBudgetInterceptor.builder().budget(budget).estimator(estimator).compactor(compactor).build();
    }

    static Tool tool(String name, String schema) {
        return new Tool() {
            public ToolDefinition definition() { return new ToolDefinition(name, "desc", schema); }
            public CompletionStage<ToolResult> execute(ToolCall call, ToolContext context) {
                throw new AssertionError("fixture tool must not execute");
            }
        };
    }

    static void estimatorComponents() {
        var budget = new ContextWindowBudget(100, 10);
        var request = ModelRequest.builder().systemMessage(ChatMessage.system("abcd"))
                .messages(List.of(ChatMessage.user("abcdefgh")))
                .toolRegistry(new ToolRegistry(List.of(tool("tool", "{}"))))
                .dynamicToolRegistry(new ToolRegistry(List.of(tool("tool", "x".repeat(400)), tool("extra", "{}"))))
                .tools(List.of("tool")).build();
        var estimator = new ApproximateRequestTokenEstimator();
        var estimate = estimator.estimate(request, budget);
        check(estimate.systemTokens() == 1 && estimate.messageTokens() == 2, "system and messages");
        check(estimate.toolSchemaTokens() == 3 && estimate.outputReserve() == 10, "schema and reserve");
        check(estimate.inputTokens() == 6 && estimate.totalTokens() == 16, "all four components");
        check(estimate.accuracy() == EstimationAccuracy.APPROXIMATE, "heuristic accuracy");
        var noTools = ModelRequest.builder(request).tools(List.of()).build();
        check(estimator.estimate(noTools, budget).toolSchemaTokens() == 0, "empty selection disables schemas");
        var demanded = ModelRequest.builder(request).options(GenerationOptions.builder().maxTokens(20).build()).build();
        check(estimator.estimate(demanded, budget).outputReserve() == 20, "explicit output demand");
        var lower = ModelRequest.builder(request).options(GenerationOptions.builder().maxTokens(5).build()).build();
        check(estimator.estimate(lower, budget).outputReserve() == 10, "reserve is a floor");
        check(budget.usableInputTokens() == 90, "usable input");
        System.out.println("PASS: all components, tool selection/static precedence, maxTokens floor");
    }

    static void boundaryThroughAgent() throws Exception {
        RequestTokenEstimator fixed = (request, budget) -> new RequestTokenEstimate(20, 30, 10,
                budget.outputReserve(), EstimationAccuracy.EXACT);
        var fitting = new FakeClient();
        check(invoke(fitting, gate(new ContextWindowBudget(70, 10), fixed, null)) == null, "equality allowed");
        check(fitting.calls.get() == 1, "equality calls provider once");
        var rejected = new FakeClient();
        var failure = invoke(rejected, gate(new ContextWindowBudget(69, 10), fixed, null));
        check(hasCause(failure, ContextWindowBudgetExceededException.class), "over by one rejected");
        check(rejected.calls.get() == 0, "rejected request must not call provider");
        System.out.println("PASS: ReActAgent equality allowed; over by one rejected; provider calls = 0");
    }

    static void compactionThroughAgent() throws Exception {
        var estimates = new AtomicInteger();
        var compactions = new AtomicInteger();
        RequestTokenEstimator estimator = (request, budget) -> {
            estimates.incrementAndGet();
            boolean compacted = request.getMessages().size() == 1
                    && "short".equals(request.getMessages().get(0).text());
            return new RequestTokenEstimate(2, compacted ? 3 : 40, 1, budget.outputReserve(), EstimationAccuracy.EXACT);
        };
        RequestCompactor shrink = request -> {
            compactions.incrementAndGet();
            return ModelRequest.builder(request).messages(List.of(ChatMessage.user("short"))).build();
        };
        var client = new FakeClient();
        check(invoke(client, gate(new ContextWindowBudget(20, 5), estimator, shrink)) == null, "compaction recovers");
        check(estimates.get() == 2 && compactions.get() == 1 && client.calls.get() == 1,
                "estimate -> compact -> validate -> re-estimate -> dispatch");
        check(client.lastRequest.messages().stream().anyMatch(message -> "short".equals(message.text())),
                "provider receives compacted messages");
        estimates.set(0);
        var rejected = new FakeClient();
        var failure = invoke(rejected, gate(new ContextWindowBudget(20, 5), estimator, request -> request));
        check(hasCause(failure, ContextWindowBudgetExceededException.class), "unchanged compaction rejected");
        check(estimates.get() == 2 && rejected.calls.get() == 0, "re-estimate then reject before provider");
        System.out.println("PASS: ReActAgent compaction re-estimates; success 1 call; failure 0 calls");
    }

    static void pairingAndDiagnostics() {
        var call = ChatMessage.assistant("calling", List.of(new ToolCall("call-1", "tool", "{}")));
        var result = ChatMessage.tool("call-1", "tool", "result");
        var request = ModelRequest.builder().messages(List.of(call, result)).build();
        var estimates = new AtomicInteger();
        var dispatches = new AtomicInteger();
        RequestTokenEstimator over = (r, b) -> {
            estimates.incrementAndGet();
            return new RequestTokenEstimate(1, 30, 1, b.outputReserve(), EstimationAccuracy.EXACT);
        };
        var gate = gate(new ContextWindowBudget(20, 5), over,
                r -> ModelRequest.builder(r).messages(List.of(call)).build());
        try {
            gate.interceptModel(request, r -> {
                dispatches.incrementAndGet();
                return ModelResponse.of(ChatMessage.assistant("unexpected"));
            });
            throw new AssertionError("broken pairing must fail");
        } catch (ToolCallPairingValidator.PairingException failure) {
            check(failure.violation().kind() == ToolCallPairingValidator.Kind.MISSING_TOOL_RESULT, "pairing kind");
            check(estimates.get() == 1 && dispatches.get() == 0, "pairing checked before second estimate");
        }
        var estimate = new RequestTokenEstimate(1, 30, 1, 5, EstimationAccuracy.EXACT);
        var failure = ContextWindowBudgetExceededException.of(estimate, new ContextWindowBudget(20, 5));
        check(failure.violation().component() == BudgetComponent.TOTAL, "violation is total");
        check(failure.violation().excessTokens() == 17, "excess tokens");
        check(failure.dominantComponent() == BudgetComponent.MESSAGES, "dominant part is diagnostic");
        System.out.println("PASS: broken pairing rejected before re-estimate; no dispatch; structured diagnostics");
    }

    public static void main(String[] args) throws Exception {
        estimatorComponents();
        boundaryThroughAgent();
        compactionThroughAgent();
        pairingAndDiagnostics();
        System.out.println("PASS: context-window-budget offline fixture");
    }
}
