---
title: Graph Core
description: Build stateful graph workflows with Agentic AI Graph Core.
---

# Graph Core

Agentic AI Graph Core is the workflow runtime for stateful agent applications.

Graph and ReAct Agent are upper-layer designs in Agentic AI. Graph defines the orchestration model: nodes, edges, shared state, checkpointing, recovery, streaming, and human-in-the-loop execution.

Graph 可通过 Spring AI 提供的多模型接入能力完成模型适配，但图编排、状态管理、恢复和协作语义由 Agentic AI Graph 自身定义。

## Core Concepts

- **StateGraph** describes the workflow structure.
- **Node** performs one unit of work and returns state updates.
- **Edge** routes execution between nodes.
- **State** carries shared data across the workflow.
- **Checkpoint** stores execution progress so the workflow can resume.

## When To Use Graph

Use Graph Core when an agent workflow needs explicit control over branching, parallel execution, durable state, inspection, or recovery after interruption.
