---
title: 检索增强生成 (RAG)
sidebar_label: 检索增强 (RAG)
description: 深入解析 ARGI Extensions RAG 模块：基于 Elasticsearch 的混合检索 (BM25 + KNN + RRF 融合打分)、HyDE 假设性文档检索、多查询改写与生产级 Advisors。
keywords: [Extensions, RAG, Hybrid Search, BM25, KNN, RRF, HyDE, Elasticsearch, Advisors, 检索增强]
---

# 检索增强生成 (RAG)

单纯的密集向量检索（Dense Vector Search）在处理专有名词、产品型号、精确编码匹配时容易出现召回偏差；而传统的稀疏关键词检索（BM25）又缺乏语义理解能力。

**`argi-starter-rag`** 提供了现代高级 RAG（Advanced RAG）所必需的关键基础设施，涵盖**混合检索（Hybrid Search）**、**假设性文档嵌入（HyDE）**、**多查询改写（Multi-Query）** 以及模块化 **Advisor** 编排。

---

## 核心能力架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   用户原始提问   │───▶│   前置检索转换    │───▶│    查询改写     │
│                 │    │ (HyDE / 问题翻译)│    │   (Multi-Query) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     大模型      │    │    后置检索重排  │    │    混合检索     │
│  (上下文生成)   │◀───│(RRF 倒数排名融合)│◀───│(BM25 文本+KNN向量)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 1. 混合检索（Hybrid Search）与 RRF 融合

`HybridElasticsearchRetriever` 在单次检索中并行触发 ES 的 **BM25 关键词检索**与 **KNN 密集向量检索**，并通过 **Reciprocal Rank Fusion (RRF)** 算法融合两者打分：

### 引入依赖
```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>argi-starter-rag</artifactId>
</dependency>
```

### 属性配置（`argi.rag.elasticsearch`）
```yaml
argi:
  rag:
    elasticsearch:
      enabled: true
      retriever-type: HYBRID  # 可选: BM25 / KNN / HYBRID
      use-rrf: true           # 是否启用 RRF 倒数排名融合
      top-k: 20
      bm25-bias: 1.0          # BM25 权重打分偏置
      knn-bias: 1.2           # KNN 向量权重打分偏置
      recall:
        similarity-threshold: 0.75
        neighbors-num: 50
        candidate-num: 100
      rrf:
        rank-constant: 60     # RRF 排名影响因子（值越大低排名文档权重越高）
        rank-window-size: 50  # RRF 窗口大小
```

### 自动装配说明与注入使用
Starter 内部的 `RagElasticSearchAutoConfiguration` 会在检测到配置生效时，**自动向 Spring 容器注册以下 Bean**：
1. `HybridElasticsearchRetriever`（基于 ES 的混合检索器）
2. `HyDeTransformer`（基于大模型的假设文档前置转换器）
3. `HyDeRetriever`（集成 HyDE 的端到端检索器）

开发者无需手动编写 `@Bean` 工厂方法，直接注入即可使用：

```java
import io.github.agentic.ai.rag.retrieval.search.HybridElasticsearchRetriever;
import org.springframework.ai.document.Document;
import org.springframework.ai.rag.Query;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HybridSearchService {

    private final HybridElasticsearchRetriever retriever;

    public HybridSearchService(HybridElasticsearchRetriever retriever) {
        this.retriever = retriever;
    }

    public List<Document> search(String question) {
        Query query = Query.builder()
            .text(question)
            .build();
        return retriever.retrieve(query);
    }
}
```

---

## 2. 混合过滤查询支持

`HybridElasticsearchRetriever` 支持两种维度的精确元数据过滤：

### 方式 A：Spring AI 标准 Filter.Expression
通过在 `Query` 的 context 中注入过滤表达式：
```java
FilterExpressionBuilder builder = new FilterExpressionBuilder();
Filter.Expression expression = builder.or(
    builder.eq("category", "技术文档"),
    builder.eq("category", "HybridSearch")
).build();

Map<String, Object> context = new HashMap<>();
context.put(HybridElasticsearchRetriever.FILTER_EXPRESSION, expression);
context.put(HybridElasticsearchRetriever.BM25_FILED, "metadata.word");

Query query = Query.builder()
    .text("什么是分布式微服务？")
    .context(context)
    .build();

List<Document> docs = retriever.retrieve(query);
```

