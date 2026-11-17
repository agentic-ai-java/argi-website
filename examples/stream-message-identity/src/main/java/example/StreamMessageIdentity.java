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
import io.github.agentic.ai.agent.react.ReActAgent;
import io.github.agentic.ai.api.chat.*;
import io.github.agentic.ai.api.tool.*;
import io.github.agentic.ai.runtime.execution.*;
import java.time.Clock;
import java.util.*;
import java.util.concurrent.*;

/** Offline executable example: no provider adapter, network, or credentials. */
public final class StreamMessageIdentity {
    // Each instance belongs to ONE invocation. Never share it across runs.
    static final class MessageView implements Flow.Subscriber<AgentEvent> {
        final Map<String, String> text = new LinkedHashMap<>();
        final Set<String> snapshots = new HashSet<>();
        final CompletableFuture<Void> completed = new CompletableFuture<>();
        AgentOutcome outcome;
        public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
        public void onNext(AgentEvent event) {
            if (event instanceof AgentEvent.MessageDelta delta) {
                text.merge(delta.messageId(), delta.text(), String::concat);
            } else if (event instanceof AgentEvent.Message message) {
                // A snapshot is the complete value, NOT another delta.
                // A later repair can replace this same key again.
                text.put(message.messageId(), message.message().text());
                snapshots.add(message.messageId());
            } else if (event instanceof AgentEvent.Finished done) {
                outcome = done.outcome();
            }
        }
        public void onError(Throwable error) { completed.completeExceptionally(error); }
        public void onComplete() { completed.complete(null); }
    }

    record Turn(List<ChatEvent> events, RuntimeException failure) {}
    static ChatResponse response(String text, List<ToolCall> calls) {
        return new ChatResponse(null, "offline", List.of(ChatMessage.assistant(text, calls)),
                calls, FinishReason.STOP, new Usage(1L, 1L, 2L), Map.of());
    }
    static Turn turn(String text, List<ToolCall> calls) {
        return new Turn(List.of(ChatEvent.textDelta(text.substring(0, 1)),
                ChatEvent.textDelta(text.substring(1)), ChatEvent.response(response(text, calls))), null);
    }
    static ChatClient client(List<Turn> turns) {
        Queue<Turn> queue = new ArrayDeque<>(turns);
        return new ChatClient() {
            public CompletionStage<ChatResponse> call(ChatRequest request) {
                return CompletableFuture.failedFuture(new UnsupportedOperationException("stream only"));
            }
            public ChatClientCapabilities capabilities() { return ChatClientCapabilities.basic(); }
            public Flow.Publisher<ChatEvent> stream(ChatRequest request) {
                return subscriber -> {
                    final Turn script;
                    synchronized (queue) { script = queue.remove(); }
                    subscriber.onSubscribe(new Flow.Subscription() {
                        boolean sent;
                        volatile boolean cancelled;
                        public void request(long n) {
                            if (sent || cancelled) return;
                            sent = true;
                            if (n <= 0) { subscriber.onError(new IllegalArgumentException("positive demand required")); return; }
                            // Fixture subscriber requests unbounded demand.
                            for (ChatEvent event : script.events()) {
                                if (cancelled) return;
                                subscriber.onNext(event);
                            }
                            if (cancelled) return;
                            if (script.failure() == null) subscriber.onComplete();
                            else subscriber.onError(script.failure());
                        }
                        public void cancel() { cancelled = true; }
                    });
                };
            }
        };
    }
    static AgentExecutionContext context(String runId) {
        var trusted = TrustedExecutionContext.builder()
                .tenant(new TenantReference("example", "tenant"))
                .principal(new PrincipalReference("example", "user"))
                .runId(runId).correlationId(runId)
                .budget(ExecutionBudget.unlimited()).delegationScope(DelegationScope.none()).build();
        return new AgentExecutionContext(trusted, Clock.systemUTC());
    }
    static MessageView run(ReActAgent agent, String runId, boolean expectFailure) throws Exception {
        MessageView view = new MessageView();
        try (var context = context(runId)) {
            agent.stream(AgentRequest.messages(List.of(ChatMessage.user("hello"))), context).subscribe(view);
            try {
                view.completed.get(5, TimeUnit.SECONDS);
                check(!expectFailure, "expected a failed stream");
                check(view.outcome != null, "missing Finished outcome");
            } catch (ExecutionException error) {
                if (!expectFailure) throw error;
                check("fixture failure".equals(error.getCause().getMessage()), "unexpected failure");
            }
        }
        return view;
    }
    static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) throws Exception {
        ToolCall call = new ToolCall("lookup-1", "lookup", "{}");
        Tool tool = new Tool() {
            public ToolDefinition definition() { return new ToolDefinition("lookup", "offline lookup", "{}"); }
            public CompletionStage<ToolResult> execute(ToolCall call, ToolContext context) {
                return CompletableFuture.completedFuture(ToolResult.text("found"));
            }
        };
        ReActAgent multi = ReActAgent.builder(client(List.of(turn("Look", List.of(call)), turn("Done", List.of()))))
                .streamModel(true).tools(new ToolRegistry(List.of(tool))).build();
        MessageView view = run(multi, "multi", false);
        check(view.text.equals(Map.of("model-0", "Look", "tool-lookup-1", "found", "model-1", "Done")),
                "deltas/snapshots duplicated text or mixed turns: " + view.text);
        check(view.snapshots.containsAll(view.text.keySet()), "unsealed successful turn");

        ReActAgent repeated = ReActAgent.builder(client(List.of(turn("First", List.of()), turn("Second", List.of()))))
                .streamModel(true).build();
        MessageView first = run(repeated, "first", false);
        MessageView second = run(repeated, "second", false);
        check(first.text.equals(Map.of("model-0", "First")), "first run changed");
        check(second.text.equals(Map.of("model-0", "Second")), "cross-run text leaked");

        ReActAgent failing = ReActAgent.builder(client(List.of(new Turn(List.of(ChatEvent.textDelta("partial")),
                new IllegalStateException("fixture failure"))))).streamModel(true).build();
        MessageView failed = run(failing, "failed", true);
        check(failed.text.equals(Map.of("model-0", "partial")), "partial text lost");
        check(failed.snapshots.isEmpty(), "failed turn incorrectly sealed");
        System.out.println("PASS: turn identity, snapshot replacement, invocation isolation, failure projection");
    }
}
