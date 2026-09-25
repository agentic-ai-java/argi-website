import React, { useState } from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Layout from '@theme/Layout'
import EcosystemShowcase from '../components/EcosystemShowcase'
import Translate from '@docusaurus/Translate'

import styles from './index.module.css'
import projectConfig, { getGitHubUrls } from '../../project.config'

const githubUrls = getGitHubUrls(projectConfig)

type RuntimeModeKey = 'react' | 'graph' | 'hitl'

interface TraceStep {
  phase: string
  node: string
  detail: string
  latency: string
  tone: 'cyan' | 'amber' | 'emerald' | 'indigo'
}

interface RuntimeModeConfig {
  id: RuntimeModeKey
  badge: string
  title: string
  subtitle: string
  checkpointId: string
  throughput: string
  activeNodes: string[]
  steps: TraceStep[]
}

const RUNTIME_MODES: Record<RuntimeModeKey, RuntimeModeConfig> = {
  react: {
    id: 'react',
    badge: 'MODE // REACT_LOOP',
    title: 'ReAct Autonomous Reasoning Loop',
    subtitle: 'Plan -> Tool Call (MCP) -> Observe -> Self-Reflect until goal convergence',
    checkpointId: 'ckpt_react_904a',
    throughput: '42ms TTFT',
    activeNodes: ['entry', 'planner', 'tool', 'checkpoint'],
    steps: [
      {
        phase: 'THINK',
        node: 'ReactAgent.planner',
        detail: 'Decompose query into multi-step retrieval + verification plan',
        latency: '38ms',
        tone: 'cyan',
      },
      {
        phase: 'ACT',
        node: 'McpToolNode.invoke',
        detail: 'Execute sandboxed MCP tool `queryClusterMetrics(region="cn-hangzhou")`',
        latency: '64ms',
        tone: 'indigo',
      },
      {
        phase: 'OBSERVE',
        node: 'ContextEngine.merge',
        detail: 'Append structured tool observation & compress sliding context window',
        latency: '12ms',
        tone: 'emerald',
      },
      {
        phase: 'CHECKPOINT',
        node: 'StateSaver.commit',
        detail: 'Persist state snapshot #ckpt_react_904a for zero-loss recovery',
        latency: '4ms',
        tone: 'amber',
      },
    ],
  },
  graph: {
    id: 'graph',
    badge: 'MODE // STATE_GRAPH',
    title: 'StateGraph DAG & Cyclic Orchestration',
    subtitle: 'Conditional diamond routing, parallel sub-graphs, and typed OverAllState reducers',
    checkpointId: 'ckpt_graph_31c8',
    throughput: '4 Parallel Branches',
    activeNodes: ['entry', 'router', 'planner', 'tool', 'verifier'],
    steps: [
      {
        phase: 'START',
        node: 'StateGraph.START',
        detail: 'Initialize typed OverAllState channel with append/merge reducer strategies',
        latency: '2ms',
        tone: 'cyan',
      },
      {
        phase: 'ROUTE',
        node: 'ConditionalEdge.eval',
        detail: 'Evaluate router condition `state.score() >= 0.85 ? "verifier" : "researcher"`',
        latency: '5ms',
        tone: 'amber',
      },
      {
        phase: 'PARALLEL',
        node: 'FanOut[RAG, Search]',
        detail: 'Dispatch concurrent sub-agent nodes and join state deltas deterministically',
        latency: '91ms',
        tone: 'indigo',
      },
      {
        phase: 'END',
        node: 'StateGraph.END',
        detail: 'Emit verified structured response with full execution lineage',
        latency: '8ms',
        tone: 'emerald',
      },
    ],
  },
  hitl: {
    id: 'hitl',
    badge: 'MODE // DURABLE_HITL',
    title: 'Human-in-the-Loop & Time-Travel Recovery',
    subtitle: 'Interrupt before critical actions, inspect/mutate state in Studio, and resume safely',
    checkpointId: 'ckpt_hitl_77e1',
    throughput: 'Zero-Loss Resume',
    activeNodes: ['planner', 'router', 'checkpoint', 'verifier'],
    steps: [
      {
        phase: 'INTERRUPT',
        node: 'CompileConfig.interrupt',
        detail: 'Pause execution before node `prod_deployment_executor` (awaiting approval)',
        latency: '1ms',
        tone: 'amber',
      },
      {
        phase: 'INSPECT',
        node: 'Studio.StateInspector',
        detail: 'Operator reviewed state diff & updated parameter `replicas: 3 -> 5`',
        latency: 'HUMAN',
        tone: 'cyan',
      },
      {
        phase: 'TIME_TRAVEL',
        node: 'RunnableConfig.resume',
        detail: 'Reload checkpoint #ckpt_hitl_77e1 and fork execution branch seamlessly',
        latency: '6ms',
        tone: 'indigo',
      },
      {
        phase: 'COMPLETE',
        node: 'Verifier.auditLog',
        detail: 'Execution resumed and verified with signed human approval metadata',
        latency: '19ms',
        tone: 'emerald',
      },
    ],
  },
}

