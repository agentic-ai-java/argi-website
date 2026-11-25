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
import io.github.agentic.ai.agent.interceptor.*;
import io.github.agentic.ai.agent.orchestration.interceptor.modelfallback.ModelFallbackInterceptor;
import io.github.agentic.ai.agent.orchestration.interceptor.modelretry.ModelRetryInterceptor;
import io.github.agentic.ai.agent.react.ReActAgent;
import io.github.agentic.ai.agent.retry.TypeBasedModelCallFailureClassifier;
import io.github.agentic.ai.api.chat.*;
import io.github.agentic.ai.runtime.execution.*;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Offline executable example: no provider adapter, network, or credentials. */
public final class StreamingFallbackExample {

    /** One scripted model turn: events to emit, then an optional failure. */
    record Step(List<String> deltas, String reply, RuntimeException failure) {
        static Step ok(String reply) { return new Step(List.of(reply), reply, null); }
        static Step fail(RuntimeException failure) { return new Step(List.of(), null, failure); }
        static Step partial(String delta, RuntimeException failure) { return new Step(List.of(delta), null, failure); }
    }

    static ChatResponse response(String text) {
        return new ChatResponse(null, "offline", List.of(ChatMessage.assistant(text, List.of())), List.of(),
                FinishReason.STOP, new Usage(1L, 1L, 2L), Map.of());
    }

    /** Scripted client that serves both call() and stream(); each call consumes one step. */
    static final class ScriptedClient implements ChatClient {
        final String name;
        final Queue<Step> steps;
        final AtomicInteger calls = new AtomicInteger();
        ScriptedClient(String name, Step... steps) { this.name = name; this.steps = new ArrayDeque<>(List.of(steps)); }
        Step next() {
            calls.incrementAndGet();
            synchronized (steps) {
                Step step = steps.poll();
                if (step == null) throw new AssertionError(name + " called more often than scripted");
                return step;
            }
        }
        public CompletionStage<ChatResponse> call(ChatRequest request) {
            Step step = next();
            return step.failure() != null ? CompletableFuture.failedFuture(step.failure())
                    : CompletableFuture.completedFuture(response(step.reply()));
        }
        public ChatClientCapabilities capabilities() { return ChatClientCapabilities.basic(); }
        public Flow.Publisher<ChatEvent> stream(ChatRequest request) {
            Step step = next();
            return subscriber -> subscriber.onSubscribe(new Flow.Subscription() {
                boolean sent;
                public void request(long n) {
                    if (sent) return;
                    sent = true;
                    for (String delta : step.deltas()) subscriber.onNext(ChatEvent.textDelta(delta));
                    if (step.failure() != null) { subscriber.onError(step.failure()); return; }
                    subscriber.onNext(ChatEvent.response(response(step.reply())));
                    subscriber.onComplete();
                }
                public void cancel() { sent = true; }
            });
        }
    }

    /** Collects what a UI would see: deltas appended and snapshots per message ID. */
    static final class View implements Flow.Subscriber<AgentEvent> {
        final Map<String, String> deltas = new LinkedHashMap<>();
        final Map<String, String> snapshots = new LinkedHashMap<>();
        final CompletableFuture<Void> done = new CompletableFuture<>();
        public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
        public void onNext(AgentEvent event) {
            if (event instanceof AgentEvent.MessageDelta d) deltas.merge(d.messageId(), d.text(), String::concat);
            else if (event instanceof AgentEvent.Message m) snapshots.put(m.messageId(), m.message().text());
        }
        public void onError(Throwable error) { done.completeExceptionally(error); }
        public void onComplete() { done.complete(null); }
    }

    static AgentExecutionContext context(String runId) {
        var trusted = TrustedExecutionContext.builder()
                .tenant(new TenantReference("example", "tenant"))
                .principal(new PrincipalReference("example", "user"))
                .runId(runId).correlationId(runId)
                .budget(ExecutionBudget.unlimited()).delegationScope(DelegationScope.none()).build();
        return new AgentExecutionContext(trusted, Clock.systemUTC());
    }

