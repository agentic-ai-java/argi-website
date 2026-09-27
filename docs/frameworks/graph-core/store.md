---
title: Store 长期记忆
sidebar_label: Store 长期记忆
description: 了解 Graph Core Store 接口、命名空间、搜索、分页和内置 Store 实现。
keywords: [Graph, Store, 长期记忆, MemoryStore, FileSystemStore, RedisStore, MongoStore, DatabaseStore]
---

# Store 长期记忆

`Store` 是 Graph Core 的长期记忆接口，用于跨会话保存结构化数据。它不同于 checkpoint saver：checkpoint saver 保存一次图执行的状态快照，Store 保存应用或用户层面的长期数据，例如用户偏好、外部检索结果索引、业务画像或可复用上下文。

## 核心模型

| 类型 | 说明 |
| --- | --- |
| `Store` | 长期记忆接口，提供写入、读取、删除、搜索、列出 namespace、清空、计数等操作。 |
| `StoreItem` | 单条数据，包含 `namespace`、`key`、`value`、`createdAt`、`updatedAt`。 |
| `StoreSearchRequest` | 搜索请求，支持 namespace、query、filter、sortFields、ascending、offset、limit。 |
| `StoreSearchResult` | 搜索结果，包含命中的 `StoreItem` 列表和分页信息。 |
| `NamespaceListRequest` | namespace 查询请求，支持 prefix、maxDepth、offset、limit。 |

`namespace` 是层级路径，类型是 `List<String>`。同一个 namespace 内通过 `key` 唯一定位数据。

## 内置实现

refactor 分支当前可确认的实现如下：

| 实现 | 说明 |
| --- | --- |
| `MemoryStore` | 基于内存的实现，适合测试、开发或轻量场景，进程重启后数据丢失。 |
| `FileSystemStore` | 将 `StoreItem` 作为 JSON 文件保存在本地目录中，适合单节点文件系统持久化。 |
| `RedisStore` | Redis-like 内存实现，当前代码使用内存 Map 模拟 Redis 行为。生产 Redis 集成应替换为真实 Redis 客户端实现。 |
| `MongoStore` | MongoDB-like 内存实现，当前代码使用内存 Map 模拟 MongoDB 行为。生产 MongoDB 集成应替换为真实 MongoDB 客户端实现。 |
| `DatabaseStore` | JDBC 实现，源码中已标记 `@Deprecated(since = "2.1.0", forRemoval = true)`，注释建议迁移到 `agentic-ai-graph-persistence-jdbc` 中的替代实现。 |

## 写入与读取

```java
import io.github.agentic.spring.ai.graph.store.Store;
import io.github.agentic.spring.ai.graph.store.StoreItem;
import io.github.agentic.spring.ai.graph.store.stores.MemoryStore;

import java.util.List;
import java.util.Map;
import java.util.Optional;

Store store = new MemoryStore();

store.putItem(StoreItem.of(
    List.of("users", "alice", "preferences"),
    "ui",
    Map.of("theme", "dark", "language", "en-US")
));

Optional<StoreItem> item = store.getItem(
    List.of("users", "alice", "preferences"),
    "ui"
);
```

## 搜索与列出 namespace

```java
import io.github.agentic.spring.ai.graph.store.NamespaceListRequest;
import io.github.agentic.spring.ai.graph.store.StoreSearchRequest;
import io.github.agentic.spring.ai.graph.store.StoreSearchResult;

StoreSearchRequest searchRequest = StoreSearchRequest.builder()
    .namespace("users", "alice")
    .query("dark")
    .limit(10)
    .build();

StoreSearchResult result = store.searchItems(searchRequest);

List<String> namespaces = store.listNamespaces(
    NamespaceListRequest.builder()
        .namespace("users")
        .maxDepth(2)
        .build()
);
```

## 在 Graph 中使用 Store

Store 可以在编译期配置，也可以在单次运行中通过 `RunnableConfig` 提供。

```java
import io.github.agentic.spring.ai.graph.CompileConfig;
import io.github.agentic.spring.ai.graph.RunnableConfig;
import io.github.agentic.spring.ai.graph.store.stores.MemoryStore;

MemoryStore store = new MemoryStore();

CompiledGraph graph = stateGraph.compile(
    CompileConfig.builder()
        .store(store)
        .build()
);

RunnableConfig config = RunnableConfig.builder()
    .threadId("alice-session")
    .store(store)
    .build();

graph.invoke(Map.of("input", "remember my preference"), config);
```

如果节点需要读取 Store，可以使用带 `RunnableConfig` 的节点动作，并从 `config.store()` 取得当前 Store。

```java
import static io.github.agentic.spring.ai.graph.action.AsyncNodeActionWithConfig.node_async;

stateGraph.addNode("load_memory", node_async((state, config) -> {
    return config.store()
        .getItem(List.of("users", "alice", "preferences"), "ui")
        .map(item -> Map.<String, Object>of("preference", item.getValue()))
        .orElseGet(Map::of);
}));
```

## 与 checkpoint saver 的区别

| 项目 | Store | checkpoint saver |
| --- | --- | --- |
| 目标 | 保存长期业务记忆。 | 保存图执行状态快照。 |
| 主要键 | `namespace` + `key`。 | `threadId` + `checkPointId`。 |
| 数据形态 | `Map<String, Object>` 结构化数据。 | `Checkpoint` / `StateSnapshot`。 |
| 使用方式 | 节点主动读写。 | 图运行时自动保存和恢复。 |

