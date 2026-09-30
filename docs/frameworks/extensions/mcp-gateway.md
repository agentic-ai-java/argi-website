---
title: MCP 服务网关 (Gateway)
sidebar_label: MCP 网关
description: 深入了解 ARGI MCP Gateway：统一流量入口、多 Server 聚合代理、WebFlux/WebMvc 双栈支持、OAuth 2.0 认证与 JSON 响应模板转换。
keywords: [Extensions, MCP Gateway, 网关, OAuth2, WebFlux, WebMvc, MultiServer, Nacos]
---

# MCP 服务网关 (Gateway)

随着企业内模型与工具服务数量的快速增长，直接让每个智能体与散落各处的后端 MCP Server 直连会导致拓扑混乱、鉴权分散、安全不可控等问题。

**`argi-starter-mcp-gateway`** 提供了统一的企业级 MCP 流量入口网关，承担工具聚合、权限校验、多后端代理和数据转换等职责。

---

## 核心功能特性

1. **多协议与多虚拟 Server 聚合模式（Multi-Server Mode）**：
   - 允许单个网关进程按配置暴露多个独立的虚拟 MCP Server 实例（支持不同端点路径、独立的 Nacos 服务订阅和工具集）；
   - 支持遗留的 SSE 传输协议（`transport: SSE`）与最新的流式 HTTP 协议（`transport: STREAMABLE`，MCP spec 2025-03-26）。
2. **WebFlux 与 WebMvc 双栈兼容**：
   - 响应式环境自动装配 `WebFluxMultiServerMcpGatewayManager`；
   - 传统 Servlet/Spring MVC 环境自动装配 `WebMvcMultiServerMcpGatewayManager`。
3. **Outbound 协议与连接器定制**：
   - 支持通过 `webclient-connector` 切换连接器实现：`default`、`jdk`（JDK HttpClient）、`netty-reactor`（Reactor Netty）；
   - 支持通过 `webclient-connector-protocol` 细粒度指定 HTTP 协议版本：`default`、`http1`、`http2`、`h2c`（明文 HTTP/2）、`http3`、`alpn`。
4. **OAuth 2.0 客户端凭证安全认证**：
   - 内置 `McpGatewayOAuthInterceptor` 与 `McpGatewayOAuthTokenManager`；
   - 支持标准 `client_credentials` 模式，具备令牌内存缓存（`TokenCache`）、提前自动续期（默认提前 5 分钟刷新）以及调用失败指数退避重试（`Retry`）。
5. **请求与响应模板转换（JSON Template）**：
   - 内置 `RequestTemplateParser` 与 `ResponseTemplateParser`；
   - 在网关层对参数与返回数据进行清洗或格式映射，实现上游契约与下游实际接口的解耦。
6. **动态感知与热更新**：
   - 配合 Nacos 配置中心（`NacosMcpGatewayToolsWatcher`），无需重启即可热更新网关工具清单。

---

## 快速上手

### 1. 引入依赖

```xml
<dependency>
    <groupId>io.github.agentic-ai</groupId>
    <artifactId>argi-starter-mcp-gateway</artifactId>
</dependency>
```

### 2. Multi-Server 模式聚合配置示例

在 `application.yml` 中声明网关属性及多个后端的聚合代理：

```yaml
argi:
  mcp:
    gateway:
      enabled: false  # 单实例默认网关关闭，启用 multi-server 模式
      tool-timeout: 30s
      webclient-connector: default
      multi-server:
        enabled: true
        servers:
          - name: finance-server
            transport: SSE
            sse-endpoint: /mcp/finance/sse
            message-endpoint: /mcp/finance/message
            server-name: mcp-gateway-finance
            server-version: 1.0.0
            service-names:
              - nacos-mcp-invoice-service
              - nacos-mcp-tax-service
          - name: operation-server
            transport: STREAMABLE
            mcp-endpoint: /mcp/ops/mcp
            server-name: mcp-gateway-ops
            server-version: 1.0.0
            service-names:
              - nacos-mcp-log-service
              - nacos-mcp-deploy-service
```

---

## 进阶：配置 OAuth 2.0 客户端鉴权

如果网关上游或后端 MCP Server 受到 OAuth 保护，网关可自动完成凭证获取与请求签名：

```yaml
argi:
  mcp:
    gateway:
      oauth:
        enabled: true
        provider:
          client-id: ${MCP_CLIENT_ID}
          client-secret: ${MCP_CLIENT_SECRET}
          token-uri: https://auth.company.com/oauth2/token
          authorization-uri: https://auth.company.com/oauth2/authorize
          scope: "read,write"
          grant-type: client_credentials
        token-cache:
          enabled: true
          refresh-before-expiry: 5m
          max-size: 1000
        retry:
          max-attempts: 3
          backoff: 1s
```

`McpGatewayOAuthTokenManager` 将在发起 HTTP 请求时通过拦截器自动加上 `Authorization: Bearer <token>` 请求头。

---

## 核心配置属性清单

### `argi.mcp.gateway`
| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | `true` | 是否启用单实例网关 |
| `registry` | String | `nacos` | 注册中心类型 |
| `message-endpoint` | String | `/message` | 默认消息端点路径 |
| `tool-timeout` | Duration | `30s` | 单次工具调用下游响应超时时间 |
| `webclient-connector` | String | `default` | 出站 WebClient 连接器（`default`、`jdk`、`netty-reactor`） |
| `webclient-connector-protocol` | String | `default` | 出站 HTTP 协议（`default`、`http1`、`http2`、`h2c`、`http3`、`alpn`） |
| `sse.enabled` | Boolean | `true` | 是否启用 SSE 模式 |
| `sse.endpoint` | String | `/sse` | SSE 连接端点 |
| `sse.sse-message-endpoint` | String | `/mcp/message` | SSE 消息处理端点 |
| `streamable.enabled` | Boolean | `false` | 是否启用 Streamable HTTP 模式 |
| `streamable.mcp-endpoint` | String | `/mcp` | Streamable 统一定义端点 |

### `argi.mcp.gateway.multi-server`
| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | `false` | 是否开启 Multi-Server 模式 |
| `servers[].name` | String | - | 虚拟 MCP Server 逻辑标识 |
| `servers[].transport` | String | `SSE` | 传输协议类型（`SSE` 或 `STREAMABLE`） |
| `servers[].sse-endpoint` | String | `/sse` | SSE 端点路径 |
| `servers[].message-endpoint`| String | `/mcp/message`| 消息端点路径 |
| `servers[].mcp-endpoint` | String | `/mcp` | Streamable 统一点路径 |
| `servers[].server-name` | String | - | 暴露出的 MCP 服务名 |
| `servers[].service-names` | List | - | 从 Nacos 订阅并聚合的微服务列表 |

### `argi.mcp.gateway.oauth`
| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | `false` | 是否启用 OAuth 2.0 鉴权 |
| `provider.client-id` | String | - | 客户端凭证 ID |
| `provider.client-secret` | String | - | 客户端凭证密钥 |
| `provider.token-uri` | String | - | Token 签发端点 URL |
| `provider.scope` | String | `read` | 授权作用域范围 |
| `provider.grant-type` | String | `client_credentials` | 授权类型 |
| `token-cache.refresh-before-expiry` | Duration | `5m` | 提前刷新令牌的缓冲窗口 |
| `retry.max-attempts` | Integer | `3` | 获取 Token 失败最大重试次数 |
