---
sidebar_position: 2
title: 项目版本说明
sidebar_label: 项目版本说明
description: 了解 ARGI 核心框架与 Extensions 的版本口径、Spring Boot 与 Spring AI 版本对应关系。
keywords: [版本, versions, releases, ARGI, Spring AI, Spring Boot, 依赖管理]
---

# 项目版本说明

本文说明 ARGI 核心框架与 Extensions 的版本口径、Spring Boot 与 Spring AI 适用版本，以及 Maven 依赖坐标。核心框架主要覆盖 `argi-agent-framework` 与 `argi-graph-core`；Extensions 覆盖 MCP、Nacos Prompt、Memory、RAG、Vector Store 与 Observation 等 starter。

## 版本口径

ARGI fork 自 Spring AI Alibaba。当前重构版本统一迁移 Maven 坐标、Java package、配置前缀和框架公共类名，功能语义和使用方式保持一致。

refactor 分支中的核心项目已经使用新的命名：

- Maven `groupId`：`io.github.agentic-ai`
- BOM：`argi-bom`
- Agent Framework：`argi-agent-framework`
- Graph Core：`argi-graph-core`
- Java package：`io.github.agentic.ai.*`
- 配置前缀：`argi.*`

Extensions 项目同样使用新的 Maven 坐标：

- Maven `groupId`：`io.github.agentic-ai`
- BOM：`argi-extensions-bom`
- 模块名：`argi-*`
- Java package：`io.github.agentic.ai.*`
- 配置前缀：`argi.*`

## 版本对应表

| 项目 | ARGI 版本 | Spring AI | Spring Boot | 说明 |
| --- | --- | --- | --- | --- |
| Core | `2.1.0-dev` | `2.0.1` | `4.1.1` | refactor 分支当前开发版本。事实来源：Core `pom.xml`。 |
| Extensions | `2.1.0-dev` | `2.0.0` | `4.1.0` | refactor 分支当前开发版本。事实来源：Extensions `pom.xml`。 |
| Core | `1.1.2.0` | `1.1.2` | `3.5.x` | fork 后补齐发布版本，主要迁移包名与项目坐标。 |
| Core | `1.1.0.0` | `1.1.0` | `3.4.x` | fork 后补齐发布版本，主要迁移包名与项目坐标。 |
| Core | `1.0.x` | `1.0.0` | `3.4.x` | 1.0 基础系列。 |

## 依赖管理

新项目建议通过 ARGI BOM 管理核心模块版本，并同时导入匹配的 Spring AI BOM。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.github.agentic-ai</groupId>
            <artifactId>argi-bom</artifactId>
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
        <artifactId>argi-agent-framework</artifactId>
    </dependency>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>argi-graph-core</artifactId>
    </dependency>
</dependencies>
```

如果使用已发布的 `1.x` 或 `2.0.x` 迁移版本，请将 `argi-bom` 与 `spring-ai-bom` 的版本调整为上表对应版本。

Extensions starter 使用 `argi-extensions-bom` 管理版本。refactor 分支当前对应 Spring AI `2.0.0` 与 Spring Boot `4.1.0`。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.github.agentic-ai</groupId>
            <artifactId>argi-extensions-bom</artifactId>
            <version>2.1.0-dev</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>argi-starter-mcp-distributed</artifactId>
    </dependency>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>argi-starter-nacos-prompt</artifactId>
    </dependency>
</dependencies>
```

## 核心模块

| 模块 | artifactId | 说明 |
| --- | --- | --- |
| Agent Framework | `argi-agent-framework` | 提供 `ReactAgent`、工具调用、Hook、Interceptor、结构化输出和多智能体编排基础。 |
| Graph Core | `argi-graph-core` | 提供 `StateGraph`、`CompiledGraph`、状态合并策略、检查点、恢复、流式输出和子图能力。 |

## Extensions 模块

refactor 分支已确认存在以下 starter：

| 能力 | artifactId |
| --- | --- |
| MCP 分布式发现 | `argi-starter-mcp-distributed` |
| MCP 注册 | `argi-starter-mcp-registry` |
| MCP 网关 | `argi-starter-mcp-gateway` |
| MCP 路由 | `argi-starter-mcp-router` |
| Nacos Prompt | `argi-starter-nacos-prompt` |
| RAG | `argi-starter-rag` |
| ARMS Observation | `argi-starter-arms-observation` |
| Chat Memory | `argi-starter-model-chat-memory` |
| Mem0 Chat Memory | `argi-starter-model-chat-memory-mem0` |
| Chat Memory Repository | `argi-starter-model-chat-memory-repository-redis`、`argi-starter-model-chat-memory-repository-jdbc`、`argi-starter-model-chat-memory-repository-mongodb`、`argi-starter-model-chat-memory-repository-elasticsearch`、`argi-starter-model-chat-memory-repository-memcached`、`argi-starter-model-chat-memory-repository-tablestore` |
| Vector Store | `argi-starter-vector-store-tair`、`argi-starter-vector-store-opensearch`、`argi-starter-vector-store-oceanbase`、`argi-starter-vector-store-tablestore`、`argi-starter-vector-store-analyticdb` |
