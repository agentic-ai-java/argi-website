---
title: Extensions 概览
sidebar_label: 概览
description: 深入了解 Agentic AI Extensions 生态扩展组件库：统一 BOM、20 个核心 Starter 清单、配置前缀映射与架构集成指南。
keywords: [Extensions, MCP, Nacos, Prompt, Memory, RAG, Vector Store, ARMS, Starter, BOM]
---

# Extensions 概览

**Agentic AI Extensions** 是面向企业级 Java AI 应用的 Spring Boot 扩展组件库。它不替代底层图引擎（`Graph Core`）与智能体抽象（`ReAct Agent`），而是作为外部系统与周边生态的“连接器”与“能力增强包”，为智能体应用补齐 MCP 协议互联、海量聊天记忆持久化、企业级向量检索、高级 RAG 检索增强、动态提示词热更新以及全链路可观测性等生产就绪能力。

所有扩展模块均采用标准 Spring Boot Starter 与自动装配规范设计，开箱即用。

---

## 依赖管理（BOM）

为避免不同模块间的版本冲突，建议通过 `agentic-ai-extensions-bom` 统一管理所有扩展模块依赖版本：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.github.agentic-ai</groupId>
            <artifactId>agentic-ai-extensions-bom</artifactId>
            <version>${agentic-ai-extensions.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

在引入具体 Starter 时即可省略 `<version>` 标签。

---

## 20 个 Starter 全景清单

Extensions 当前代码库（版本 `2.1.0-dev`）共提供 **20 个独立 Starter**，按生态领域分类如下：

| 生态领域 | 对应 Starter 坐标 | 核心功能与适配实现 |
| --- | --- | --- |
| **MCP 生态** | `agentic-ai-starter-mcp-distributed` | 基于 Nacos 动态发现 SSE / Streamable HTTP 类型的 MCP Server，暴露为 Spring AI `ToolCallbackProvider` |
| | `agentic-ai-starter-mcp-registry` | 将本地 MCP Server 自动注册至 Nacos 注册中心，支持无状态（Stateless）注册与工具 Schema 校验 |
| | `agentic-ai-starter-mcp-gateway` | MCP 统一流量网关，支持 WebFlux/WebMvc 双栈、多 Server 聚合代理转发、OAuth 2.0 客户端认证与 JSON 模板解析 |
| | `agentic-ai-starter-mcp-router` | 基于向量存储的 MCP Server 语义搜索路由、动态服务注册、统一工具请求代理与定时 Watcher 监控 |
| **聊天记忆**<br/>**(Chat Memory)** | `agentic-ai-starter-model-chat-memory` | 基础 Chat Memory 自动装配与通用配置模型 |
| | `agentic-ai-starter-model-chat-memory-repository-redis` | Redis 会话记忆仓储，支持 Lettuce、Jedis、Redisson 客户端，支持单机、集群与 SSL |
| | `agentic-ai-starter-model-chat-memory-repository-jdbc` | 关系型数据库通用记忆仓储，内置 MySQL、PostgreSQL、Oracle、SQL Server、H2、SQLite 方言实现 |
| | `agentic-ai-starter-model-chat-memory-repository-mongodb` | 基于 Spring Data MongoDB 的会话文档化存储 |
| | `agentic-ai-starter-model-chat-memory-repository-elasticsearch` | 基于 Elasticsearch 客户端的高并发消息仓储 |
| | `agentic-ai-starter-model-chat-memory-repository-memcached` | 高性能内存级 Memcached 聊天记忆存储 |
| | `agentic-ai-starter-model-chat-memory-repository-tablestore` | 阿里云表格存储（TableStore）高可靠 NoSQL 记忆仓储 |
| | `agentic-ai-starter-model-chat-memory-mem0` | Mem0 智能记忆层集成，提供会话与用户维度的长期记忆提取与上下文增强 |
| **向量存储**<br/>**(Vector Store)** | `agentic-ai-starter-vector-store-analyticdb` | 阿里云 AnalyticDB for PostgreSQL / MySQL 向量检索适配器 |
| | `agentic-ai-starter-vector-store-oceanbase` | 蚂蚁集团 OceanBase 分布式数据库向量检索适配器 |
| | `agentic-ai-starter-vector-store-opensearch` | 阿里云 OpenSearch 开放搜索向量版集成 |
| | `agentic-ai-starter-vector-store-tablestore` | 阿里云表格存储（TableStore）向量索引支持 |
| | `agentic-ai-starter-vector-store-tair` | 阿里云内存数据库 Tair 向量引擎适配器 |
| **检索增强 (RAG)** | `agentic-ai-starter-rag` | 包含 Elasticsearch 混合检索（KNN + BM25 + RRF 融合打分）、HyDE 假设性文档检索与多模式 Advisors |
| **动态提示词** | `agentic-ai-starter-nacos-prompt` | 基于 Nacos 配置中心的 Prompt Template 动态热更新机制（无需重启应用） |
| **应用可观测性** | `agentic-ai-starter-arms-observation` | 阿里云 ARMS（应用实时监控服务）与 OpenTelemetry 桥接，支持模型与工具调用的全链路追踪与指标度量 |

---

## 配置前缀与规范

Extensions 遵循严格的属性前缀命名规范，各模块配置前缀汇总如下：

| 功能模块 | 对应 Spring Boot 配置前缀 | 说明 |
| --- | --- | --- |
| **Nacos MCP 基础** | `spring.ai.alibaba.mcp.nacos` | Nacos 服务器连接地址、命名空间、鉴权等 |
| **MCP Client (分布式发现)** | `spring.ai.alibaba.mcp.nacos.client` | 客户端总开关、lazy-init、连接池等 |
| **MCP SSE Client** | `spring.ai.alibaba.mcp.nacos.client.sse` | SSE 类型的 MCP 客户端连接与服务名映射 |
| **MCP Streamable Client** | `spring.ai.alibaba.mcp.nacos.client.streamable` | Streamable HTTP 类型的 MCP 客户端连接配置 |
| **MCP 注册** | `spring.ai.alibaba.mcp.nacos.register` | 本地 MCP Server 注册到 Nacos 的服务名、端口与元数据 |
| **MCP 网关** | `spring.ai.alibaba.mcp.gateway` | 网关代理路径、跨域、多 Server 聚合配置 |
| **MCP 网关 OAuth 认证** | `spring.ai.alibaba.mcp.gateway.oauth` | OAuth 2.0 客户端模式（`client-id`、`client-secret`、`token-uri`、`token-cache`、`retry`） |
| **MCP 智能路由** | `spring.ai.alibaba.mcp.router` | 路由服务发现顺序（`discovery-order`）、服务名列表、数据库路由配置 |
| **Chat Memory 基础** | `spring.ai.chat.memory` | 默认会话保留轮数等通用配置 |
| **Chat Memory - Redis** | `spring.ai.chat.memory.repository.redis` | Redis 连接、键前缀、客户端类型（`lettuce`/`jedis`/`redisson`）、集群与 SSL |
| **Chat Memory - JDBC** | `spring.ai.chat.memory.repository.mysql`<br/>`spring.ai.chat.memory.repository.postgresql`<br/>`spring.ai.chat.memory.repository.oracle`<br/>`spring.ai.chat.memory.repository.sqlserver`<br/>`spring.ai.chat.memory.repository.h2`<br/>`spring.ai.chat.memory.repository.sqlite` | 复用 Spring Boot 标准数据源，配置对应方言的 `enabled` 与 `initialize-schema` |
| **Chat Memory - MongoDB** | `spring.ai.chat.memory.repository.mongodb` | `host`、`port`、`userName`、`password`、`authDatabaseName`、`databaseName` |
| **Chat Memory - ES** | `spring.ai.chat.memory.repository.elasticsearch` | `host`、`port`、`nodes`、`index`、`queryField`、`maxResults`、`scheme` |
| **Chat Memory - Memcached** | `spring.ai.chat.memory.repository.memcached` | `host` 与 `port` |
| **Chat Memory - TableStore** | `spring.ai.chat.memory.repository.tablestore` | `endpoint`、`instanceName`、`accessKeyId`、`accessKeySecret`、`sessionTableName`、`messageTableName` |
| **Chat Memory - Mem0** | `spring.ai.chat.memory.mem0` | `client` 配置（`base-url`、`async`）与 `server` 配置（`llm`、`embedder`、`vectorStore`、`graphStore`） |
| **Vector Store** | `spring.ai.vectorstore.analyticdb`<br/>`spring.ai.vectorstore.oceanbase`<br/>`spring.ai.vectorstore.opensearch`<br/>`spring.ai.vectorstore.tablestore`<br/>`spring.ai.vectorstore.tair` | 各向量数据库的端点、索引名/集合名、维度、距离函数与专属认证参数 |
| **RAG Elasticsearch** | `spring.ai.alibaba.rag.elasticsearch` | 检索类型（BM25/KNN/HYBRID）、RRF 开关与权重偏置、召回阈值 |
| **Nacos Prompt** | `spring.ai.nacos.prompt.template` | 提示词模板 DataId、Group 与动态刷新开关 |
| **ARMS 可观测性** | `spring.ai.alibaba.arms` | ARMS 监控开关、模型输入输出采集开关（`capture-input`/`capture-output`）、语义模式（`OPEN_TELEMETRY`/`LANGFUSE`）、工具监控开关 |

---

## 与核心框架的关系

Extensions 旨在与 `Graph Core` 和 `ReAct Agent` 紧密配合：

```
┌────────────────────────────────────────────────────────┐
│             应用业务层 (Spring Boot Application)        │
└───────────┬────────────────────────────────┬───────────┘
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│  ReAct Agent 框架     │        │    Graph Core 引擎    │
│  (ReactAgent, Hooks)  │        │ (StateGraph, Checkpoint)│
└───────────┬───────────┘        └───────────┬───────────┘
            │                                │
            └────────────────┬───────────────┘
                             ▼
 ┌───────────────────────────────────────────────────────────┐
 │                 Agentic AI Extensions                     │
 │ ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
 │ │  MCP 生态   │ │  记忆与存储  │ │   RAG 检索增强       │ │
 │ │(网关/路由/  │ │(Redis/JDBC/  │ │(Hybrid Search /      │ │
 │ │ 分布式发现) │ │ 5大向量库)   │ │ HyDE / Advisors)     │ │
 │ └─────────────┘ └──────────────┘ └──────────────────────┘ │
 │ ┌──────────────────────────────┐ ┌──────────────────────┐ │
 │ │      Nacos 动态提示词        │ │   ARMS 全链路可观测   │ │
 │ └──────────────────────────────┘ └──────────────────────┘ │
 └───────────────────────────────────────────────────────────┘
```

1. **远程工具扩展**：使用 `agentic-ai-starter-mcp-distributed` 从 Nacos 动态发现微服务导出的 MCP 工具，通过 `ReactAgent.builder().toolCallbackProviders(...)` 无缝注入智能体。
2. **多模态记忆**：Spring AI 的 `ChatMemoryRepository` 负责存储用户交互消息历史，而 Graph Core 的 `CheckpointSaver`（如 `RedisSaver`）负责保存图或 Agent 执行的状态快照。两者相辅相成。
3. **企业知识接入**：通过 5 大向量存储和 `agentic-ai-starter-rag` 构建混合检索，智能体可通过 Hook 预加载知识库，或以工具调用形式自主按需检索（Agentic RAG）。
4. **运行时热更与监控**：通过 Nacos 动态修改 System Prompt，通过 ARMS 实时追踪每次 LLM 调用与工具执行的消耗与性能。
