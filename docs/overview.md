---
sidebar_position: 1
title: Overview
description: Agentic AI is a Java agent runtime for ReAct Agent, graph orchestration, durable execution, and human-in-the-loop workflows.
keywords: [Agentic AI, Agent Framework, ReactAgent, Graph Core, Java Agent, workflow orchestration]
---

# Overview

Agentic AI is a Java agent runtime for building production-grade agent applications.

The project focuses on upper-layer agent design:

- **Agent Framework** for ReAct Agent, agent loops, hooks, context control, and multi-agent patterns.
- **Graph Core** for workflow orchestration, state checkpoints, recovery, streaming, and human-in-the-loop execution.
- **Studio** for embedded visual debugging of agent conversations and graph workflows.

Agentic AI was forked from Spring AI Alibaba and keeps some legacy Maven coordinates, package names, configuration prefixes, and class names for compatibility. Treat those identifiers as public contracts unless a migration guide explicitly says otherwise.

## Design Positioning

ReAct Agent and Graph are Agentic AI upper-layer designs. They define the runtime behavior: how state moves, how execution resumes, how tools are controlled, and how human feedback enters the workflow.

For model access, use the adapters provided by the project and its optional companion repositories.
