---
title: 聊天记忆仓储 (Chat Memory)
sidebar_label: 聊天记忆
description: 深入了解 ARGI Extensions 聊天记忆仓储套件：Redis（支持 Lettuce/Jedis/Redisson 及集群/SSL）、JDBC（支持 MySQL/PG/Oracle/SQLServer/H2/SQLite）、MongoDB、Elasticsearch、Memcached、TableStore 与 Mem0 智能记忆层。
keywords: [Extensions, Chat Memory, Redis, JDBC, MySQL, PostgreSQL, MongoDB, Elasticsearch, Memcached, TableStore, Mem0, 聊天记忆]
---

# 聊天记忆仓储 (Chat Memory)

在多轮会话交互中，大语言模型本身是无状态的，需要外部存储机制保存并提供对话历史上下文。

ARGI Extensions 提供了基于 Spring AI `ChatMemoryRepository` 接口的企业级聊天记忆仓储实现体系。

:::tip 关键架构概念区分
- **Spring AI `ChatMemoryRepository`**（本项目）：面向用户与模型的多轮对话消息（`Message`、`UserMessage`、`AssistantMessage`）流水持久化。
- **Graph Core `CheckpointSaver`**（如 `RedisSaver`）：面向 `StateGraph` 与 `ReactAgent` 的内部状态（`OverAllState`、当前执行节点位置、中断状态）快照持久化。
两者定位不同，但可在同一个智能体应用中无缝结合使用。
:::

---

## Starter 选型总览

| 存储介质 | 对应 Starter 坐标 | 特性与底层支持 |
| --- | --- | --- |
| **基础配置** | `argi-starter-model-chat-memory` | 统一的会话记忆抽象与配置属性模型 |
| **Redis** | `argi-starter-model-chat-memory-repository-redis` | 支持 **Lettuce**、**Jedis**、**Redisson** 三种驱动；支持单机与集群；支持 SSL 加密通信 |
| **JDBC** | `argi-starter-model-chat-memory-repository-jdbc` | 复用 Spring Boot 标准 `DataSource`/`JdbcTemplate`，内置 **MySQL**、**PostgreSQL**、**Oracle**、**SQL Server**、**H2**、**SQLite** 6 种方言适配 |
| **MongoDB** | `argi-starter-model-chat-memory-repository-mongodb` | 基于 Mongo 驱动原生连接与持久化，天然适配灵活消息元数据 |
| **Elasticsearch**| `argi-starter-model-chat-memory-repository-elasticsearch`| 基于 ElasticsearchClient，支持大规模会话的高并发检索与归档 |
| **Memcached** | `argi-starter-model-chat-memory-repository-memcached` | 高性能纯内存缓存，支持自定义序列化与过期淘汰机制 |
| **TableStore** | `argi-starter-model-chat-memory-repository-tablestore` | 阿里云表格存储（NoSQL），分表管理会话与消息索引，高并发与低成本存储 |
| **Mem0 智能记忆**| `argi-starter-model-chat-memory-mem0` | 集成 Mem0 智能记忆平台，提供记忆抽取、向量图谱检索与跨会话用户偏好注入 |

---

## 1. Redis 聊天记忆仓储

支持通过客户端类型参数在不同驱动之间自由切换：

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>argi-starter-model-chat-memory-repository-redis</artifactId>
</dependency>
```

### 单机模式（Lettuce 驱动示例）
```yaml
argi:
  chat:
    memory:
      repository:
        redis:
          enabled: true
          client-type: lettuce   # 可选: lettuce / jedis / redisson
          mode: standalone       # 可选: standalone / cluster
          host: ${REDIS_HOST:localhost}
          port: ${REDIS_PORT:6379}
          database: 0
          password: ${REDIS_PASSWORD:}
          timeout: 2000
          key-prefix: "agentic:chat:"
