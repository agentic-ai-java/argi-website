---
title: Graph Core
description: Build stateful graph workflows with Agentic AI Graph Core.
---

# Graph Core

Agentic AI Graph Core is the workflow runtime for stateful agent applications.

Graph and ReAct Agent are upper-layer designs in Agentic AI. Graph defines the orchestration model: nodes, edges, shared state, checkpointing, recovery, streaming, and human-in-the-loop execution.

Graph can use Spring AI multi-model integration for model adaptation, while orchestration, state management, recovery, and collaboration semantics are defined by Agentic AI Graph itself.

## Core Concepts

- **StateGraph** describes the workflow structure.
- **Node** performs one unit of work and returns state updates.
- **Edge** routes execution between nodes.
- **State** carries shared data across the workflow.
- **Checkpoint** stores execution progress so the workflow can resume.

## When To Use Graph

Use Graph Core when an agent workflow needs explicit control over branching, parallel execution, durable state, inspection, or recovery after interruption.
