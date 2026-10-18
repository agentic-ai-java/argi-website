---
title: Current runtime contracts
description: Build against the neutral ARGI RC2 runtime and find executable examples for its new capabilities.
---

# Current runtime contracts

This guide targets Core commit `5ec935b384d5379324ee60277ddcd3a6683a861f`,
reviewed on **2026-10-18**, with Maven version `2.1.0-RC2-SNAPSHOT`.
Build that revision locally before using these APIs. A snapshot version alone
does not identify its contents, and this guide does not imply publication to Maven Central.

## Dependencies and model adapters

Use `io.github.agentic-ai-java` coordinates. The runtime accepts
`io.github.agentic.ai.api.chat.ChatClient`, neutral messages and `ToolRegistry`.
Provider SDKs belong in an optional adapter, not in graph state or Core dependencies.

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.github.agentic-ai-java</groupId>
      <artifactId>argi-bom</artifactId>
      <version>2.1.0-RC2-SNAPSHOT</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency>
    <groupId>io.github.agentic-ai-java</groupId>
    <artifactId>argi-agent-framework</artifactId>
  </dependency>
</dependencies>
```

The pinned main revision builds three adapters: `argi-adapter-spring-ai`,
`argi-adapter-langchain4j` and `argi-adapter-google-adk`.
AgentScope's earlier neutral adapter is absent from this revision's reactor and BOM;
the example repository preserves its older example behind `legacy-agentscope`.
The Extensions AgentScope integration is a separate capability.

```java
import io.github.agentic.ai.api.chat.ChatClient;
import io.github.agentic.ai.api.chat.ChatMessage;
import io.github.agentic.ai.api.tool.ToolRegistry;
import io.github.agentic.ai.graph.agent.ReactAgent;

final class Assistant {
    static ChatMessage answer(ChatClient client, ToolRegistry tools, String question) throws Exception {
        return ReactAgent.builder()
            .name("assistant")
            .chatClient(client)
            .toolRegistry(tools)
            .validateToolArguments(true)
            .build()
            .call(question);
    }
}
```

Supply an adapter or an application implementation as `client`; this method does
not create a provider or obtain credentials. Import the matching Extensions BOM
separately only when using Extensions integrations.

## Choose a capability

| Capability | Guide | Executable example |
| --- | --- | --- |
| Tool authorization, validation, retry and business outcomes | [Tool execution policies](./tool-execution-policies.md) | `argi-agent-example/tool-execution-policies` |
| Message origin, trust ceilings and summary attribution | [Context provenance](./context-provenance.md) | `argi-agent-example/context-provenance` |
| Bounded local background work | [Background tasks](./background-tasks.md) | `argi-agent-example/background-tasks` |
| Array batches and compatibility framing | [Batched array loops](./batched-array-loops.md) | `argi-agent-example/batched-array-loop` |
| Recorded versions and worker capability checks | [Versioned recovery](../graph-core/versioned-recovery.md) | `argi-graph-example/versioned-recovery` |
| Run/task storage, fencing and atomic commits | [Run storage](../graph-core/versioned-recovery.md#run-storage-and-execution-are-separate) | `argi-graph-example/recoverable-runs` |

All paths are in [argi-example](https://github.com/agentic-ai-java/argi-example).
The five new modules require no model credentials or external services. The tool-selection
and retry entry points deliberately inject failures; they do not measure provider behavior.

After bootstrapping matching Core/Extensions sources and installing the example reactor:

```shell
bash tools/run.sh argi-agent-example/tool-execution-policies
bash tools/run.sh argi-agent-example/context-provenance
bash tools/run.sh argi-agent-example/background-tasks
bash tools/run.sh argi-agent-example/batched-array-loop
bash tools/run.sh argi-graph-example/versioned-recovery
```

Existing `invoke` and `stream` calls do not automatically enable these opt-in policies.
Whole-run durable execution, task-completion hooks, AgentResult delivery and tool-context
patch validation are not part of this pinned main revision; open proposals must not be
treated as available runtime APIs.
