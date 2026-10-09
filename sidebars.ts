import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

const sidebars: SidebarsConfig = {
  // 顶部“架构”独立侧边栏
  architectureSidebar: [
    {
      type: 'category',
      label: '概览',
      collapsed: false,
      items: [
        'overview',
        'versions',
      ],
    },
  ],

  // 顶部“Graph Core”独立侧边栏
  graphCoreSidebar: [
    {
      type: 'category',
      label: '入门与概览',
      collapsed: false,
      items: [
        'frameworks/graph-core/quick-start',
        'frameworks/graph-core/workflow-orchestration',
      ],
    },
    {
      type: 'category',
      label: '核心概念',
      collapsed: false,
      items: [
        'frameworks/graph-core/concepts/graph',
        'frameworks/graph-core/concepts/nodes',
        'frameworks/graph-core/concepts/edges',
        'frameworks/graph-core/concepts/state',
        'frameworks/graph-core/concepts/threads',
        'frameworks/graph-core/concepts/serializer',
      ],
    },
    {
      type: 'category',
      label: '运行机制与特性',
      collapsed: false,
      items: [
        'frameworks/graph-core/runtime-config',
        'frameworks/graph-core/context-management',
        'frameworks/graph-core/persistence',
        'frameworks/graph-core/store',
        'frameworks/graph-core/streaming',
        'frameworks/graph-core/scheduling',
        'frameworks/graph-core/observation',
      ],
    },
    {
      type: 'category',
      label: '场景示例',
      collapsed: true,
      items: [
        'frameworks/graph-core/examples/spring-ai-integration',
        'frameworks/graph-core/examples/parallel-nodes',
        'frameworks/graph-core/examples/subgraphs',
        'frameworks/graph-core/examples/subgraph-as-node',
        'frameworks/graph-core/examples/subgraph-as-compiled-graph',
        'frameworks/graph-core/examples/persistence',
        'frameworks/graph-core/examples/hitl',
        'frameworks/graph-core/examples/cancellation',
        'frameworks/graph-core/examples/plantuml',
      ],
    },
  ],

  // 顶部“ReAct Agent”独立侧边栏
  reactAgentSidebar: [
    {
      type: 'category',
      label: '入门与基础',
      collapsed: false,
      items: [
        'frameworks/agent-framework/quick-start',
        'frameworks/agent-framework/agents-intro',
        'frameworks/agent-framework/react-agent-theory',
      ],
    },
    {
      type: 'category',
      label: '核心机制与交互',
      collapsed: false,
      items: [
        'frameworks/agent-framework/messages',
        'frameworks/agent-framework/runtime-config',
        'frameworks/agent-framework/structured-io',
        'frameworks/agent-framework/memory',
      ],
    },
    {
      type: 'category',
      label: '工具与能力集成',
      collapsed: false,
      items: [
        'frameworks/agent-framework/tools',
        'frameworks/agent-framework/builtin-tools',
        'frameworks/agent-framework/skills',
        'frameworks/agent-framework/rag',
      ],
    },
    {
      type: 'category',
      label: '执行控制与安全',
      collapsed: false,
      items: [
        'frameworks/agent-framework/hooks-interceptors',
        'frameworks/agent-framework/hitl',
      ],
    },
    {
      type: 'category',
      label: '多智能体与编排',
      collapsed: false,
      items: [
        'frameworks/agent-framework/multi-agent',
        'frameworks/agent-framework/planner',
        'frameworks/agent-framework/tools-as-agent',
        'frameworks/agent-framework/workflow',
        'frameworks/agent-framework/a2a',
      ],
    },
  ],

  // 顶部“Extensions”独立侧边栏
  extensionsSidebar: [
    'frameworks/extensions/overview',
    {
      type: 'category',
      label: 'MCP 生态组件',
      collapsed: false,
      items: [
        'frameworks/extensions/mcp',
        'frameworks/extensions/mcp-gateway',
        'frameworks/extensions/mcp-router',
      ],
    },
    {
      type: 'category',
      label: '记忆与向量存储',
      collapsed: false,
      items: [
        'frameworks/extensions/chat-memory',
        'frameworks/extensions/vector-stores',
      ],
    },
    {
      type: 'category',
      label: '检索增强生成 (RAG)',
      collapsed: false,
      items: [
        'frameworks/extensions/rag',
      ],
    },
    {
      type: 'category',
      label: '运维管控与可观测',
      collapsed: false,
      items: [
        'frameworks/extensions/nacos-prompt',
        'frameworks/extensions/observation',
      ],
    },
  ],

  // 顶部“Studio”独立侧边栏
  studioSidebar: [
    'frameworks/studio/quick-start',
  ],

  // 顶部“社区协议”独立侧边栏
  communitySidebar: [
    'community/policies',
  ],
}

export default sidebars
