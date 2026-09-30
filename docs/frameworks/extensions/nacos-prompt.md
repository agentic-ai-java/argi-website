---
title: Nacos 动态提示词管理 (Prompt)
sidebar_label: Nacos 提示词
description: 了解基于 Nacos 配置中心的 Prompt 模板动态热更新机制：ConfigurablePromptTemplateFactory、模板监听刷新、默认变量模型与智能体无缝集成。
keywords: [Extensions, Nacos Prompt, Prompt Template, 提示词管理, 热更新, 动态配置, ReAct Agent]
---

# Nacos 动态提示词管理 (Prompt)

在传统的 LLM 应用开发中，系统提示词（System Prompt）和指令模板通常硬编码在 Java 代码中或写在静态资源文件里。一旦需要调优提示词、修复边界 Bad Case 或针对线上节日活动临时变更，通常需要重新编译、打包并灰度发布整个应用，运维成本极高。

**`argi-starter-nacos-prompt`** 提供了基于 **Nacos 配置中心**的 Prompt 模板动态管理与热更新能力，允许运营与算法工程师在 Nacos 控制台上实时调整提示词，应用秒级生效，无需重启任何服务。

---

## 核心工作原理

```
┌─────────────────────────────────┐
│     Nacos 配置中心 (控制台)     │
│ DataId: argi.      │
│         configurable.prompt     │
└────────────────┬────────────────┘
                 │ (配置发布 / 变更推送)
                 ▼
┌─────────────────────────────────┐
│ ConfigurablePromptTemplateFactory│
│  - 监听 NacosConfigListener      │
│  - 动态重构 ConfigurablePrompt   │
└────────────────┬────────────────┘
                 │ (内存热更新，无锁感知)
                 ▼
┌─────────────────────────────────┐
│       Spring AI / Agent 运行时  │
│  - ReactAgent 指令动态更新       │
│  - Graph 节点模型 Prompt 动态替换│
└─────────────────────────────────┘
```

1. **统一模板工厂（`ConfigurablePromptTemplateFactory`）**：在应用启动时加载默认模板或本地资源模板（`.st` 格式）。
2. **Nacos 监听器机制**：工厂内部通过 `@NacosConfigListener` 持续监听指定的 Nacos 配置集（默认 Data ID 为 `argi.configurable.prompt`，Group 为 `DEFAULT_GROUP`）。
3. **零停机无缝切换**：当 Nacos 配置被发布时，工厂自动解析最新配置模型列表并刷新内部 `ConcurrentHashMap`，所有正在执行或后续发起的智能体请求将立即读取最新渲染模板。

---

## 快速上手

### 1. 引入 Starter

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>argi-starter-nacos-prompt</artifactId>
</dependency>
```

### 2. 声明式配置

在 `application.yml` 中开启 Nacos Prompt 自动配置并配置 Nacos 连接信息：

```yaml
argi:
  nacos:
    prompt:
      template:
        enabled: true  # 必须置为 true 以激活自动装配
```

---

## 3. Nacos 端配置格式规范

在 Nacos 控制台中，创建如下配置项：
- **Data ID**：`argi.configurable.prompt`
- **Group**：`DEFAULT_GROUP`
- **配置格式**：`JSON`

配置内容为 JSON 数组，每个元素包含模板名称 `name`、具体模板文本 `template`，以及可选的默认变量键值对 `model`：

```json
[
  {
    "name": "customer_service_instruction",
    "template": "你是一名专业的智能客服助手。当前用户语言为：{language}。回答风格需保持：{tone}。禁止向用户承诺任何未经授权的退款要求。",
    "model": {
      "language": "中文",
      "tone": "严谨客气"
    }
  },
  {
    "name": "code_review_prompt",
    "template": "你是一名资深工程师。请评审以下代码片段：\n{code}\n重点检查：空指针风险、并发安全与资源释放。"
  }
]
```

---

## 4. 在 ReAct Agent 与业务代码中使用

你可以直接通过 Spring 容器注入的 `ConfigurablePromptTemplateFactory` 获取模板并渲染：

```java
import io.github.agentic.ai.prompt.ConfigurablePromptTemplate;
import io.github.agentic.ai.prompt.ConfigurablePromptTemplateFactory;
import io.github.agentic.ai.graph.agent.ReactAgent;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class DynamicAgentService {

    private final ChatModel chatModel;
    private final ConfigurablePromptTemplateFactory promptFactory;

    public DynamicAgentService(ChatModel chatModel, ConfigurablePromptTemplateFactory promptFactory) {
        this.chatModel = chatModel;
        this.promptFactory = promptFactory;
    }

    public String handleUserQuery(String userMessage) {
        // 1. 获取命名模板（如果 Nacos 上更新了，这里直接拿到最新模板）
        ConfigurablePromptTemplate template = promptFactory.create(
            "customer_service_instruction",
            "默认兜底指令：你是一个助手。"
        );

        // 2. 传入动态变量渲染（可覆盖 Nacos 中设置的默认 model 变量）
        String renderedInstruction = template.render(Map.of(
            "tone", "极度热情"
        ));

        // 3. 构建并执行 Agent
        ReactAgent agent = ReactAgent.builder()
            .name("dynamic_prompt_agent")
            .model(chatModel)
            .instruction(renderedInstruction)
            .build();

        return agent.call(userMessage).getText();
    }
}
```

---

## 自定义扩展点

模块提供了 `PromptTemplateCustomizer` 与 `PromptTemplateBuilderConfigure` 函数式接口。开发者可在 Spring 容器中声明自定义 Bean，在模板创建前后插入全局切面逻辑，例如注入全局租户环境变量或接入安全脱敏预检：

```java
import io.github.agentic.ai.prompt.PromptTemplateCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CustomPromptConfiguration {

    @Bean
    public PromptTemplateCustomizer environmentPromptCustomizer() {
        return builder -> {
            // 对 PromptTemplateBuilder 进行全局定制处理
        };
    }
}
```
