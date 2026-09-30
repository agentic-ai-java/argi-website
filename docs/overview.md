---
sidebar_position: 1
title: 项目架构概述
sidebar_label: 项目架构概述
description: ARGI 是面向 Java 开发者的智能体运行时，支持 ReAct Agent、图编排、可持久化执行与人机协同。
keywords: [ARGI, Agent Framework, ReactAgent, Graph Core, Java Agent, 架构概述, workflow orchestration]
---

# 项目架构概述

ARGI 是 **Agent Runtime and Graph Intelligence** 的缩写，读作 **“AR-jee”**（`/ˈɑːr.dʒiː/`）。它是面向 Java 开发者的智能体运行时与编排框架，用于构建 ReAct Agent、显式图工作流以及需要状态恢复能力的智能体应用。

项目聚焦于顶层智能体系统架构设计：

- **Agent Framework**：提供 `ReactAgent` 与多智能体编排能力。`ReactAgent` 基于 Reasoning-Acting 循环运行，并支持工具、Hook、Interceptor、结构化输出和模型错误处理配置。
- **Graph Core**：提供 `StateGraph`、`CompiledGraph`、节点、边、共享状态、检查点、恢复、流式输出和人工介入等图运行时能力。
- **Studio**：提供嵌入式可视化调试界面，用于观测智能体对话流与图工作流执行过程。

ARGI fork 自 Spring AI Alibaba。refactor 分支已经将核心 Maven 坐标迁移到 `io.github.agentic-ai`，模块名迁移到 `argi-*`，Java 包名迁移到 `io.github.agentic.ai.*`。

## 架构设计与定位

ReAct Agent 与 Graph 是 ARGI 当前文档需要优先对齐的两类核心能力：

1. **Graph**：适用于需要显式控制分支、循环、并行、子图、检查点和恢复的工作流。图由 `StateGraph` 定义，编译为 `CompiledGraph` 后执行。
2. **ReAct Agent**：适用于模型需要在「推理、工具调用、观察结果、继续推理」之间循环的智能体应用。`ReactAgent` 构建在 Graph 运行时之上。

在模型接入层面，ARGI 使用 Spring AI 的 `ChatModel`、`ToolCallback` 等抽象。Graph 编排、状态管理和恢复语义由 ARGI 自身提供。