    /** Runs the agent once; returns the view and the terminal failure (null on success). */
    static Map.Entry<View, Throwable> run(ReActAgent agent, String runId) throws Exception {
        View view = new View();
        try (var context = context(runId)) {
            agent.stream(AgentRequest.messages(List.of(ChatMessage.user("hi"))), context).subscribe(view);
            try {
                view.done.get(10, TimeUnit.SECONDS);
                return new AbstractMap.SimpleEntry<>(view, null);
            } catch (ExecutionException error) {
                return new AbstractMap.SimpleEntry<>(view, error.getCause());
            } catch (CancellationException cancelled) {
                // CompletableFuture#get throws a cancellation directly, not wrapped.
                return new AbstractMap.SimpleEntry<>(view, cancelled);
            }
        }
    }

    static ModelFallbackInterceptor fallback(ChatClient... clients) {
        return ModelFallbackInterceptor.builder().fallbackClients(List.of(clients)).build();
    }

    static ModelRetryInterceptor retry() {
        return ModelRetryInterceptor.builder().maxAttempts(3).initialDelay(0)
                .failureClassifier(new TypeBasedModelCallFailureClassifier()).build();
    }

    static RuntimeException transientFailure() { return new UncheckedIOException(new IOException("reset")); }

    static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    /** Drives the interceptor directly with a streaming handler, as the graph engine does. */
    static List<String> streamThroughInterceptor(ModelFallbackInterceptor interceptor, ScriptedClient primary)
            throws Exception {
        ModelCallHandler handler = request -> {
            ChatClient client = request.getChatClient() != null ? request.getChatClient() : primary;
            return ModelResponse.stream(client.stream(new ChatRequest(request.getMessages(), List.of(), null, Map.of())));
        };
        ModelRequest request = ModelRequest.builder().messages(List.of(ChatMessage.user("hi"))).build();
        ModelResponse response = interceptor.interceptModel(request, handler);
        check(response.isStreaming(), "a streaming candidate must stay streaming");
        List<String> seen = new CopyOnWriteArrayList<>();
        CompletableFuture<Void> done = new CompletableFuture<>();
        response.getStream().subscribe(new Flow.Subscriber<>() {
            public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
            public void onNext(ChatEvent event) {
                seen.add(event.type() == ChatEvent.Type.TEXT_DELTA ? "delta:" + event.text() : event.type().name());
            }
            public void onError(Throwable error) { seen.add("error:" + error.getMessage()); done.complete(null); }
            public void onComplete() { seen.add("complete"); done.complete(null); }
        });
        done.get(10, TimeUnit.SECONDS);
        return seen;
    }

