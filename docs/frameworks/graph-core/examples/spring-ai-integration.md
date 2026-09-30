---
title: Spring AI 集成 Graph
sidebar_label: Spring AI 集成 Graph
description: 学习如何在 Graph 中集成 Spring AI 实现 LLM 节点与流式输出能力。
keywords: [Spring AI, LLM Streaming, 流式输出, Graph, 智能体图]
---

# Spring AI 集成 Graph


## 使用流式 ChatClient

ARGI 支持通过 `ChatClient` 进行流式输出。

<Code
  language="java"
  title="使用流式 ChatClient"
>
{`import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import reactor.core.publisher.Flux;

// 使用流式输出
Flux<ChatResponse> flux = chatClient.prompt()
        .user("tell me a joke")
        .stream()
        .chatResponse();

// 订阅流式响应
flux.subscribe(
        response -> {
            String content = response.getResult().getOutput().getText();
            System.out.print(content);
        },
        error -> System.err.println("Error: " + error.getMessage()),
        () -> System.out.println("\nStream completed")
);`}
</Code>

### 使用 Reactor 的阻塞式处理

<Code
  language="java"
  title="使用 Reactor 的阻塞式处理"
>
{`Flux<ChatResponse> flux = chatClient.prompt()
        .user("tell me a joke")
        .stream()
        .chatResponse();

// 使用 Reactor 的阻塞式处理
flux.collectList().block().forEach(response -> {
    System.out.println("Received: " + response.getResult().getOutput().getText());
});`}
</Code>

**输出示例**:
```
Sure, here's a joke for you:

Why don't scientists trust atoms?

Because they make up everything!
Stream completed
```

## 在 Graph 节点中使用流式输出
### 创建带流式输出的 Graph 节点

参考 [节点流式输出文档](../streaming.md) 获取完整示例。

<Code
  language="java"
  title="创建带流式输出的 Graph 节点"
>
{`import io.github.agentic.ai.graph.OverAllState;
import io.github.agentic.ai.graph.action.NodeAction;
import org.springframework.ai.chat.client.ChatClient;
import reactor.core.publisher.Flux;

import java.util.Map;

public class StreamingAgentNode implements NodeAction {

    private final ChatClient chatClient;

    public StreamingAgentNode(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @Override
    public Map<String, Object> apply(OverAllState state) {
        String userMessage = (String) state.value("query").orElse("Hello");

        // 使用流式输出
        Flux<String> contentFlux = chatClient.prompt()
                .user(userMessage)
                .stream()
                .content();

        return Map.of("answer", contentFlux);
    }
}`}
</Code>

### 配置和运行

<Code
  language="java"
  title="配置和运行流式 Graph"
>
{`import io.github.agentic.ai.graph.StateGraph;
import io.github.agentic.ai.graph.OverAllState;
import io.github.agentic.ai.graph.CompiledGraph;
import org.springframework.ai.chat.client.ChatClient;

// 配置 Graph
StateGraph graph = new StateGraph(keyStrategyFactory)
    .addNode("agent", new StreamingAgentNode(chatClientBuilder))
    .addEdge(StateGraph.START, "agent")
    .addEdge("agent", StateGraph.END);

CompiledGraph compiledGraph = graph.compile();

// 执行
Map<String, Object> input = Map.of("query", "Hello");
OverAllState result = compiledGraph.invoke(input);

System.out.println("Final result: " + result.value("answer").orElse(""));`}
</Code>

## 相关文档

- [流式输出](../streaming.md) - 完整的流式输出机制
- [Workflow 编排指南](../workflow-orchestration.md) - Graph 基础使用
- [Spring AI 文档](https://docs.spring.io/spring-ai/reference/) - Spring AI 官方文档
