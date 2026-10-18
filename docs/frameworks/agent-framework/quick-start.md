---
title: Agent Framework quick start
sidebar_label: Quick start
description: Create a ReactAgent with the neutral ARGI ChatClient contract.
---

# Agent Framework quick start

`ReactAgent` accepts an ARGI `ChatClient` and neutral `ToolRegistry`.
Wrap a native provider client in an adapter before passing it to the runtime.
See [versions](../../versions.md) for the exact RC2 source baseline.

## Add the runtime

After importing `io.github.agentic-ai-java:argi-bom`, add:

```xml
<dependency>
  <groupId>io.github.agentic-ai-java</groupId>
  <artifactId>argi-agent-framework</artifactId>
</dependency>
```

The agent framework brings Graph Core transitively. Choose one optional model
adapter for your provider; credentials belong in environment configuration.

## Create an agent

```java
import io.github.agentic.ai.api.chat.ChatClient;
import io.github.agentic.ai.api.chat.ChatMessage;
import io.github.agentic.ai.api.tool.ToolRegistry;
import io.github.agentic.ai.graph.agent.ReactAgent;

public final class AssistantService {
    private final ReactAgent agent;

    public AssistantService(ChatClient client, ToolRegistry tools) {
        this.agent = ReactAgent.builder()
            .name("assistant")
            .chatClient(client)
            .toolRegistry(tools)
            .validateToolArguments(true)
            .build();
    }

    public ChatMessage answer(String question) throws Exception {
        return agent.call(question);
    }
}
```

The application supplies a configured neutral client and registered tools. For Spring AI,
wrap its native `ChatModel` or `ChatClient` in `SpringAiChatClientAdapter`;
native callbacks require `SpringAiToolAdapter`. LangChain4j and Google ADK have
separate adapters. Do not pass a native model to the removed `chatModel(...)` builder entry.

## Add execution policies

Argument validation is explicitly enabled above. Authorization, effect-aware retries,
business-result mapping and tool-selection failure policies are separate opt-in
features. Read [tool execution policies](./tool-execution-policies.md) before composing
them. Tool selection does not confer execution permission.

For checkpointed conversations, supply a stable `RunnableConfig.threadId(...)`.
Attach authenticated identity through `trustedExecutionContext(...)`, rather than
putting caller-controlled identity values into message history.

## Run complete examples

[Current runtime contracts](./runtime-contracts.md) maps new capabilities to executable
modules in `argi-example`. Local examples inspect policy decisions without a provider.
The existing `react-tools` and adapter examples demonstrate real-model configuration
and require their documented environment variables.
