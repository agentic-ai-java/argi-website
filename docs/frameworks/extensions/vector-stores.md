---
title: 向量存储 (Vector Stores)
sidebar_label: 向量存储
description: 了解 Agentic AI Extensions 提供的 5 大企业级云原生与分布式向量数据库实现：AnalyticDB、OceanBase、OpenSearch、TableStore 与 Tair，全面支持 Spring AI VectorStore 标准接口与过滤表达式。
keywords: [Extensions, Vector Stores, 向量数据库, AnalyticDB, OceanBase, OpenSearch, TableStore, Tair, 向量检索]
---

# 向量存储 (Vector Stores)

在构建知识库问答、检索增强生成（RAG）和智能体长期记忆检索时，高效可靠的向量存储是不可或缺的基础底座。

Agentic AI Extensions 针对企业主流的云原生数据库与分布式存储系统，提供了 5 大生产级 Spring AI `VectorStore` 实现及自动配置 Starter。每个实现均内置了**过滤表达式转换器（Filter Expression Converter）**，支持使用 Spring AI 标准语法执行复杂的元数据混合过滤查询。

---

## 5 大向量存储对比与选型

| 存储引擎 | 对应 Starter 坐标 | 适配场景与技术优势 | 配置前缀 |
| --- | --- | --- | --- |
| **AnalyticDB** | `agentic-ai-starter-vector-store-analyticdb` | 阿里云 AnalyticDB for PostgreSQL / MySQL 向量引擎，具备海量结构化与向量数据混合分析能力 | `spring.ai.vectorstore.analyticdb` |
| **OceanBase** | `agentic-ai-starter-vector-store-oceanbase` | 蚂蚁集团 OceanBase 分布式数据库内置的向量检索能力，金融级高可用，支持 HybridSearch | `spring.ai.vectorstore.oceanbase` |
| **OpenSearch** | `agentic-ai-starter-vector-store-opensearch` | 阿里云 OpenSearch 开放搜索向量版，高 QPS 毫秒级响应，具备完整的全托管搜索生态 | `spring.ai.vectorstore.opensearch` |
| **TableStore** | `agentic-ai-starter-vector-store-tablestore` | 阿里云表格存储（NoSQL），超高并发、原生支持多租户（Multi-tenant）与自定义元数据 Schema | `spring.ai.vectorstore.tablestore` |
| **Tair** | `agentic-ai-starter-vector-store-tair` | 阿里云内存数据库 Tair（兼容 Redis 协议），纯内存超低延迟向量检索，支持 HNSW、Flat 等算法 | `spring.ai.vectorstore.tair` |

---

## 1. 阿里云 OpenSearch 向量存储

### 引入依赖
```xml
<dependencies>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>agentic-ai-starter-vector-store-opensearch</artifactId>
    </dependency>
    <!-- Embedding 模型依赖（以 OpenAI 兼容协议为例） -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
</dependencies>
```

### 属性配置（代码严格对应）
```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      embedding:
        options:
          model: text-embedding-3-small
    vectorstore:
      opensearch:
        enabled: true
        instance-id: ${OPENSEARCH_INSTANCE_ID}
        endpoint: https://ha-cn-xxxx.opensearch.aliyuncs.com
        access-user-name: ${OPENSEARCH_USER}
        access-pass-word: ${OPENSEARCH_PASS}
        table-name: knowledge_base_vectors
        primary-key-field: id
        dimensions: 1536
        similarity-function: Cosine
```

---

## 2. 阿里云内存数据库 Tair 向量存储

支持配置 HNSW / FLAT 索引算法与欧氏距离（L2）、内积（IP）等计算方式：

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>agentic-ai-starter-vector-store-tair</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    vectorstore:
      tair:
        host: ${TAIR_HOST:127.0.0.1}
        port: ${TAIR_PORT:6379}
        password: ${TAIR_PASSWORD:}
        timeout: 2000
        options:
          index-name: spring_ai_tair_vector_store
          dimensions: 1536
          index-algorithm: HNSW     # 可选: HNSW / FLAT
          distance-method: L2       # 可选: L2 / IP / JACCARD
          expire-seconds: 600
```

---

## 3. 蚂蚁 OceanBase 分布式向量存储

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>agentic-ai-starter-vector-store-oceanbase</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    vectorstore:
      oceanbase:
        url: jdbc:oceanbase://localhost:2881/test?useSSL=false
        username: root@test
        password: secret
        table-name: vector_store
        dimension: 1536
        hybrid-search-type: RRF
```

---

## 4. 阿里云 AnalyticDB 向量存储

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>agentic-ai-starter-vector-store-analyticdb</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    vectorstore:
      analyticdb:
        collect-name: adb_vectors
        access-key-id: ${ALIBABA_AK}
        access-key-secret: ${ALIBABA_SK}
        region-id: cn-hangzhou
        db-instance-id: gp-xxxxxx
        manager-account: test_user
        manager-account-password: test_password
        namespace: public
        metrics: cosine
        read-timeout: 60000
```

---

## 5. 阿里云 TableStore 向量存储

TableStore 原生支持多租户隔离与自定义扩展元数据模式（`extraMetaDataIndexSchema`）：

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>agentic-ai-starter-vector-store-tablestore</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    vectorstore:
      tablestore:
        enabled: true
        endpoint: https://your-instance.cn-hangzhou.ots.aliyuncs.com
        instance-name: your-instance
        access-key-id: ${OTS_AK}
        access-key-secret: ${OTS_SK}
        table-name: spring_ai_multi_tenant_knowledge_store
        text-field: text_1
        embedding-field: embedding_1
        embedding-dimension: 1536
        enable-multitenant: true
```

---

## 编程实践：带元数据过滤的相似度检索

所有 Starter 都会向 Spring 容器自动注入标准的 `VectorStore` Bean。你可以使用 Spring AI 统一的 API 写入文档或执行带过滤条件的相似度检索：

```java
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class KnowledgeSearchService {

    private final VectorStore vectorStore;

    public KnowledgeSearchService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    // 1. 写入知识文档
    public void addDocument(String content, String category) {
        Document doc = Document.builder()
            .text(content)
            .metadata(Map.of("category", category, "status", "published"))
            .build();
        vectorStore.add(List.of(doc));
    }

    // 2. 带元数据过滤条件的相似度检索
    public List<Document> search(String query, String targetCategory) {
        FilterExpressionBuilder b = new FilterExpressionBuilder();

        SearchRequest request = SearchRequest.builder()
            .query(query)
            .topK(5)
            .similarityThreshold(0.75)
            // 各向量库适配器自动转换为目标引擎对应的 SQL 或过滤器语法
            .filterExpression(b.eq("category", targetCategory).build())
            .build();

        return vectorStore.similaritySearch(request);
    }
}
```
