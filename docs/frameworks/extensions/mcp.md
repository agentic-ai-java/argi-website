---
title: MCP 分布式发现与服务注册
sidebar_label: MCP 发现与注册
description: 使用 Extensions 的 MCP Distributed 和 Registry 模块，基于 Nacos 注册中心实现 MCP 服务的动态发现、无状态注册、分布式追踪以及向 ReAct Agent 注入远程工具。
keywords: [Extensions, MCP, Model Context Protocol, Nacos, ToolCallbackProvider, ReAct Agent, 服务发现, 服务注册, 分布式追踪]
---

# MCP 分布式发现与服务注册

**Model Context Protocol (MCP)** 是一种开放协议，旨在统一大语言模型（LLM）与外部数据源及工具服务之间的交互。在分布式微服务架构中，随着 MCP Server 数量的增长，静态配置每个 Server 的网络地址与端口已无法满足敏捷运维需求。

Agentic AI Extensions 提供了基于 **Nacos** 的 MCP 自动化服务注册与分布式发现套件：
- **`agentic-ai-starter-mcp-distributed`**：面向客户端/调用方，动态从 Nacos 发现远程 MCP Server，并暴露为 Spring AI 标准的 `ToolCallbackProvider`。
- **`agentic-ai-starter-mcp-registry`**：面向 MCP Server 提供方，自动将本地工具服务及其 JSON Schema 注册至 Nacos。

---

## 协议与传输支持

分布式客户端支持两种基于 HTTP 的网络传输模式：
1. **Server-Sent Events (SSE)**：基于长连接流式通道推送通知与事件，支持高实时性交互。
2. **Streamable HTTP**：支持流式双向通信，适用于大规模数据块与复杂请求传输。

底层均由 Spring WebFlux 响应式异步客户端（`WebFluxSseClientTransportBuilder` / `WebFluxStreamableClientTransportBuilder`）驱动，同时提供同步与异步两套适配封装：
- `DistributedSyncMcpClient` / `DistributedAsyncMcpClient`
- `DistributedSyncMcpToolCallbackProvider` / `DistributedAsyncMcpToolCallbackProvider`

---

## 场景一：分布式 MCP 服务发现（Client 端）

### 1. 引入 Starter

```xml
<dependencies>
    <!-- Extensions BOM 已在 dependencyManagement 中引入 -->
    <dependency>
        <groupId>io.github.agentic-ai</groupId>
        <artifactId>agentic-ai-starter-mcp-distributed</artifactId>
    </dependency>
    <!-- Spring AI 模型实现（以 OpenAI 兼容协议为例） -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
</dependencies>
```

### 2. 声明式配置 Nacos 发现

在 `application.yml` 中声明 Nacos 注册中心地址，以及期望监听发现的 MCP Server 服务名与传输方式：

```yaml
spring:
  ai:
    mcp:
      client:
        type: async  # 可选 sync / async
    alibaba:
      mcp:
        nacos:
          server-addr: ${NACOS_SERVER_ADDR:127.0.0.1:8848}
          namespace: ${NACOS_NAMESPACE:public}
          username: ${NACOS_USERNAME:}
          password: ${NACOS_PASSWORD:}
          client:
            enabled: true
            lazy-init: false
            # SSE 协议服务列表
            sse:
              connections:
                train-service:
                  service-name: mcp-train-service
                  version: 1.0.0
            # Streamable HTTP 协议服务列表
            streamable:
              connections:
                map-service:
                  service-name: mcp-map-service
                  version: 1.0.0
```

### 3. 在 ReAct Agent 中直接使用发现到的远程工具

Starter 会根据 Nacos 中注册的 MCP Server 元数据自动生成 Spring AI `ToolCallbackProvider` Bean。你可以将其直接注入到 `ReactAgent` 中：

```java
import io.github.agentic.spring.ai.graph.agent.ReactAgent;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.stereotype.Service;

@Service
public class RemoteMcpAgentService {

    private final ChatModel chatModel;
    private final ToolCallbackProvider toolCallbackProvider;

    public RemoteMcpAgentService(ChatModel chatModel, ToolCallbackProvider toolCallbackProvider) {
        this.chatModel = chatModel;
        this.toolCallbackProvider = toolCallbackProvider;
    }

    public AssistantMessage execute(String userRequest) {
        // 创建带有远程 MCP 工具的 Agent
        ReactAgent agent = ReactAgent.builder()
            .name("distributed_mcp_agent")
            .model(chatModel)
            .instruction("你是一个助手，必要时调用远程发现的 MCP 工具查询实时信息。")
            .toolCallbackProviders(toolCallbackProvider)
            .build();

        return agent.call(userRequest);
    }
}
```

