---
title: 序列化器
sidebar_label: 序列化器
description: 了解 Graph 中的状态序列化机制、Jackson 序列化器及自定义序列化方案。
keywords: [序列化器, Serializer, Jackson, 状态持久化, StateGraph, 自定义序列化]
---

# 序列化器（Serializer）

在图执行生命周期中，状态需要被序列化，用于：
1. 节点间状态传递时的深度克隆与隔离。
2. 跨超级步骤（Super-steps）及断点恢复时的持久化存储（Checkpointer）。

框架提供了 Jackson 与 JDK 原生序列化实现，默认采用 Jackson 作为状态序列化方案。

---

## 序列化器设计考量

在设计智能体状态序列化时，重点关注以下维度：

1. **类型安全性**：避免使用不安全的反序列化机制，预防安全漏洞。
2. **三方库对象兼容**：能够无缝兼容 Spring AI、模型 SDK 返回的 `Message` 等复杂不可变对象。
3. **隔离类加载风险**：降低热更新与动态类加载时的类型转换异常。
4. **空值与缺失字段管理**：在长流程与版本演进中优雅兼容增减字段。

---

## 自定义序列化方案

对于用户自定义的业务数据类型，有三种常见接入方式：

### 1. 为业务数据类增加 Jackson 注解（最简单）

```java
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomMessage {
    private String content;
    private String type;
    
    @JsonCreator
    public CustomMessage(
            @JsonProperty("content") String content,
            @JsonProperty("type") String type) {
        this.content = content;
        this.type = type;
    }
    
    public String getContent() { return content; }
    public String getType() { return type; }
}
```

### 2. 定制 StateGraph 中的默认 Serializer

通过 `getStateSerializer()` 获取现有的 Jackson 序列化器并定制底层的 `ObjectMapper`：

```java
import io.github.agentic.spring.ai.graph.StateGraph;
import io.github.agentic.spring.ai.graph.serializer.StateSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;

StateGraph graph = new StateGraph(keyStrategyFactory);

StateSerializer stateSerializer = graph.getStateSerializer();
if (stateSerializer instanceof StateGraph.JacksonSerializer jacksonSerializer) {
    ObjectMapper objectMapper = jacksonSerializer.getObjectMapper();
    objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
}
```

### 3. 提供自定义序列化器类（推荐）

通过继承 `SpringAIJacksonStateSerializer`，注册自定义序列化与反序列化逻辑：

```java
import io.github.agentic.spring.ai.graph.OverAllState;
import io.github.agentic.spring.ai.graph.serializer.plain_text.jackson.SpringAIJacksonStateSerializer;
import com.fasterxml.jackson.databind.module.SimpleModule;

public class CustomizedSerializer extends SpringAIJacksonStateSerializer {
    public CustomizedSerializer() {
        super(OverAllState::new);
        
        SimpleModule module = new SimpleModule();
        module.addSerializer(CustomMessage.class, new CustomMessageSerializer());
        module.addDeserializer(CustomMessage.class, new CustomMessageDeserializer());
        
        objectMapper.registerModule(module);
    }
}

// 在 StateGraph 初始化时注入
StateGraph graph = new StateGraph("demo", keyStrategyFactory, new CustomizedSerializer());
```
