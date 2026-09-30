---
title: MCP 智能路由与服务管理 (Router)
sidebar_label: MCP 路由
description: 了解 ARGI MCP Router：基于向量存储的 MCP Server 语义搜索、Nacos/DB/File 三重服务发现、定时监控 Watcher 与智能请求代理。
keywords: [Extensions, MCP Router, 语义搜索, 向量存储, 服务代理, 服务发现, 动态路由]
---

# MCP 智能路由与服务管理 (Router)

在包含几十乃至上百个 MCP Server 的大规模智能体应用集群中，如果将所有 Server 里的所有工具无差别全部注入给大模型，会导致严重的上下文膨胀、工具选错（Tool Selection Failure）以及单次请求 Token 暴增。

**`argi-starter-mcp-router`** 提供了**语义感知型智能路由**：根据用户任务的目标语义，在大规模 MCP Server 注册表中精准召回最契合的 Server 与工具子集，并提供统一的反向代理转发。

---

## 核心架构与自动装配流程

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   REST API      │    │  McpRouter       │    │  Vector Store   │
│   Controller    │◄──►│  Service         │◄──►│(SimpleMcpServer │
└─────────────────┘    └──────────────────┘    │  VectorStore)   │
                                │              └─────────────────┘
                                ▼                       ▲
                       ┌──────────────────┐             │
                       │  McpRouterWatcher│     (依赖 EmbeddingModel)
                       │  (定时监控刷新)   │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  McpService      │
                       │  Discovery       │
                       │(Nacos / DB / File│
                       └──────────────────┘
```

1. **自动工具导出（ToolCallbackProvider）**：Starter 自动将 `McpRouterService` 注册为名为 `routerTools` 的 `ToolCallbackProvider` Bean。控制器 Agent 无需额外配置，即可像调用普通工具一样调用路由能力。
2. **向量语义检索底座**：Starter 自动注入 `SimpleMcpServerVectorStore`（依赖容器中的 Spring AI `EmbeddingModel`），实现 Server 描述与意图语义相似度匹配。
3. **多重发现源编排（`discoveryOrder`）**：支持通过 `CompositeMcpServiceDiscovery` 按顺序组合 `nacos`、`database`、`file` 三种发现途径。

---

## 核心功能方法（McpRouterService）

`McpRouterService` 提供的核心工具方法如下：

| 方法/工具名 | 功能说明 |
| --- | --- |
| `searchMcpServer` | 根据任务描述和关键词，在向量库中执行相似度搜索，返回最匹配的 MCP Server 及其工具清单 |
| `addMcpServer` | 动态添加新的 MCP Server 节点到生态系统中 |
| `useTool` | 统一请求代理：将大模型的工具调用透明转发给目标 MCP Server 并返回执行结果 |
| `getAllMcpServers`| 获取当前注册表中所有可用的 MCP Server 状态与清单 |
| `removeMcpServer` | 动态注销指定的 MCP Server |

---

## 快速上手

### 1. 引入依赖

```xml
<dependencies>
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>argi-starter-mcp-router</artifactId>
    </dependency>
    <!-- 需要引入 EmbeddingModel 提供语义向量计算支持 -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
</dependencies>
```

### 2. 基础配置（结合 Nacos）

在 `application.yml` 中指定需要路由监控的服务列表与发现顺序：

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
argi:
  mcp:
    nacos:
      server-addr: 127.0.0.1:8848
      namespace: public
    router:
      enabled: true
      # 发现顺序：按优先级排列
      discovery-order:
        - nacos
        - database
        - file
      # 由 Watcher 定时监听同步的 MCP 服务列表
      service-names:
        - mcp-weather-service
        - mcp-stock-service
        - mcp-payment-service
```

### 3. 配置数据库服务发现源（可选）

若希望通过数据库集中维护各团队注册的 MCP Server 拓扑：

```yaml
argi:
  mcp:
    router:
      database:
        enabled: true
        url: jdbc:mysql://localhost:3306/mcp_registry
        username: root
        password: secret
        driver-class-name: com.mysql.cj.jdbc.Driver
        table-name: mcp_server_info
        max-pool-size: 10
        min-idle: 2
        connection-timeout: 30000
```

---

## 编程实践：在智能体中直接使用 Router 工具

由于 Starter 已将 `routerTools` 注册为 `ToolCallbackProvider`，你可以直接将其绑定给 Agent：

```java
import io.github.agentic.ai.graph.agent.ReactAgent;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class MetaRouterAgentService {

    private final ChatModel chatModel;
    private final ToolCallbackProvider routerTools;

    public MetaRouterAgentService(ChatModel chatModel,
                                  @Qualifier("routerTools") ToolCallbackProvider routerTools) {
        this.chatModel = chatModel;
        this.routerTools = routerTools;
    }

    public String executeComplexTask(String userQuery) {
        // 创建带有路由工具的控制器 Agent
        ReactAgent controllerAgent = ReactAgent.builder()
            .name("meta_controller_agent")
            .model(chatModel)
            .instruction("""
                你是一个超级调度助手。面对用户任务，首先调用 `searchMcpServer` 检索最适合的服务，
                然后通过 `useTool` 调用对应服务的具体工具完成任务。
                """)
            .toolCallbackProviders(routerTools)
            .build();

        return controllerAgent.call(userQuery).getText();
    }
}
```

---

## 配置属性参考

### `argi.mcp.router`
| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | `true` | 是否启用 MCP Router 自动装配 |
| `service-names` | List | `[]` | Watcher 自动同步的 Nacos 服务名列表 |
| `discovery-order` | List | `["nacos"]` | 服务发现源查找优先级（支持 `nacos`、`database`、`file`） |
| `services` | List | `[]` | 静态声明的文件型 MCP Server 清单 |

### `argi.mcp.router.database`
| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | `false` | 是否开启数据库服务发现 |
| `url` | String | - | 数据库连接 JDBC URL |
| `username` | String | - | 数据库用户名 |
| `password` | String | - | 数据库密码 |
| `driver-class-name` | String | `com.mysql.cj.jdbc.Driver` | JDBC 驱动类名 |
| `table-name` | String | `mcp_server_info` | 存储 MCP Server 的数据表名 |
| `query-sql` | String | - | 自定义查询 SQL（可选） |
| `max-pool-size` | Integer | `10` | 数据库连接池最大大小 |
| `min-idle` | Integer | `2` | 最小空闲连接数 |
| `connection-timeout`| Long | `30000` | 连接超时时间（毫秒） |