interface BlueprintItem {
  id: string
  tabLabel: string
  badge: string
  fileName: string
  title: string
  description: string
  code: string
  stateSnapshot: {
    threadId: string
    currentNode: string
    checkpointStatus: string
    keys: Array<{ key: string, value: string, highlight?: boolean }>
  }
  highlights: string[]
}

const BLUEPRINTS: BlueprintItem[] = [
  {
    id: 'react-agent',
    tabLabel: '01 // ReAct Agent',
    badge: 'DECLARATIVE AGENT BUILDER',
    fileName: 'ProductionReactAgent.java',
    title: '几行 Java 代码构建生产级 ReAct 智能体',
    description: '通过流式 Builder API 将大模型推理、MCP 工具集、上下文压缩钩子与持久化检查点组合为可观测的自治智能体循环。',
    code: `ReactAgent opsAgent = ReactAgent.builder()
    .name("cloud-sre-agent")
    .model(chatModel)
    .systemPrompt("You are an autonomous production SRE agent.")
    .tools(
        mcpClient.resolve("prometheus-query"),
        mcpClient.resolve("k8s-rollout-status")
    )
    .hooks(
        ModelCallLimitHook.of(12),
        ContextCompressionHook.slidingWindow(16_384)
    )
    .saver(PostgresCheckpointSaver.create(dataSource))
    .build();

AssistantMessage reply = opsAgent.call(
    "Diagnose latency spike on payment-service and propose safe rollback",
    RunnableConfig.builder().threadId("incident-2026-09").build()
);`,
    stateSnapshot: {
      threadId: 'incident-2026-09',
      currentNode: 'ReactAgent.toolExecution',
      checkpointStatus: 'PERSISTED (PostgreSQL)',
      keys: [
        { key: 'agent.name', value: '"cloud-sre-agent"' },
        { key: 'loop.iteration', value: '3 / 12 (CONVERGED)', highlight: true },
        { key: 'mcp.tools.invoked', value: '["prometheus-query", "k8s-rollout-status"]' },
        { key: 'context.tokens', value: '4,820 / 16,384 (COMPRESSED)' },
      ],
    },
    highlights: [
      '原生支持 MCP 工具协议与 Spring AI ToolCallback 自动装配',
      '内置 Hook 生命周期拦截（模型调用限流、PII 脱敏、上下文压缩）',
      '每次推理与工具调用自动生成可回放的状态快照',
    ],
  },
  {
    id: 'state-graph',
    tabLabel: '02 // Graph Core',
    badge: 'STATEFUL WORKFLOW ENGINE',
    fileName: 'AutonomousWorkflowGraph.java',
    title: '用类型安全的状态图编排复杂多分支与循环工作流',
    description: '使用节点（Node）、有向边（Edge）、条件路由（Conditional Edge）与归约器（Reducer）精确控制长周期多智能体协作。',
    code: `StateGraph<OverAllState> workflow = new StateGraph<>(OverAllState::new)
    .addNode("planner", node_async(new PlannerNode(chatModel)))
    .addNode("researcher", node_async(new ParallelResearchNode(searchTool)))
    .addNode("critic", node_async(new ReflectionCriticNode(chatModel)))
    .addEdge(START, "planner")
    .addEdge("planner", "researcher")
    .addEdge("researcher", "critic")
    .addConditionalEdges(
        "critic",
        edge_async(state -> state.value("qualityScore", 0.0) >= 0.9 ? "pass" : "refine"),
        Map.of("pass", END, "refine", "planner")
    );

CompiledGraph runtime = workflow.compile(
    CompileConfig.builder()
        .saverConfig(SaverConfig.builder().register(redisSaver).build())
        .build()
);`,
    stateSnapshot: {
      threadId: 'graph-exec-8841',
      currentNode: 'critic -> END (Conditional: "pass")',
      checkpointStatus: 'VERIFIED_DAG_CYCLE',
      keys: [
        { key: 'state.qualityScore', value: '0.94 (>= 0.90 threshold)', highlight: true },
        { key: 'graph.routeDecision', value: '"pass" -> StateGraph.END' },
        { key: 'parallel.branches', value: '3 sub-tasks merged in 91ms' },
        { key: 'checkpoint.revision', value: '#rev_04 (Time-Travel Ready)' },
      ],
    },
    highlights: [
      '支持 DAG 有向无环图与 Cyclic 自反思循环图混合编排',
      '支持并行分支扇出（Fan-out）与确定性状态归约合并（Fan-in）',
      '子图嵌套（Sub-Graph）与多智能体 Supervisor / Routing 模式开箱即用',
    ],
  },
  {
    id: 'hitl-studio',
    tabLabel: '03 // HITL & Studio',
    badge: 'HUMAN-IN-THE-LOOP & STUDIO',
    fileName: 'HumanInTheLoopExecution.java',
    title: '关键节点中断审批、状态热修改与时间旅行恢复',
    description: '在执行高风险操作前自动挂起工作流，结合 Agentic Studio 可视化审查推理链路、修改中间状态并随时恢复执行。',
    code: `CompiledGraph durableGraph = workflow.compile(
    CompileConfig.builder()
        .saverConfig(SaverConfig.builder().register(checkpointSaver).build())
        .interruptBefore("execute_production_change")
        .build()
);

// 1. Run until interrupt point; state is durably persisted
RunnableConfig config = RunnableConfig.builder().threadId("prod-change-42").build();
durableGraph.invoke(Map.of("targetCluster", "payment-v2"), config);

// 2. Inspect or patch state after human approval in Studio
RunnableConfig resumedConfig = durableGraph.updateState(
    config,
    Map.of("approvedBy", "sre-lead", "canaryWeight", 20),
    "execute_production_change"
);

// 3. Resume seamlessly from exact checkpoint
durableGraph.invoke(null, resumedConfig);`,
    stateSnapshot: {
      threadId: 'prod-change-42',
      currentNode: 'execute_production_change (RESUMED)',
      checkpointStatus: 'HUMAN_APPROVED',
      keys: [
        { key: 'interrupt.before', value: '"execute_production_change"' },
        { key: 'state.approvedBy', value: '"sre-lead" (Signed)', highlight: true },
        { key: 'state.canaryWeight', value: '20% (Mutated via updateState)' },
        { key: 'studio.traceUrl', value: 'http://localhost:8080/studio/traces/42' },
      ],
    },
    highlights: [
      '零线程阻塞挂起：工作流状态落盘，进程重启后仍可跨实例恢复',
      '支持 updateState 动态注入人工修正参数或回退至任意历史快照',
      '内嵌 Agentic AI Studio，实时可视化 DAG 节点耗时与 Token 流',
    ],
  },
]

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  const logo = useBaseUrl('/img/brand/logo.svg')
  const [activeMode, setActiveMode] = useState<RuntimeModeKey>('react')
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  const currentMode = RUNTIME_MODES[activeMode]
  const quickSnippet = 'ReactAgent.builder().model(chatModel).tools(mcpTools).saver(checkpointSaver).build()'

  const handleCopySnippet = () => {
    if (typeof window !== 'undefined' && window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(quickSnippet).catch(() => {})
      setCopiedSnippet(true)
      setTimeout(() => setCopiedSnippet(false), 2000)
    }
  }

  const isNodeActive = (nodeId: string) => currentMode.activeNodes.includes(nodeId)

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={styles.heroAurora} aria-hidden="true" />
      <div className={styles.heroGridOverlay} aria-hidden="true" />

      <div className={clsx('container', styles.heroContainer)}>
        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <div className={styles.brandLockup}>
              <img
                src={logo}
                alt={`${siteConfig.title} Logo`}
                className={styles.brandMark}
                width="38"
                height="38"
              />
              <span className={styles.brandText}>Agentic AI</span>
              <span className={styles.brandDivider} aria-hidden="true" />
              <span className={styles.runtimeStatusTag}>
                <span className={styles.liveDot} />
                JAVA AGENT RUNTIME
              </span>
            </div>

            <h1 className={clsx('hero__title', styles.heroTitle)}>
              <span className={styles.heroTitlePrimary}>Agent Runtime</span>
              <span className={styles.heroTitleAccent}>for Java Builders</span>
            </h1>

            <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
              <Translate id="homepage.hero.subtitle" description="Homepage hero subtitle">
                面向生产环境的智能体运行时。用 ReAct Agent、Graph 状态图编排、持久化检查点和上下文工程，构建可观测、可恢复、可协作的企业级 Java 智能体系统。
              </Translate>
            </p>

            <div className={styles.heroLabels}>
              <span className={styles.label}>
                <span className={styles.labelDotCyan} />
                ReAct Reasoning Loop
              </span>
              <span className={styles.label}>
                <span className={styles.labelDotIndigo} />
                StateGraph Orchestration
              </span>
              <span className={styles.label}>
                <span className={styles.labelDotAmber} />
                Durable Checkpoints & HITL
              </span>
              <span className={styles.label}>
                <span className={styles.labelDotEmerald} />
                MCP & Multi-Agent A2A
              </span>
            </div>

            <div className={styles.quickCodeBar} role="region" aria-label="Quick Java API idiom">
              <span className={styles.quickCodePrompt}>JAVA //</span>
              <code className={styles.quickCodeText}>{quickSnippet}</code>
              <button
                type="button"
                className={styles.quickCopyBtn}
                onClick={handleCopySnippet}
                aria-label="Copy Java builder snippet"
              >
                {copiedSnippet ? 'COPIED' : 'COPY'}
              </button>
            </div>

            <div className={styles.heroButtons}>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton, styles.heroButtonPrimary)}
                to="/docs/quick-start"
              >
                <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <Translate id="homepage.quickStart" description="Quick Start button text">快速开始</Translate>
              </Link>
              <Link
                className={clsx('button button--secondary button--lg', styles.heroButton, styles.heroButtonArchitecture)}
                to="/docs/overview"
              >
                <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="12" cy="18" r="3" />
                  <path d="M8.5 7.5L11 15.5M15.5 7.5L13 15.5M9 6h6" />
                </svg>
                <Translate id="homepage.architectureOverview" description="Architecture Overview button text">架构总览</Translate>
              </Link>
              <Link
                className={clsx('button button--secondary button--lg', styles.heroButton, styles.heroButtonSecondary)}
                to={githubUrls.repo}
              >
                <svg className={styles.buttonIcon} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <Translate id="homepage.viewOnGithub" description="View on GitHub button text">GitHub</Translate>
              </Link>
            </div>
          </div>

          <div className={styles.runtimeConsole} aria-label="Interactive Agentic AI Runtime Telemetry Console">
            <div className={styles.consoleTopBar}>
              <div className={styles.consoleWindowDots} aria-hidden="true">
                <span className={styles.windowDotRed} />
                <span className={styles.windowDotAmber} />
                <span className={styles.windowDotGreen} />
              </div>
              <div className={styles.consoleTitle}>
                <span className={styles.consolePulse} />
                AGENTIC_RUNTIME_TELEMETRY
              </div>
              <div className={styles.consoleBadge}>{currentMode.checkpointId}</div>
            </div>

            <div className={styles.modeSwitchBar} role="tablist" aria-label="Runtime Execution Modes">
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'react'}
                className={clsx(styles.modeTab, activeMode === 'react' && styles.modeTabActive)}
                onClick={() => setActiveMode('react')}
              >
                01 // ReAct Loop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'graph'}
                className={clsx(styles.modeTab, activeMode === 'graph' && styles.modeTabActive)}
                onClick={() => setActiveMode('graph')}
              >
                02 // StateGraph
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'hitl'}
                className={clsx(styles.modeTab, activeMode === 'hitl' && styles.modeTabActive)}
                onClick={() => setActiveMode('hitl')}
              >
                03 // Durable HITL
              </button>
            </div>

            <div className={styles.topologyCanvas}>
              <svg
                viewBox="0 0 480 210"
                className={styles.topologySvg}
                role="img"
                aria-label="Agentic AI Neural Graph Execution Topology"
              >
                <defs>
                  <linearGradient id="edgeCyanAmber" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="55%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="edgeLoop" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>

                {/* Base tracks */}
                <path
                  d="M 54 105 L 146 105 L 236 52 L 334 52 L 422 105"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.22)"
                  strokeWidth="2.5"
                />
                <path
                  d="M 146 105 L 236 158 L 334 158 L 422 105"
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.22)"
                  strokeWidth="2.5"
                />

                {/* Animated active data flow stream */}
                <path
                  d="M 54 105 L 146 105 L 236 52 L 334 52 L 422 105"
                  fill="none"
                  stroke="url(#edgeCyanAmber)"
                  strokeWidth="3"
                  strokeDasharray="8 8"
                  className={styles.animatedStreamPath}
                />
                <path
                  d="M 146 105 L 236 158 L 334 158 L 422 105"
                  fill="none"
                  stroke="url(#edgeCyanAmber)"
                  strokeWidth="2.5"
                  strokeDasharray="6 8"
                  className={styles.animatedStreamPathReverse}
                />

                {/* Self-reflection / Checkpoint return arc */}
                <path
                  d="M 334 158 C 300 198, 182 198, 146 118"
                  fill="none"
                  stroke="url(#edgeLoop)"
                  strokeWidth="2.2"
                  strokeDasharray="5 5"
                  className={styles.animatedLoopPath}
                />

                {/* Entry Node */}
                <g className={clsx(styles.svgNode, isNodeActive('entry') && styles.svgNodeActive)}>
                  <circle cx="54" cy="105" r="18" fill="#08101E" stroke="#38BDF8" strokeWidth="3" />
                  <circle cx="54" cy="105" r="5" fill="#F59E0B" />
                  <text x="54" y="138" textAnchor="middle" className={styles.svgNodeLabel}>START</text>
                </g>

                {/* Planner / ReAct Node */}
                <g className={clsx(styles.svgNode, isNodeActive('planner') && styles.svgNodeActive)}>
                  <rect x="116" y="83" width="60" height="44" rx="10" fill="#08101E" stroke="#38BDF8" strokeWidth="2.5" />
                  <text x="146" y="102" textAnchor="middle" className={styles.svgNodeTitle}>PLAN</text>
                  <text x="146" y="116" textAnchor="middle" className={styles.svgNodeSub}>ReAct LLM</text>
                </g>

                {/* Router Diamond Node (Upper) */}
                <g className={clsx(styles.svgNode, isNodeActive('router') && styles.svgNodeActive)}>
                  <g transform="translate(236, 52) rotate(45)">
                    <rect x="-16" y="-16" width="32" height="32" rx="5" fill="#08101E" stroke="#F59E0B" strokeWidth="2.5" />
                  </g>
                  <text x="236" y="56" textAnchor="middle" className={styles.svgNodeTitleAmber}>ROUTE</text>
                  <text x="236" y="22" textAnchor="middle" className={styles.svgNodeLabel}>Condition</text>
                </g>

                {/* MCP Tool Node (Lower) */}
                <g className={clsx(styles.svgNode, isNodeActive('tool') && styles.svgNodeActive)}>
                  <rect x="204" y="136" width="64" height="44" rx="10" fill="#08101E" stroke="#6366F1" strokeWidth="2.5" />
                  <text x="236" y="155" textAnchor="middle" className={styles.svgNodeTitle}>ACT</text>
                  <text x="236" y="169" textAnchor="middle" className={styles.svgNodeSub}>MCP Tool</text>
                </g>

                {/* Upper Parallel Sub-Agent / Verifier */}
                <g className={clsx(styles.svgNode, isNodeActive('verifier') && styles.svgNodeActive)}>
                  <rect x="302" y="30" width="64" height="44" rx="10" fill="#08101E" stroke="#38BDF8" strokeWidth="2.5" />
                  <text x="334" y="49" textAnchor="middle" className={styles.svgNodeTitle}>VERIFY</text>
                  <text x="334" y="63" textAnchor="middle" className={styles.svgNodeSub}>Guardrail</text>
                </g>

                {/* Lower State Checkpoint Node */}
                <g className={clsx(styles.svgNode, isNodeActive('checkpoint') && styles.svgNodeActive)}>
                  <rect x="302" y="136" width="64" height="44" rx="10" fill="#08101E" stroke="#F59E0B" strokeWidth="2.5" />
                  <text x="334" y="155" textAnchor="middle" className={styles.svgNodeTitleAmber}>STATE</text>
                  <text x="334" y="169" textAnchor="middle" className={styles.svgNodeSub}>Checkpoint</text>
                </g>

                {/* Output / Merge Node */}
                <g className={clsx(styles.svgNode, styles.svgNodeActive)}>
                  <circle cx="422" cy="105" r="18" fill="#08101E" stroke="#10B981" strokeWidth="3" />
                  <circle cx="422" cy="105" r="6" fill="#10B981" />
                  <text x="422" y="138" textAnchor="middle" className={styles.svgNodeLabel}>OUTPUT</text>
                </g>
              </svg>

              <div className={styles.topologyStatusStrip}>
                <span className={styles.topologyBadge}>{currentMode.badge}</span>
                <span className={styles.topologyThroughput}>{currentMode.throughput}</span>
              </div>
            </div>

            <div className={styles.consoleTracePanel}>
              <div className={styles.traceHeader}>
                <span className={styles.traceHeaderTitle}>{currentMode.title}</span>
                <span className={styles.traceHeaderHint}>LIVE EXECUTION TRACE</span>
              </div>
              <div className={styles.traceList}>
                {currentMode.steps.map((step) => (
                  <div key={`${currentMode.id}-${step.phase}`} className={styles.traceRow}>
                    <span className={clsx(styles.tracePhaseBadge, styles[`tone_${step.tone}`])}>
                      {step.phase}
                    </span>
                    <div className={styles.traceBody}>
                      <span className={styles.traceNodeName}>{step.node}</span>
                      <span className={styles.traceDetailText}>{step.detail}</span>
                    </div>
                    <span className={styles.traceLatency}>{step.latency}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function ArchitecturePlayground() {
  const [selectedTab, setSelectedTab] = useState<string>(BLUEPRINTS[0].id)
  const [copiedCode, setCopiedCode] = useState(false)

  const currentBlueprint = BLUEPRINTS.find((item) => item.id === selectedTab) || BLUEPRINTS[0]

  const handleCopyCode = () => {
    if (typeof window !== 'undefined' && window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(currentBlueprint.code).catch(() => {})
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <section className={styles.playgroundSection}>
      <div className="container">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionEyebrow}>
            CODE-TO-RUNTIME BLUEPRINTS // 声明式智能体工程
          </span>
          <h2 className={styles.architectureTitle}>
            <Translate id="homepage.playground.title" description="Code playground section title">
              从声明式 Java 代码到自治状态图执行
            </Translate>
          </h2>
          <p className={styles.architectureSubtitle}>
            <Translate id="homepage.playground.subtitle" description="Code playground section subtitle">
              告别脆弱的 Prompt 拼接与不可控黑盒循环。在熟悉的 Spring 与 Java 类型系统之上，获得生产级检查点、分支并发与人在回路控制力。
            </Translate>
          </p>
        </div>

        <div className={styles.blueprintTabs} role="tablist" aria-label="Architecture Blueprints">
          {BLUEPRINTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={currentBlueprint.id === item.id}
              className={clsx(
                styles.blueprintTabBtn,
                currentBlueprint.id === item.id && styles.blueprintTabBtnActive,
              )}
              onClick={() => {
                setSelectedTab(item.id)
                setCopiedCode(false)
              }}
            >
              {item.tabLabel}
            </button>
          ))}
        </div>

        <div className={styles.blueprintSplitGrid}>
          <div className={styles.codeWindow}>
            <div className={styles.codeWindowHeader}>
              <div className={styles.consoleWindowDots} aria-hidden="true">
                <span className={styles.windowDotRed} />
                <span className={styles.windowDotAmber} />
                <span className={styles.windowDotGreen} />
              </div>
              <span className={styles.codeFileName}>{currentBlueprint.fileName}</span>
              <button
                type="button"
                className={styles.codeCopyButton}
                onClick={handleCopyCode}
              >
                {copiedCode ? 'Copied ✓' : 'Copy Java'}
              </button>
            </div>
            <pre className={styles.codePreBlock}>
              <code>{currentBlueprint.code}</code>
            </pre>
          </div>

          <div className={styles.inspectorWindow}>
            <div className={styles.inspectorTopBadge}>{currentBlueprint.badge}</div>
            <h3 className={styles.inspectorTitle}>{currentBlueprint.title}</h3>
            <p className={styles.inspectorDescription}>{currentBlueprint.description}</p>

            <div className={styles.stateCard}>
              <div className={styles.stateCardHeader}>
                <span className={styles.stateCardLabel}>RUNTIME STATE SNAPSHOT</span>
                <span className={styles.stateCardStatus}>{currentBlueprint.stateSnapshot.checkpointStatus}</span>
              </div>
              <div className={styles.stateMetaRow}>
                <span>thread_id: <strong>{currentBlueprint.stateSnapshot.threadId}</strong></span>
                <span>node: <strong>{currentBlueprint.stateSnapshot.currentNode}</strong></span>
              </div>
              <div className={styles.stateKeyList}>
                {currentBlueprint.stateSnapshot.keys.map((entry) => (
                  <div
                    key={entry.key}
                    className={clsx(styles.stateKeyRow, entry.highlight && styles.stateKeyRowHighlight)}
                  >
                    <span className={styles.stateKeyName}>{entry.key}</span>
                    <span className={styles.stateKeyValue}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <ul className={styles.highlightCheckList}>
              {currentBlueprint.highlights.map((point) => (
                <li key={point} className={styles.highlightCheckItem}>
                  <span className={styles.checkMarkIcon} aria-hidden="true">✦</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function CapabilitySection() {
  return (
    <section className={styles.architectureSection}>
      <div className="container">
        <div className={styles.architectureContent}>
          <div className={styles.sectionIntro}>
            <span className={styles.sectionEyebrow}>
              RUNTIME ARCHITECTURE // 核心技术底座
            </span>
            <h2 className={styles.architectureTitle}>
              <Translate id="homepage.architecture.title" description="Architecture section title">
                上层 Agent 设计，底层运行时能力
              </Translate>
            </h2>
            <p className={styles.architectureSubtitle}>
              <Translate id="homepage.architecture.subtitle" description="Architecture section subtitle">
                Graph 和 ReAct Agent 承担编排、状态、恢复和协作语义，让复杂 Agent 应用具备可观察、可恢复和可扩展的运行时边界。
              </Translate>
            </p>
          </div>

          <div className={styles.capabilityGrid}>
            <div className={clsx(styles.capabilityItem, styles.capabilityItemFeatured)}>
              <div className={styles.capabilityTopRow}>
                <span className={styles.capabilityKicker}>CORE // 01</span>
                <span className={styles.capabilityMetricTag}>AUTONOMOUS LOOP</span>
              </div>
              <div className={styles.capabilityIconWrap} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <h3>ReAct Agent 自治推理引擎</h3>
              <p>
                将思考（Reason）、工具行动（Act）与环境反馈（Observe）组织成受控的闭环执行流，内置模型限流、上下文压缩与结构化输出校验。
              </p>
              <Link to="/docs/frameworks/agent-framework/quick-start" className={styles.capabilityLink}>
                探索 ReAct Agent <span>→</span>
              </Link>
            </div>

            <div className={clsx(styles.capabilityItem, styles.capabilityItemFeatured)}>
              <div className={styles.capabilityTopRow}>
                <span className={styles.capabilityKicker}>GRAPH // 02</span>
                <span className={styles.capabilityMetricTag}>DAG + CYCLIC</span>
              </div>
              <div className={styles.capabilityIconWrap} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="6" height="6" rx="1.5" />
                  <rect x="15" y="3" width="6" height="6" rx="1.5" />
                  <rect x="9" y="15" width="6" height="6" rx="1.5" />
                  <path d="M9 6h6M6 9l4.5 6M18 9l-4.5 6" />
                </svg>
              </div>
              <h3>Graph Core 状态图编排</h3>
              <p>
                用强类型 OverAllState、条件边（Conditional Edges）、并行分支与嵌套子图描述长周期复杂工作流，兼顾确定性控制与动态智能路由。
              </p>
              <Link to="/docs/frameworks/graph-core/quick-start" className={styles.capabilityLink}>
                探索 Graph Core <span>→</span>
              </Link>
            </div>

            <div className={styles.capabilityItem}>
              <div className={styles.capabilityTopRow}>
                <span className={styles.capabilityKicker}>STATE // 03</span>
                <span className={styles.capabilityMetricTag}>TIME-TRAVEL</span>
              </div>
              <div className={styles.capabilityIconWrap} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <h3>持久化检查点与故障自愈</h3>
              <p>
                每个节点边界自动持久化状态快照（Memory / Redis / PostgreSQL），支持跨实例故障恢复、状态分叉（Fork）与历史回放。
              </p>
              <Link to="/docs/overview" className={styles.capabilityLink}>
                了解持久化执行 <span>→</span>
              </Link>
            </div>

            <div className={styles.capabilityItem}>
              <div className={styles.capabilityTopRow}>
                <span className={styles.capabilityKicker}>GOVERNANCE // 04</span>
                <span className={styles.capabilityMetricTag}>HUMAN-IN-LOOP</span>
              </div>
              <div className={styles.capabilityIconWrap} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3>人在回路（HITL）安全管控</h3>
              <p>
                支持在敏感工具或高危节点执行前声明式中断（interruptBefore），人工审批或热修改状态参数后无缝恢复原执行上下文。
              </p>
              <Link to="/docs/frameworks/graph-core/quick-start" className={styles.capabilityLink}>
                查看 HITL 模式 <span>→</span>
              </Link>
            </div>

            <div className={styles.capabilityItem}>
              <div className={styles.capabilityTopRow}>
                <span className={styles.capabilityKicker}>STUDIO // 05</span>
                <span className={styles.capabilityMetricTag}>VISUAL TRACE</span>
              </div>
              <div className={styles.capabilityIconWrap} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4M6 10l3-3 3 3 4-4" />
                </svg>
              </div>
              <h3>Studio 嵌入式可视化调试</h3>
              <p>
                内嵌交互式调试工作台，实时渲染智能体对话流、StateGraph 拓扑高亮、工具入参/出参及节点级耗时遥测。
              </p>
              <Link to="/docs/frameworks/studio/quick-start" className={styles.capabilityLink}>
                启动 Studio 调试 <span>→</span>
              </Link>
            </div>

            <div className={styles.capabilityItem}>
              <div className={styles.capabilityTopRow}>
                <span className={styles.capabilityKicker}>MESH // 06</span>
                <span className={styles.capabilityMetricTag}>MCP + A2A</span>
              </div>
              <div className={styles.capabilityIconWrap} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="5" r="3" />
                  <circle cx="5" cy="19" r="3" />
                  <circle cx="19" cy="19" r="3" />
                  <path d="M10.5 7.5 6.5 16.5M13.5 7.5l4 9M8 19h8" />
                </svg>
              </div>
              <h3>MCP 协议与多智能体协同网络</h3>
              <p>
                原生集成 Model Context Protocol（MCP）工具生态与 A2A 多智能体发现协议，支持 Sequential、Parallel、Supervisor 与 Handoffs 编排。
              </p>
              <Link to="/docs/frameworks/agent-framework/quick-start" className={styles.capabilityLink}>
                探索多智能体编排 <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout
      title={`${siteConfig.title} — Agent Runtime for Java Builders`}
      description={siteConfig.tagline}
    >
      <HomepageHeader />
      <main>
        <ArchitecturePlayground />
        <CapabilitySection />
        <EcosystemShowcase />
      </main>
    </Layout>
  )
}