### 方式 B：Elasticsearch 原生 Query DSL 过滤
```java
co.elastic.clients.elasticsearch._types.query_dsl.Query filterQuery = QueryBuilders.bool(b -> b
    .should(QueryBuilders.term(t -> t.field("metadata.category.keyword").value("技术文档")))
).bool()._toQuery();

co.elastic.clients.elasticsearch._types.query_dsl.Query textQuery = QueryBuilders.match(m -> m
    .field("metadata.word")
    .query("什么是分布式微服务？")
);

List<Document> docs = retriever.retrieve(new Query("什么是分布式微服务？"), filterQuery, textQuery);
```

---

## 3. 假设性文档嵌入（HyDE）

**HyDE (Hypothetical Document Embedding)** 的思想是：用户提出的问题往往比较简短，与知识库中翔实的答案文档在向量空间中存在不对称。HyDE 先引导 LLM 生成一份“假设性答案”，再拿这份虚拟答案去计算向量并做检索，大幅提升相关文档召回率。

- **`HyDeTransformer`**：实现 Spring AI `QueryTransformer`，负责调用模型根据 Query 生成假设性文档。
- **`HyDeRetriever`**：包装 `HyDeTransformer` 与底层 `VectorStore`，实现透明的端到端检索。

如果需要自定义参数创建：
```java
HyDeTransformer transformer = HyDeTransformer.builder()
    .chatClientBuilder(chatClientBuilder)
    .build();

HyDeRetriever hyDeRetriever = HyDeRetriever.builder()
    .hyDeTransformer(transformer)
    .vectorStore(vectorStore)
    .similarityThreshold(0.8)
    .topK(10)
    .build();
```

---

## 4. RAG 生产级 Advisors

Extensions 内置了可直接装配到 Spring AI `ChatClient` 的高级 Advisor：

1. **`HybridSearchAdvisor`**：将混合检索逻辑直接封装为模型拦截链路，自动把检索到的最相关文档作为上下文填充到系统 Prompt 中（上下文 Key 为 `HybridSearchAdvisor.DOCUMENT_CONTEXT`）。
2. **`MultiQueryRetrieverAdvisor`**：将用户单个 Query 自动裂变为多角度的子查询并行检索并去重合并，避免由于用户提问措辞狭隘导致漏召回。

```java
import io.github.agentic.ai.rag.advisor.HybridSearchAdvisor;
import org.springframework.ai.chat.client.ChatClient;

// 使用 Builder 模式构建 Advisor
HybridSearchAdvisor advisor = HybridSearchAdvisor.builder()
    .hybridDocumentRetriever(retriever)
    .order(0)
    .build();

ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(advisor)
    .build();

String answer = chatClient.prompt()
    .user("微服务架构下如何处理分布式事务？")
    .call()
    .content();
```

---

## 5. 与 ReAct Agent 协同（两步 RAG vs Agentic RAG）

在智能体开发中，RAG 有两种典型接入模式：

### 模式 A：前置拦截注入（两步 RAG）
通过 ReAct Agent 的 Hook 在模型思考前强制注入检索结果：
```java
@HookPositions({HookPosition.BEFORE_MODEL})
class AutoRagHook extends MessagesModelHook {
    private final HybridElasticsearchRetriever retriever;

    @Override
    public AgentCommand beforeModel(List<Message> messages, RunnableConfig config) {
        String query = messages.get(messages.size() - 1).getText();
        List<Document> docs = retriever.retrieve(Query.builder().text(query).build());
        String context = docs.stream().map(Document::getText).collect(Collectors.joining("\n"));

        List<Message> enhanced = new ArrayList<>(messages);
        enhanced.add(0, new SystemMessage("知识库参考信息：\n" + context));
        return new AgentCommand(enhanced, UpdatePolicy.REPLACE);
    }
}
```

### 模式 B：工具调用自主检索（Agentic RAG）
将检索器暴露为工具，由 Agent 根据上下文自主判断是否需要查询：
```java
public class KnowledgeTools {
    private final HybridElasticsearchRetriever retriever;

    @Tool(description = "检索企业内部技术架构知识库文档")
    public String searchKnowledge(String keyword) {
        List<Document> docs = retriever.retrieve(Query.builder().text(keyword).build());
        return docs.stream().map(Document::getText).collect(Collectors.joining("\n\n"));
    }
}
```