    public static void main(String[] args) throws Exception {
        // 1. Non-streaming: the primary fails, the first fallback answers.
        var primary1 = new ScriptedClient("primary", Step.fail(new IllegalStateException("primary down")));
        var backup1 = new ScriptedClient("backup", Step.ok("from backup"));
        var r1 = run(ReActAgent.builder(primary1).interceptors(List.of(fallback(backup1))).build(), "fallback");
        check(r1.getValue() == null, "fallback should succeed: " + r1.getValue());
        check(r1.getKey().snapshots.equals(Map.of("model-0", "from backup")), "unexpected snapshot " + r1.getKey().snapshots);
        check(primary1.calls.get() == 1 && backup1.calls.get() == 1, "one call each expected");

        // 2. Every candidate fails: the error names the sequence and keeps the last cause.
        var primary2 = new ScriptedClient("primary", Step.fail(new IllegalStateException("p")));
        var backup2 = new ScriptedClient("backup", Step.fail(new IllegalStateException("last")));
        Throwable failure2 = run(ReActAgent.builder(primary2).interceptors(List.of(fallback(backup2))).build(), "all").getValue();
        check(failure2 != null && failure2.getMessage().startsWith("All clients failed after 2 attempts (primary, fallback-1)"),
                "unexpected failure " + failure2);
        check(failure2.getCause() != null && "last".equals(failure2.getCause().getMessage()), "last cause not kept");

        // 3. A cancellation is terminal: no fallback call is made.
        var primary3 = new ScriptedClient("primary", Step.fail(new CancellationException("caller aborted")));
        var backup3 = new ScriptedClient("backup");
        Throwable failure3 = run(ReActAgent.builder(primary3).interceptors(List.of(fallback(backup3))).build(), "cancel").getValue();
        check(failure3 instanceof CancellationException, "cancellation must stay a cancellation: " + failure3);
        check(backup3.calls.get() == 0, "a cancelled call must not fail over");

        // 4. Recommended order: fallback outermost, retry inside. Each model is retried
        //    to exhaustion (3 calls) before the next candidate is tried.
        var primary4 = new ScriptedClient("primary", Step.fail(transientFailure()), Step.fail(transientFailure()),
                Step.fail(transientFailure()));
        var backup4 = new ScriptedClient("backup", Step.ok("ok"));
        check(run(ReActAgent.builder(primary4).interceptors(List.of(fallback(backup4), retry())).build(), "order")
                .getValue() == null, "ordered chain should recover");
        check(primary4.calls.get() == 3 && backup4.calls.get() == 1,
                "expected 3 primary + 1 backup calls, got " + primary4.calls.get() + " + " + backup4.calls.get());

        // 5. Interceptor contract on a streaming response (what the graph engine passes):
        //    a failure before any event switches to the next candidate.
        var primary5 = new ScriptedClient("primary", Step.fail(new IllegalStateException("before output")));
        var backup5 = new ScriptedClient("backup", Step.ok("B"));
        List<String> seen5 = streamThroughInterceptor(fallback(backup5), primary5);
        check(seen5.equals(List.of("delta:B", "RESPONSE", "complete")), "expected a clean switch, got " + seen5);

        // 6. ...and a failure after an event terminates the stream without switching.
        var primary6 = new ScriptedClient("primary", Step.partial("Draft", new IllegalStateException("mid-stream")));
        var backup6 = new ScriptedClient("backup");
        List<String> seen6 = streamThroughInterceptor(fallback(backup6), primary6);
        check(seen6.equals(List.of("delta:Draft", "error:mid-stream")), "expected termination, got " + seen6);
        check(backup6.calls.get() == 0, "no switch after output");

        // 7. Independent ReActAgent with streamModel(true), failure before any delta:
        //    the switch is clean and only the backup's text is visible.
        var primary7 = new ScriptedClient("primary", Step.fail(new IllegalStateException("before output")));
        var backup7 = new ScriptedClient("backup", Step.ok("Done"));
        var r7 = run(ReActAgent.builder(primary7).streamModel(true).interceptors(List.of(fallback(backup7))).build(), "s7");
        check(r7.getValue() == null, "should succeed: " + r7.getValue());
        check(r7.getKey().deltas.equals(Map.of("model-0", "Done")), "unexpected deltas " + r7.getKey().deltas);

        // 8. Independent ReActAgent with streamModel(true), failure AFTER a delta.
        //    This engine collects the provider stream inside the model call and hands the
        //    interceptor a non-streaming response, so the first-event boundary of
        //    scenario 6 does not apply: the backup is called, its deltas are appended to
        //    the same message ID, and the final snapshot replaces the text.
        var primary8 = new ScriptedClient("primary", Step.partial("Draft", new IllegalStateException("mid-stream")));
        var backup8 = new ScriptedClient("backup", Step.ok("Done"));
        var r8 = run(ReActAgent.builder(primary8).streamModel(true).interceptors(List.of(fallback(backup8))).build(), "s8");
        check(r8.getValue() == null, "should succeed: " + r8.getValue());
        check(backup8.calls.get() == 1, "backup should be called");
        check(r8.getKey().deltas.equals(Map.of("model-0", "DraftDone")), "observed deltas " + r8.getKey().deltas);
        check(r8.getKey().snapshots.equals(Map.of("model-0", "Done")), "observed snapshots " + r8.getKey().snapshots);

        // 9. The same applies to ModelRetryInterceptor on this engine: a transient
        //    failure after a delta is retried and the new deltas are appended.
        var primary9 = new ScriptedClient("primary", Step.partial("Draft", transientFailure()), Step.ok("Done"));
        var r9 = run(ReActAgent.builder(primary9).streamModel(true).interceptors(List.of(retry())).build(), "s9");
        check(r9.getValue() == null, "should succeed: " + r9.getValue());
        check(primary9.calls.get() == 2, "retry should call again after output");
        check(r9.getKey().deltas.equals(Map.of("model-0", "DraftDone")), "observed deltas " + r9.getKey().deltas);
        check(r9.getKey().snapshots.equals(Map.of("model-0", "Done")), "observed snapshots " + r9.getKey().snapshots);

        System.out.println("PASS: non-streaming fallback, exhaustion, cancellation, retry ordering,"
                + " stream switch boundary, independent ReAct streaming before/after output, retry after output");
    }
}