```

### 集群模式与 SSL 加密
```yaml
argi:
  chat:
    memory:
      repository:
        redis:
          enabled: true
          client-type: redisson
          mode: cluster
          cluster:
            nodes:
              - 192.168.1.10:6379
              - 192.168.1.11:6379
              - 192.168.1.12:6379
            max-redirects: 5
          ssl:
            enabled: true
```

---

## 2. JDBC 关系型数据库仓储

JDBC 仓储直接复用 Spring Boot 标准的 `DataSource` 和 `JdbcTemplate`，仅需配置对应方言的启用开关和建表选项即可：

```xml
<dependencies>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>argi-starter-model-chat-memory-repository-jdbc</artifactId>
    </dependency>
    <!-- 引入对应数据库驱动，如 MySQL 或 PostgreSQL -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-jdbc</artifactId>
    </dependency>
</dependencies>
```

### 数据库连接与方言启用配置
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ai_database?useUnicode=true&characterEncoding=utf8
    username: root
    password: secret
    driver-class-name: com.mysql.cj.jdbc.Driver
argi:
  chat:
    memory:
      repository:
        # 支持 mysql / postgresql / oracle / sqlserver / h2 / sqlite
        mysql:
          enabled: true
          initialize-schema: true  # 首次启动是否自动初始化记忆表结构
```

---

## 3. MongoDB 仓储

```yaml
argi:
  chat:
    memory:
      repository:
        mongodb:
          enabled: true
          host: 127.0.0.1
          port: 27017
          user-name: root
          password: secret
          auth-database-name: admin
          database-name: spring_ai
```

---

## 4. Elasticsearch 仓储

```yaml
argi:
  chat:
    memory:
      repository:
        elasticsearch:
          enabled: true
          host: localhost
          port: 9200
          index: chat_memory_index
          query-field: content
          max-results: 20
          scheme: http
```

---

## 5. TableStore 表格存储仓储

阿里云 TableStore 采用会话主表与消息从表分离架构，并支持二级索引加速：

```yaml
argi:
  chat:
    memory:
      repository:
        tablestore:
          enabled: true
          endpoint: https://your-instance.cn-hangzhou.ots.aliyuncs.com
          instance-name: your-instance
          access-key-id: ${OTS_AK}
          access-key-secret: ${OTS_SK}
          session-table-name: session
          session-secondary-index-name: session_secondary_index
          message-table-name: message
          message-secondary-index-name: message_secondary_index
```

---

## 6. Mem0 智能记忆层集成

Mem0 不仅存储会话字符串，还能从对话中提取出用户的个人偏好、长期事实与实体图谱，并通过 `Mem0ChatMemoryAdvisor` 自动注入：

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>argi-starter-model-chat-memory-mem0</artifactId>
</dependency>
```

```yaml
argi:
  chat:
    memory:
      mem0:
        client:
          base-url: http://localhost:8888
          timeout-seconds: 30
          enable-cache: true
          max-retry-attempts: 3
          async:
            enabled: true
            core-pool-size: 2
            max-pool-size: 4
        server:
          version: "v1.1"
          llm:
            provider: openai
            config:
              api-key: ${OPENAI_API_KEY}
              model: gpt-4.1-mini
```

---

## 结合 Graph Core Checkpoint 混合架构

在生产应用中，推荐将 `ChatMemory` 与 Graph Core 的 `RedisSaver` 一同使用：

```java
import io.github.agentic.ai.graph.RunnableConfig;
import io.github.agentic.ai.graph.agent.ReactAgent;
import io.github.agentic.ai.graph.checkpoint.savers.redis.RedisSaver;

// 1. RedisSaver 负责持久化 Agent 决策循环与图节点状态
ReactAgent agent = ReactAgent.builder()
    .name("customer_service_agent")
    .model(chatModel)
    .saver(new RedisSaver(redissonClient))
    .build();

// 2. 指定会话 ID 执行
RunnableConfig config = RunnableConfig.builder()
    .threadId("session_user_8848")
    .build();

agent.call("帮我查询昨天的账单。", config);
```
