---
title: A2A Agent
sidebar_label: A2A Agent
description: 了解如何使用 A2A 协议把远程 Agent 接入 ARGI，包括 AgentCard 获取、远程调用和作为图节点编排。
keywords: [A2A, A2A Agent, Agent-to-Agent, 分布式Agent, 远程Agent, AgentCard, 远程调用]
---

# A2A Agent

Agent2Agent（A2A）协议用于描述和调用远程智能体。ARGI 在 `argi-agent-framework` 中提供了 A2A 客户端侧封装，可以把远程 Agent 包装成 `A2aRemoteAgent`，再像本地 Agent 一样调用或放入 Graph 编排。

当前 refactor 分支可确认的核心类型包括：

- `A2aRemoteAgent`：把远程 A2A Agent 包装为 ARGI Agent。
- `AgentCardProvider`：抽象 AgentCard 的获取方式。
- `RemoteAgentCardProvider`：从远程 URL 获取 AgentCard。
- `AgentCardWrapper`：封装 A2A SDK 的 `AgentCard`，暴露名称、描述、能力、技能等元数据。

> 说明：当前 refactor 分支没有发现 `argi-starter-a2a-nacos` 或同等 A2A Nacos starter。Nacos MCP starter 存在，但它面向 MCP 注册、发现、网关和路由，不等同于 A2A AgentCard 的自动注册与发现。

## 添加依赖

`A2aRemoteAgent` 位于 Agent Framework 模块中。通过 ARGI BOM 管理版本后，引入 `argi-agent-framework` 即可使用。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.github.agentic-ai</groupId>
            <artifactId>argi-bom</artifactId>
            <version>${argi.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>argi-agent-framework</artifactId>
    </dependency>
</dependencies>
```

## 调用远程 A2A Agent

如果远程服务暴露了 A2A AgentCard，可以使用 `RemoteAgentCardProvider.newProvider(url)` 获取 AgentCard，再构建 `A2aRemoteAgent`。

<Code
  language="java"
  title="通过远程 AgentCard 调用 A2A Agent"
>
{`import io.github.agentic.ai.graph.OverAllState;
import io.github.agentic.ai.graph.agent.a2a.A2aRemoteAgent;
import io.github.agentic.ai.graph.agent.a2a.AgentCardProvider;
import io.github.agentic.ai.graph.agent.a2a.RemoteAgentCardProvider;

import java.util.Optional;

public class RemoteA2aAgentExample {

    public Optional<String> invokeRemoteAgent(String question) {
        AgentCardProvider provider = RemoteAgentCardProvider.newProvider("https://agent.example.com");

        A2aRemoteAgent remoteAgent = A2aRemoteAgent.builder()
                .name("research_agent")
                .description("Remote research agent")
                .instruction("Return a concise answer and include relevant evidence.")
                .agentCardProvider(provider)
                .build();

        Optional<OverAllState> result = remoteAgent.invoke(question);
        return result.flatMap(state -> state.value("output", String.class));
    }
}`}
</Code>

`A2aRemoteAgent.Builder` 会在构建时读取 AgentCard。如果 `AgentCardProvider.supportGetAgentCardByName()` 返回 `true`，会按 Agent 名称获取 AgentCard；否则调用无参的 `getAgentCard()`。

## Builder 选项

`A2aRemoteAgent.Builder` 支持以下常用选项：

| 方法 | 说明 |
| --- | --- |
| `name(String)` | Agent 名称。不能为空。 |
| `description(String)` | Agent 能力描述。不能为空。 |
| `instruction(String)` | 发送给远程 Agent 的附加指令。 |
| `agentCard(AgentCard)` | 直接传入 A2A SDK 的 `AgentCard`。 |
| `agentCardProvider(AgentCardProvider)` | 延迟获取或自定义发现 AgentCard。 |
| `includeContents(boolean)` | 控制远程调用时是否包含上下文内容，默认 `true`。 |
| `shareState(boolean)` | 控制是否共享状态，默认 `true`。 |
| `compileConfig(CompileConfig)` | 设置底层 Graph 编译配置。 |
| `outputKey(String)` | 设置输出写入的状态键，默认 `output`。 |

构建时必须提供 `agentCard(...)` 或 `agentCardProvider(...)` 之一。

## 作为 Graph 节点使用

`A2aRemoteAgent` 继承 Agent 基类，也可以通过 `asNode(...)` 作为子图节点加入 `StateGraph`。这适合把远程 Agent 纳入本地编排流程。

<Code
  language="java"
  title="把 A2A Remote Agent 加入 StateGraph"
>
{`import io.github.agentic.ai.graph.StateGraph;
import io.github.agentic.ai.graph.agent.a2a.A2aRemoteAgent;
import io.github.agentic.ai.graph.agent.a2a.RemoteAgentCardProvider;

A2aRemoteAgent remoteAgent = A2aRemoteAgent.builder()
        .name("research_agent")
        .description("Remote research agent")
        .agentCardProvider(RemoteAgentCardProvider.newProvider("https://agent.example.com"))
        .build();

StateGraph graph = new StateGraph("a2a_workflow");
graph.addNode("remote_research", remoteAgent.asNode(true, false));
graph.addEdge(StateGraph.START, "remote_research");
graph.addEdge("remote_research", StateGraph.END);
graph.compile();`}
</Code>

## 使用建议

- 如果只需要调用一个远程 Agent，直接使用 `A2aRemoteAgent.invoke(...)`。
- 如果需要把远程 Agent 编入本地流程，使用 `asNode(...)` 加入 `StateGraph`。
- 如果 AgentCard 来源不是固定 URL，可以实现 `AgentCardProvider`，从配置中心、数据库或服务发现系统读取 AgentCard。
- 如果需要 Nacos 联动，当前可确认的是 extensions 的 MCP/Nacos 能力；A2A AgentCard 的 Nacos 自动注册与发现需要以对应 starter 或配置类落地后再写入文档。
