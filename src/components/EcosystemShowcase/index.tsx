import React from 'react'
import Link from '@docusaurus/Link'
import Translate from '@docusaurus/Translate'
import styles from './styles.module.css'

interface EcosystemItem {
  name: string
  nameId: string
  layer: string
  description: string
  descriptionId: string
  tags: string[]
  iconType: 'agent' | 'graph' | 'studio' | 'extensions'
  repoUrl?: string
  docUrl?: string
}

const frameworkItems: EcosystemItem[] = [
  {
    name: 'Agentic AI ReAct Agent',
    nameId: 'ecosystem.framework.agent.name',
    layer: 'LAYER 01 // AGENT RUNTIME',
    description: 'Upper-layer framework for ReAct Agent, stateful agent loops, context engineering, and multi-agent coordination.',
    descriptionId: 'ecosystem.framework.agent.description',
    tags: ['ReAct Loop', 'Hooks & Guardrails', 'Context Compression', 'Multi-Agent'],
    iconType: 'agent',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai',
    docUrl: '/docs/frameworks/agent-framework/quick-start',
  },
  {
    name: 'Agentic AI Graph Core',
    nameId: 'ecosystem.framework.graph.name',
    layer: 'LAYER 02 // STATEFUL GRAPH',
    description: 'Graph runtime for workflow orchestration, state checkpoints, time-travel recovery, and human-in-the-loop execution.',
    descriptionId: 'ecosystem.framework.graph.description',
    tags: ['StateGraph', 'Conditional Edges', 'Durable Checkpoints', 'HITL'],
    iconType: 'graph',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai',
    docUrl: '/docs/frameworks/graph-core/quick-start',
  },
  {
    name: 'Agentic AI Studio',
    nameId: 'ecosystem.framework.graphCommunity.name',
    layer: 'LAYER 03 // VISUAL DEBUGGER',
    description: 'Embedded visual debugging studio for agent conversations, live DAG execution traces, and state inspection.',
    descriptionId: 'ecosystem.framework.graphCommunity.description',
    tags: ['Visual DAG', 'Trace Replay', 'State Mutation', 'Token Telemetry'],
    iconType: 'studio',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai',
    docUrl: '/docs/frameworks/studio/quick-start',
  },
  {
    name: 'Agentic AI Extensions',
    nameId: 'ecosystem.framework.extensions.name',
    layer: 'LAYER 04 // PROTOCOL & MESH',
    description: 'Pluggable ecosystem for model adapters, distributed persistence backends, A2A discovery, MCP registry, and sandboxed tools.',
    descriptionId: 'ecosystem.framework.extensions.description',
    tags: ['MCP Registry', 'A2A Protocol', 'Redis / Postgres Saver', 'Sandbox'],
    iconType: 'extensions',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai-extensions',
    docUrl: '/docs/overview',
  },
]

function renderModuleIcon(type: EcosystemItem['iconType']): React.JSX.Element {
  switch (type) {
    case 'agent':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12" />
        </svg>
      )
    case 'graph':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="5" cy="12" r="2.5" />
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="12" cy="19" r="2.5" />
          <circle cx="19" cy="12" r="2.5" />
          <path d="M7.2 10.5 10 6.8M7.2 13.5 10 17.2M14 6.8l2.8 3.7M14 17.2l2.8-3.7" />
        </svg>
      )
    case 'studio':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="2.5" y="3.5" width="19" height="14" rx="2.5" />
          <path d="M7 11.5 10 8.5l2.5 2.5 4-4M8 20.5h8" />
        </svg>
      )
    case 'extensions':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 2 3 7l9 5 9-5-9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>
      )
  }
}

interface EcosystemCardProps {
  item: EcosystemItem
}

function EcosystemCard({ item }: EcosystemCardProps): React.JSX.Element {
  return (
    <div className={styles.ecosystemCard}>
      <div className={styles.cardTopMeta}>
        <span className={styles.layerBadge}>{item.layer}</span>
        <span className={styles.statusIndicator} />
      </div>

      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{renderModuleIcon(item.iconType)}</span>
        <h3 className={styles.cardTitle}>
          <Translate id={item.nameId}>{item.name}</Translate>
        </h3>
      </div>

      <p className={styles.cardDescription}>
        <Translate id={item.descriptionId}>{item.description}</Translate>
      </p>

      <div className={styles.tagRow}>
        {item.tags.map((tag) => (
          <span key={tag} className={styles.capabilityTag}>
            {tag}
          </span>
        ))}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.cardLinks}>
          {item.docUrl && (
            <Link to={item.docUrl} className={styles.cardLinkPrimary}>
              <svg className={styles.docIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <Translate id="ecosystem.viewDocs">查看文档</Translate>
              <span className={styles.externalIcon}>→</span>
            </Link>
          )}
          {item.repoUrl && (
            <a
              href={item.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardLinkSecondary}
            >
              <svg
                className={styles.githubIcon}
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <Translate id="ecosystem.viewOnGithub">GitHub</Translate>
              <span className={styles.externalIcon}>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EcosystemShowcase(): React.JSX.Element {
  return (
    <section className={styles.ecosystem}>
      <div className="container">
        <div className={styles.ecosystemHeader}>
          <span className={styles.ecosystemEyebrow}>
            MODULAR STACK // 全栈智能体模块矩阵
          </span>
          <h2 className={styles.ecosystemTitle}>
            <Translate id="ecosystem.title">Agentic AI Ecosystem</Translate>
          </h2>
          <p className={styles.ecosystemSubtitle}>
            <Translate id="ecosystem.subtitle">
              A comprehensive ecosystem for building intelligent applications
            </Translate>
          </p>
        </div>

        <div className={styles.frameworkGrid}>
          {frameworkItems.map((item) => (
            <EcosystemCard key={item.name} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
