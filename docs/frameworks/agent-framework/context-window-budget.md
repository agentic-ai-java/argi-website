---
title: 上下文窗口预算
description: 对完整模型请求估算、按需压缩，并在超出单模型上下文窗口时拒绝分发。
---

# 上下文窗口预算

## 基线与依赖

本文对应 [ARGI #372](https://github.com/agentic-ai-java/argi/issues/372) 的 context window budgets 项，
核对于 2026-11-25，基于 Core
[c6e453f20](https://github.com/agentic-ai-java/argi/tree/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6)，
包含已合并的 [#352](https://github.com/agentic-ai-java/argi/pull/352)。源码版本为
`2.1.0-RC2-SNAPSHOT`：**源码中可用不等于已经发布到 Maven Central**，相同 SNAPSHOT
版本也不能替代固定提交。先从该提交安装所需模块，再运行本文示例。

| 类型 | 模块 | 包 |
| --- | --- | --- |
| `ContextWindowBudget`、`ContextBudgetInterceptor` | `argi-agent-api` | `io.github.agentic.ai.agent.budget` |
| `RequestTokenEstimator`、`ApproximateRequestTokenEstimator`、`RequestTokenEstimate`、`EstimationAccuracy` | `argi-agent-api` | 同上 |
| `BudgetComponent`、`BudgetViolation`、`RequestCompactor`、`ContextWindowBudgetExceededException` | `argi-agent-api` | 同上 |
| `ToolCallPairingValidator` | `argi-agent-api` | 同上 |
| `SummarizationRequestCompactor` | `argi-agent-framework` | `io.github.agentic.ai.agent.orchestration.hook.messages` |
| 独立 `ReActAgent` | `argi-agent-core` | `io.github.agentic.ai.agent.react` |

预算拦截器是 **opt-in**：只有显式注册才生效，默认不压缩，也不会自动启用运行级费用限制。

## 预算到底限制什么

虽然字段叫 `inputTokenLimit`，它表示的是**整个模型上下文窗口**，不是可用输入长度。

```text
systemTokens + messageTokens + toolSchemaTokens + outputReserve <= inputTokenLimit
usableInputTokens() = inputTokenLimit - outputReserve
```

例如 `new ContextWindowBudget(8192, 1024)` 表示总窗口 8192，预留输出 1024，
可用于输入的预算为 7168。两个参数必须为正数，且 `outputReserve < inputTokenLimit`。
**恰好等于总窗口允许分发，超出 1 个估算 token 也会拒绝。**

这是一个模型的一次请求窗口，不是整个 run 的累计 token、金额、次数或截止时间预算。
多模型运行必须按各模型窗口分别配置；切换模型时不能假定原预算自动适配。

## 注册到真实 Agent

以下接线使用独立 ReActAgent。`client` 是应用自己的 `ChatClient`；随文离线示例提供无需密钥的 fake。

```java
import io.github.agentic.ai.agent.budget.ContextBudgetInterceptor;
import io.github.agentic.ai.agent.budget.ContextWindowBudget;
import io.github.agentic.ai.agent.react.ReActAgent;
import java.util.List;

ContextBudgetInterceptor budget = ContextBudgetInterceptor.builder()
    .budget(new ContextWindowBudget(8192, 1024))
    // 默认 ApproximateRequestTokenEstimator；默认无 compactor
    .build();

ReActAgent agent = ReActAgent.builder(client)
    .interceptors(List.of(budget))
    .build();
```

将预算拦截器注册在所有**改写请求的拦截器之后（最内层）**，让它看到最终请求。
这由 `ContextBudgetInterceptor.ORDERING_CONTRACT` 和 Core 链级测试约定，
不是不可绕过的 runtime terminal enforcement。若在预算检查后仍改写并增大请求，可能绕过检查。
本文不承诺与重试、fallback 或其他链组合的未验证执行顺序；组合时应添加自己的链级测试。

## 完整请求估算

`RequestTokenEstimate` 拆分系统消息、会话消息、实际披露的工具 schema、预留输出。
默认 `ApproximateRequestTokenEstimator` 使用每 4 个字符约 1 token、向上取整的启发式：

- 系统消息单独计数；会话包含文本、可见二进制数据长度及工具调用参数。
- 静态和动态工具注册表合并，同名时静态绑定优先；显式 `tools(...)` 再过滤。
  `tools(List.of())` 明确禁用工具，不计未分发的大目录 schema。
- 实际绑定的工具名称、描述与 input schema 被计数。用于辅助工具选择的独立工具描述目录不计入主请求。
- 显式 `GenerationOptions.maxTokens()` 会使输出项取
  `max(budget.outputReserve(), maxTokens)`；更小的 maxTokens 不会降低预留，更大的值可能直接使请求超限。

默认准确度是 `APPROXIMATE`，不是供应商 tokenizer 的硬保证，尤其不能据此保证多模态计费或协议开销。
可插入 `RequestTokenEstimator` 返回 `EXACT` 或 `CONSERVATIVE`，但准确性必须由实现负责；
修改枚举标签不会把启发式变成精确计数。拦截器按返回的数值比较，不会自动增加安全系数。

## 超限、压缩与重新估算

以此固定提交的 `interceptModel` 实际执行顺序为准：

1. 估算收到的完整请求；若总量不大于窗口，立即调用下一层。
2. 超限时，若配置了 `RequestCompactor`，调用一次 `compact(request)`，不允许返回 null。
3. **仅在调用过 compactor 的路径**，先用 `ToolCallPairingValidator` 校验返回消息。
4. 再次估算返回的请求（没有 compactor 时也会重算原请求）。
5. 仍超限则抛出 `ContextWindowBudgetExceededException`；否则仅分发压缩后的请求。

不是循环压缩；不会默默截断，也不会在超限后继续分发。
配对校验发生在第二次估算**之前**；已经在预算内的原始请求不会由此拦截器额外做配对校验。

`RequestCompactor` 是函数接口：`ModelRequest compact(ModelRequest request)`。
应用可选择减少披露工具、保留必要上下文或安全摘要；不能仅删除工具结果而留下孤立调用。
它应返回不比输入更大的请求，但拦截器实际保证的是“重算后在窗口内”，不是逐项验证单调缩小。

### 复用已有摘要能力

需要 `argi-agent-framework`，并先配置好摘要用的 ChatClient：

```java
import io.github.agentic.ai.agent.orchestration.hook.messages.SummarizationRequestCompactor;
import io.github.agentic.ai.agent.orchestration.hook.summarization.SummarizationHook;

SummarizationHook hook = SummarizationHook.builder()
    .chatClient(summaryClient)
    .maxTokensBeforeSummary(4000)
    .messagesToKeep(4)
    .build();

ContextBudgetInterceptor budgetWithSummary = ContextBudgetInterceptor.builder()
    .budget(new ContextWindowBudget(8192, 1024))
    .compactor(new SummarizationRequestCompactor(hook))
    .build();
```

适配器调用 `hook.beforeModel(messages, config)` 并重建消息，支持带 `RunnableConfig` 的第二个构造器。
它不改变 hook 的触发阈值、保留消息或失败策略：无需摘要、失败保留历史时可返回原请求，
随后预算检查仍可能拒绝。仅缩短会话也不能解决过大的系统提示或工具 schema。

**摘要本身可能另发一次模型请求**，不能假定被外层主请求预算保护；摘要模型的窗口、调用费用、
超时及失败策略需另行控制。摘要成功也不保证主请求最终通过预算或配对检查。

## 工具配对与结构化失败

压缩后的配对校验按 toolCallId 检查缺少结果、未知结果、重复调用、重复结果、结果先于调用，
分别对应 `MISSING_TOOL_RESULT`、`UNKNOWN_TOOL_RESULT`、`DUPLICATE_TOOL_CALL`、
`DUPLICATE_TOOL_RESULT`、`RESULT_BEFORE_CALL`。
失败抛出 `ToolCallPairingValidator.PairingException`，通过 `violation()` 读取类型及 ID；
不应把它误报为 token 超限。

超限异常提供 `estimate()`、`violation()`、`dominantComponent()`。
当前预算门产生的 `violation().component()` 为 `TOTAL`，
`estimatedTokens()` / `limitTokens()` / `excessTokens()` 可用于结构化诊断。
`dominantComponent()` 是四部分中的最大项，用来决定减少工具、摘要历史或缩短输出；
它不是单独超出的组件配额，也不能说明只改这一项就一定足够。不要解析异常文本或记录敏感请求正文。

## 离线复现与边界

仓库目录 `examples/context-window-budget` 提供可执行的 Java fixture。
在上述 Core 固定提交先安装依赖，再从官网仓库运行：

```bash
# Core checkout，JDK 17+ / Maven 3.9.1+
mvn -B -pl :argi-agent-framework -am install -DskipTests   -Dcheckstyle.skip -Dspring-javaformat.skip

# website checkout；首次解析插件与依赖，之后可离线复现
mvn -B -f examples/context-window-budget/pom.xml compile exec:java
mvn -B -o -f examples/context-window-budget/pom.xml compile exec:java
```

fixture 使用真实 `ReActAgent.invoke` 验证等值允许、超 1 拒绝、超限 provider 调用为 0、
压缩成功/失败后的重算；直接驱动拦截器断言工具配对破坏会在二次估算前拒绝。
另核对四项组成、工具筛选、静态优先和 maxTokens 预留下限。fake estimator 的 `EXACT`
仅表示固定测试单位，不宣称供应商精确计数。

**不覆盖**：真实供应商、多模态 tokenizer 精度、graph-based ReactAgent、重试/fallback 组合、
流式执行、取消与摘要模型请求的端到端限制。此基线的预算类只 override `interceptModel`，
不存在由此类单独提供的流式 override；不据此承诺任意 stream 入口受保护。

参阅 [消息](./messages)、[记忆与摘要](./memory)、[Hooks 与拦截器](./hooks-interceptors)
及独立的 [模型调用重试](./model-retry)。

## 源码依据

- [ContextBudgetInterceptor](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/main/java/io/github/agentic/ai/agent/budget/ContextBudgetInterceptor.java)
- [ApproximateRequestTokenEstimator](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-agent/argi-agent-api/src/main/java/io/github/agentic/ai/agent/budget/ApproximateRequestTokenEstimator.java)
- [SummarizationRequestCompactor](https://github.com/agentic-ai-java/argi/blob/c6e453f20fcb1c7837d92b321aa18ec5a46ccab6/argi-orchestration/argi-agent-framework/src/main/java/io/github/agentic/ai/agent/orchestration/hook/messages/SummarizationRequestCompactor.java)