---

## 场景二：MCP Server 自动注册（Server 端）

如果你正在开发一个 MCP Server，希望对外发布工具并自动登记到 Nacos 供其他智能体调用，可使用 `agentic-ai-starter-mcp-registry`。

### 1. 引入 Starter

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>agentic-ai-starter-mcp-registry</artifactId>
</dependency>
```

### 2. 配置注册信息

```yaml
spring:
  ai:
    alibaba:
      mcp:
        nacos:
          server-addr: 127.0.0.1:8848
          namespace: public
          register:
            enabled: true              # 开启自动注册条件
            service-register: true     # 启用注册行为
            service-ephemeral: true    # 注册为临时实例
            service-name: mcp-calculator-service
            service-group: DEFAULT_GROUP
            port: 8080
            host: 127.0.0.1            # 可选，默认读取本地 IP 或 NACOS_MCP_SERVER_HOST 环境变量
            sse-export-context-path: /mcp
```

### 3. 核心机制

- **标准有状态与无状态（Stateless）双重注册支持**：
  - 普通 MCP Server：由 `NacosMcpRegisterAutoConfiguration` 完成自动注册。
  - 无状态 MCP Server：当启用 `McpServerStatelessAutoConfiguration` 时，`NacosStatelessMcpRegisterAutoConfiguration` 会通过反射提取 `McpStatelessAsyncServer` 并自动完成 Nacos 服务发布。
- **Schema 兼容性校验**：内置 `JsonSchemaUtil`，自动对工具方法的输入输出参数进行 JSON Schema 规范校验（返回 `CheckCompatibleResult`），防止由于客户端与服务端 Schema 演进不一致引发调用故障。
- **分布式链路追踪**：`McpTracingAutoConfiguration` 在检测到类路径存在 Micrometer `Tracer` 时，会自动向 WebClient 注入 `McpTraceExchangeFilterFunction`，在客户端发起 MCP 调用时自动透传分布式 TraceId 与 SpanId。

---

## 配置属性参考

### `spring.ai.alibaba.mcp.nacos`
| 参数项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `server-addr` | String | `127.0.0.1:8848` | Nacos 服务器连接地址 |
| `namespace` | String | `public` | Nacos 命名空间 ID |
| `username` | String | 空 | Nacos 认证用户名 |
| `password` | String | 空 | Nacos 认证密码 |

### `spring.ai.alibaba.mcp.nacos.client`
| 参数项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | `true` | 是否启用 MCP 客户端发现功能 |
| `lazy-init` | Boolean | `false` | 是否延迟初始化连接（若为 false 则应用启动即连接） |
| `sse.connections.<name>.service-name` | String | - | 监听的 SSE 服务名 |
| `sse.connections.<name>.version` | String | - | 监听的 SSE 服务版本 |
| `streamable.connections.<name>.service-name` | String | - | 监听的 Streamable 服务名 |
| `streamable.connections.<name>.version` | String | - | 监听的 Streamable 服务版本 |

### `spring.ai.alibaba.mcp.nacos.register`
| 参数项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | `false` | 自动装配总开关（需显式置为 `true` 生效） |
| `service-register` | Boolean | `true` | 是否向 Nacos 发送注册请求 |
| `service-ephemeral` | Boolean | `true` | 是否注册为 Nacos 临时节点 |
| `service-name` | String | - | 注册到 Nacos 的 MCP 服务名称 |
| `service-group` | String | `DEFAULT_GROUP` | Nacos 分组名称 |
| `port` | Integer | `-1` | 暴露的 MCP 协议端口（为 -1 时自动从环境变量或容器端口解析） |
| `host` | String | 空 | 本机 IP（可选，默认自动探测或取 `NACOS_MCP_SERVER_HOST`） |
| `sse-export-context-path` | String | 空 | SSE 导出路径前缀（默认自动读取 `server.servlet.context-path`） |
