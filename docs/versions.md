---
sidebar_position: 2
title: 项目版本说明
sidebar_label: 项目版本说明
description: 了解 Agentic AI 核心框架与 Extensions 的版本口径、Spring Boot 与 Spring AI 版本对应关系。
keywords: [版本, versions, releases, Agentic AI, Spring AI, Spring Boot, 依赖管理]
---

# 项目版本说明

本文说明 Agentic AI 核心框架与 Extensions 的版本口径、Spring Boot 与 Spring AI 适用版本，以及 Maven 依赖坐标。核心框架主要覆盖 `agentic-ai-agent-framework` 与 `agentic-ai-graph-core`；Extensions 覆盖 MCP、Nacos Prompt、Memory、RAG、Vector Store 与 Observation 等 starter。

## 版本口径

Agentic AI fork 自 Spring AI Alibaba。已发布的 `1.x`、`2.0.x` 与 `2.x` 版本用于补齐 fork 之后 Spring AI Alibaba 未发布的版本。迁移版本主要变更 Maven 坐标与 Java package，功能语义和使用方式保持兼容。

refactor 分支中的核心项目已经使用新的命名：

- Maven `groupId`：`io.github.agentic-ai`
- BOM：`agentic-ai-bom`
- Agent Framework：`agentic-ai-agent-framework`
- Graph Core：`agentic-ai-graph-core`
- Java package：`io.github.agentic.spring.ai.*`

Extensions 项目同样使用新的 Maven 坐标：

- Maven `groupId`：`io.github.agentic-ai`
- BOM：`agentic-ai-extensions-bom`
- 模块名：`agentic-ai-*`
- Java package：`io.github.agentic.spring.ai.*`

## 版本对应表

| 项目 | Agentic AI 版本 | Spring AI | Spring Boot | 说明 |
| --- | --- | --- | --- | --- |
| Core | `2.1.0-dev` | `2.0.1` | `4.1.1` | refactor 分支当前开发版本。事实来源：Core `pom.xml`。 |
| Extensions | `2.1.0-dev` | `2.0.0` | `4.1.0` | refactor 分支当前开发版本。事实来源：Extensions `pom.xml`。 |
| Core | `1.1.2.0` | `1.1.2` | `3.5.x` | fork 后补齐发布版本，主要迁移包名与项目坐标。 |
| Core | `1.1.0.0` | `1.1.0` | `3.4.x` | fork 后补齐发布版本，主要迁移包名与项目坐标。 |
| Core | `1.0.x` | `1.0.0` | `3.4.x` | 1.0 基础系列。 |

## 依赖管理

新项目建议通过 Agentic AI BOM 管理核心模块版本，并同时导入匹配的 Spring AI BOM。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.github.agentic-ai</groupId>
            <artifactId>agentic-ai-bom</artifactId>
            <version>2.1.0-dev</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>2.0.1</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>agentic-ai-agent-framework</artifactId>
    </dependency>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>agentic-ai-graph-core</artifactId>
    </dependency>
</dependencies>
```

如果使用已发布的 `1.x` 或 `2.0.x` 迁移版本，请将 `agentic-ai-bom` 与 `spring-ai-bom` 的版本调整为上表对应版本。

Extensions starter 使用 `agentic-ai-extensions-bom` 管理版本。refactor 分支当前对应 Spring AI `2.0.0` 与 Spring Boot `4.1.0`。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.github.agentic-ai</groupId>
            <artifactId>agentic-ai-extensions-bom</artifactId>
            <version>2.1.0-dev</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>agentic-ai-starter-mcp-distributed</artifactId>
    </dependency>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>agentic-ai-starter-nacos-prompt</artifactId>
    </dependency>
</dependencies>
```

## 核心模块

| 模块 | artifactId | 说明 |
| --- | --- | --- |
| Agent Framework | `agentic-ai-agent-framework` | 提供 `ReactAgent`、工具调用、Hook、Interceptor、结构化输出和多智能体编排基础。 |
| Graph Core | `agentic-ai-graph-core` | 提供 `StateGraph`、`CompiledGraph`、状态合并策略、检查点、恢复、流式输出和子图能力。 |

## Extensions 模块

refactor 分支已确认存在以下 starter：

| 能力 | artifactId |
| --- | --- |
| MCP 分布式发现 | `agentic-ai-starter-mcp-distributed` |
| MCP 注册 | `agentic-ai-starter-mcp-registry` |
| MCP 网关 | `agentic-ai-starter-mcp-gateway` |
| MCP 路由 | `agentic-ai-starter-mcp-router` |
| Nacos Prompt | `agentic-ai-starter-nacos-prompt` |
| RAG | `agentic-ai-starter-rag` |
| ARMS Observation | `agentic-ai-starter-arms-observation` |
| Chat Memory | `agentic-ai-starter-model-chat-memory` |
| Mem0 Chat Memory | `agentic-ai-starter-model-chat-memory-mem0` |
| Chat Memory Repository | `agentic-ai-starter-model-chat-memory-repository-redis`、`agentic-ai-starter-model-chat-memory-repository-jdbc`、`agentic-ai-starter-model-chat-memory-repository-mongodb`、`agentic-ai-starter-model-chat-memory-repository-elasticsearch`、`agentic-ai-starter-model-chat-memory-repository-memcached`、`agentic-ai-starter-model-chat-memory-repository-tablestore` |
| Vector Store | `agentic-ai-starter-vector-store-tair`、`agentic-ai-starter-vector-store-opensearch`、`agentic-ai-starter-vector-store-oceanbase`、`agentic-ai-starter-vector-store-tablestore`、`agentic-ai-starter-vector-store-analyticdb` |

## 已知边界

- refactor 分支未确认到 `agentic-ai-starter-a2a-nacos`。A2A 文档只覆盖 Agent Framework 中已经存在的远程 Agent 封装能力。
- Extensions 中部分配置前缀仍沿用 `spring.ai.alibaba.*`，这是当前代码事实；模块名和 Maven 坐标已经改为 `agentic-ai-*`。
