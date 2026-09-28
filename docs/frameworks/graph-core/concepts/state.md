---
title: 状态 OverAllState
sidebar_label: 状态 OverAllState
description: 深入理解 Graph 的状态模型 OverAllState，包括 KeyStrategy、覆盖策略与追加策略。
keywords: [OverAllState, State, KeyStrategy, ReplaceStrategy, AppendStrategy, 状态管理, Graph]
---

# 状态（OverAllState）

定义图时，首先需要定义图的 `State`。在 Graph 运行时中，全局状态由 `OverAllState` 对象表示。

`State` 由图中的状态键（Key）以及对应的更新合并策略（`KeyStrategy`）组成。所有节点（Node）执行完毕后都会返回一个包含键值对的 `Map<String, Object>`，图引擎会根据键所绑定的 `KeyStrategy` 将更新合并到全局状态中。

---

## KeyStrategy 策略机制

每个状态键都可以独立配置自己的更新策略。如果没有显式指定，默认采用 `ReplaceStrategy`（覆盖策略）。

可以通过 `KeyStrategyFactory` 为不同的状态键配置策略：

```java
import io.github.agentic.spring.ai.graph.KeyStrategyFactory;
import io.github.agentic.spring.ai.graph.KeyStrategy;
import io.github.agentic.spring.ai.graph.state.strategy.AppendStrategy;
import io.github.agentic.spring.ai.graph.state.strategy.ReplaceStrategy;
import java.util.HashMap;
import java.util.Map;

KeyStrategyFactory keyStrategyFactory = () -> {
    Map<String, KeyStrategy> map = new HashMap<>();
    map.put("messages", new AppendStrategy());   // 消息列表追加
    map.put("current_step", new ReplaceStrategy()); // 步数直接覆盖
    return map;
};
```

---

## ReplaceStrategy（覆盖策略）

`ReplaceStrategy` 是最常见的状态策略：后执行的节点返回的值将完全替换旧值。

```java
// 定义使用 ReplaceStrategy
KeyStrategyFactory factory = () -> Map.of("value", new ReplaceStrategy());

var nodeA = node_async(state -> Map.of("value", "初始值"));
var nodeB = node_async(state -> Map.of("value", "更新后的值"));

StateGraph stateGraph = new StateGraph(factory)
        .addNode("node_a", nodeA)
        .addNode("node_b", nodeB)
        .addEdge(START, "node_a")
        .addEdge("node_a", "node_b")
        .addEdge("node_b", END);

CompiledGraph graph = stateGraph.compile();
Optional<OverAllState> result = graph.invoke(Map.of(), RunnableConfig.builder().threadId("demo").build());

// 最终状态输出为 "更新后的值"，节点 A 的 "初始值" 被覆盖
System.out.println("最终状态: " + result.get().value("value"));
```

---

## AppendStrategy（追加策略）

`AppendStrategy` 会将新值追加到现有集合（如 `List`）中，非常适合维护多轮对话记录、操作日志或思考链。

```java
KeyStrategyFactory factory = () -> Map.of("messages", new AppendStrategy());

var nodeA = node_async(state -> Map.of("messages", "消息1"));
var nodeB = node_async(state -> Map.of("messages", "消息2"));
var nodeC = node_async(state -> Map.of("messages", "消息3"));

StateGraph stateGraph = new StateGraph(factory)
        .addNode("node_a", nodeA)
        .addNode("node_b", nodeB)
        .addNode("node_c", nodeC)
        .addEdge(START, "node_a")
        .addEdge("node_a", "node_b")
        .addEdge("node_b", "node_c")
        .addEdge("node_c", END);

CompiledGraph graph = stateGraph.compile();
Optional<OverAllState> result = graph.invoke(Map.of(), RunnableConfig.builder().threadId("append-demo").build());

// 最终状态输出为: [消息1, 消息2, 消息3]
List<String> messages = (List<String>) result.get().value("messages").orElse(List.of());
```

### 在 AppendStrategy 中删除元素（RemoveByHash）

`AppendStrategy` 支持通过 `RemoveByHash` 移除集合中的特定元素：

```java
import io.github.agentic.spring.ai.graph.state.RemoveByHash;

var nodeDelete = node_async(state -> 
    Map.of("messages", RemoveByHash.of("消息2"))
);
```

## MergeStrategy（合并策略）

`MergeStrategy` 用于合并 `Map` 或可合并的普通对象。两个值都是 `Map` 时，新 Map 会覆盖旧 Map 中的同名键；两个值是同一类型的可合并对象时，框架会尝试按字段合并。

```java
import io.github.agentic.spring.ai.graph.state.strategy.MergeStrategy;

KeyStrategyFactory factory = () -> Map.of("profile", new MergeStrategy());

var nodeA = node_async(state -> Map.of("profile", Map.of("name", "Bob")));
var nodeB = node_async(state -> Map.of("profile", Map.of("language", "Java")));

// 最终 profile 包含 name 和 language
```

## KeyStrategyFactoryBuilder

如果状态键较多，可以使用 `KeyStrategyFactoryBuilder` 集中声明策略。refactor 分支支持按固定 key、前缀、后缀、包含字符串、正则或谓词选择策略。

```java
import io.github.agentic.spring.ai.graph.KeyStrategyFactoryBuilder;
import io.github.agentic.spring.ai.graph.state.strategy.AppendStrategy;
import io.github.agentic.spring.ai.graph.state.strategy.MergeStrategy;
import io.github.agentic.spring.ai.graph.state.strategy.ReplaceStrategy;

KeyStrategyFactory factory = new KeyStrategyFactoryBuilder()
    .defaultStrategy(new ReplaceStrategy())
    .addStrategy("messages", new AppendStrategy())
    .addSuffixStrategy("_metadata", new MergeStrategy())
    .build();
```

---

## 自定义 KeyStrategy

当需要自定义合并逻辑（例如按数值相加、字典递归合并或去重合并）时，您可以实现自定义的 `KeyStrategy` 接口：

```java
import io.github.agentic.spring.ai.graph.KeyStrategy;

public class CustomMergeStrategy implements KeyStrategy {
    @Override
    public Object apply(Object oldValue, Object newValue) {
        if (oldValue == null) {
            return newValue;
        }
        // 执行自定义合并逻辑
        return merge(oldValue, newValue);
    }
}
```
