---
title: 应用可观测性与 ARMS 集成 (Observation)
sidebar_label: 应用可观测性
description: 了解 ARGI Extensions 可观测性套件：阿里云 ARMS 监控无缝集成、OpenTelemetry 与 Langfuse 双模支持、LLM 输入输出合规采集与工具调用精细化指标。
keywords: [Extensions, Observation, ARMS, OpenTelemetry, Langfuse, Micrometer, 可观测性, 链路追踪, 指标监控]
---

# 应用可观测性与 ARMS 集成 (Observation)

AI 智能体应用具有高度不确定性、多轮循环决策以及复杂的工具调用拓扑。当线上出现回答延迟大、死循环或工具执行失败时，传统的以 HTTP 接口为核心的监控往往只能看到总体耗时，无法透视智能体内部的思维链（Reasoning Chain）、单次 LLM 推理延迟与各个工具调用的执行状态。

**`argi-starter-arms-observation`** 为 Spring AI 与 ARGI 提供了面向**阿里云 ARMS（应用实时监控服务）**与 **OpenTelemetry** 标准生态的全链路可观测性扩展。

---

## 核心能力

1. **OpenTelemetry 与 Langfuse 双模导出支持（`MessageMode`）**：
   - 支持通过 `message-mode` 切换观测语义导出格式：
     - `OPEN_TELEMETRY`（默认）：遵循 OpenTelemetry GenAI 语义约定，无缝对接阿里云 ARMS、SkyWalking 或 Jaeger 等监控平台；
     - `LANGFUSE`：兼容开源 LLM 观测平台 Langfuse 的消息模型格式。
2. **大模型调用全流程观测（Model Observation）**：
   - 提供 `PromptMetadataAwareChatModelObservationConvention` 与 `PromptMetadataAwareChatClientObservationConvention`；
   - 自动采集 Token 消耗量、推理时延、首字延迟（TTFT）与停止原因；
   - **隐私与合规安全开关**：提供 `capture-input` 与 `capture-output` 配置项。生产环境中可自主开启或关闭用户原始输入/输出文本的采集，规避敏感数据外泄风险。
3. **工具调用精细化度量（Tool Observation）**：
   - 自动装配 `ObservableToolCallingManager`；
   - 捕获每个工具（无论是本地 Java 方法工具还是远程 MCP 工具）的执行耗时、成功率、入参格式与异常堆栈。
4. **统一命名约定与标签体系**：
   - 严格遵循 `ArmsToolCallingObservationDocumentation`，规范化划分低基数标签（如 `tool.name`、`tool.status`）与高基数属性（如调用参数摘要与链路追踪 ID）。

---

## 快速上手

### 1. 引入 Starter

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>argi-starter-arms-observation</artifactId>
</dependency>
```

### 2. 声明式配置

在 `application.yml` 中开启 ARMS 监控并配置采集策略：

```yaml
argi:
  arms:
    enabled: true
    # 工具调用度量与拦截管理
    tool:
      enabled: true
    # 大模型调用观测与追踪
    model:
      enabled: true
      message-mode: OPEN_TELEMETRY  # 可选: OPEN_TELEMETRY / LANGFUSE
      # 生产环境合规配置：是否采集原始输入与输出文本到监控链路中
      capture-input: false
      capture-output: false
```

:::warning 生产隐私与数据合规建议
如果你的业务涉及金融、医疗、政企或个人敏感信息，请保持 `capture-input` 和 `capture-output` 为 `false`。系统仍会完整记录模型调用的耗时、Token 数量、状态码和模型名称等元数据，但不会保存敏感的聊天明文。
:::

---

## 在 ReAct Agent 与 Graph 中使用观测

### 1. 配置 ReactAgent 观测器
`ReactAgent.Builder` 原生支持注入 Micrometer `ObservationRegistry`：

```java
import io.github.agentic.ai.graph.agent.ReactAgent;
import io.micrometer.observation.ObservationRegistry;
import org.springframework.stereotype.Service;

@Service
public class MonitoredAgentService {

    private final ChatModel chatModel;
    private final ObservationRegistry observationRegistry;

    public MonitoredAgentService(ChatModel chatModel, ObservationRegistry observationRegistry) {
        this.chatModel = chatModel;
        this.observationRegistry = observationRegistry;
    }

    public void runAgent(String query) {
        ReactAgent agent = ReactAgent.builder()
            .name("monitored_financial_agent")
            .model(chatModel)
            .observationRegistry(observationRegistry)
            .enableLogging(true) // 打印内部推理调试日志
            .build();

        agent.call(query);
    }
}
```

### 2. 结合 Graph Core 观测
核心图引擎本身也支持生命周期与观测扩展（对应前缀 `argi.graph.observation`）：

```yaml
argi:
  graph:
    observation:
      enabled: true
```

图工作流中的每个节点（Node）执行和边（Edge）条件跳转都会自动产生嵌套 Span，与外部 ARMS 监控串联为一条完整的树状调用追踪链（Trace Tree）。

---

## 配置属性参考

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `argi.arms.enabled` | Boolean | `false` | 是否全局开启 ARMS 观测增强 |
| `argi.arms.tool.enabled` | Boolean | `true` | 是否开启工具调用的性能度量与追踪（自动装配 `ObservableToolCallingManager`） |
| `argi.arms.model.enabled` | Boolean | `true` | 是否开启大模型交互观测 |
| `argi.arms.model.message-mode` | String | `OPEN_TELEMETRY` | 语义导出规范模式（`OPEN_TELEMETRY` 或 `LANGFUSE`） |
| `argi.arms.model.capture-input` | Boolean | `false` | 是否上报并记录用户输入的 Prompt 内容 |
| `argi.arms.model.capture-output` | Boolean | `false` | 是否上报并记录模型生成的回答内容 |
| `argi.graph.observation.enabled` | Boolean | `true` | 是否开启底层 Graph 节点与边流转观测 |
