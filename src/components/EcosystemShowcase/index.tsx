import React from 'react'
import Link from '@docusaurus/Link'
import Translate from '@docusaurus/Translate'
import styles from './styles.module.css'

interface EcosystemItem {
  name: string;
  nameId: string;
  description: string;
  descriptionId: string;
  icon: string;
  repoUrl?: string;
  docUrl?: string;
  stars?: string;
}

const frameworkItems: EcosystemItem[] = [
  {
    name: 'Agentic AI ReAct Agent',
    nameId: 'ecosystem.framework.agent.name',
    description: 'Upper-layer framework for ReAct Agent, stateful agent loops, and multi-agent coordination.',
    descriptionId: 'ecosystem.framework.agent.description',
    icon: 'AF',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai',
    docUrl: '/docs/frameworks/agent-framework/quick-start',
    stars: 'agentic-spring-ai',
  },
  {
    name: 'Agentic AI Graph Core',
    nameId: 'ecosystem.framework.graph.name',
    description: 'Graph runtime for workflow orchestration, state checkpoints, recovery, and human-in-the-loop execution.',
    descriptionId: 'ecosystem.framework.graph.description',
    icon: 'GC',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai',
    docUrl: '/docs/frameworks/graph-core/quick-start',
    stars: 'agentic-ai-graph-core',
  },
  {
    name: 'Agentic AI Studio',
    nameId: 'ecosystem.framework.graphCommunity.name',
    description: 'Embedded visual debugging studio for agent conversations and graph workflows.',
    descriptionId: 'ecosystem.framework.graphCommunity.description',
    icon: 'ST',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai',
    stars: 'agentic-ai-studio',
  },
  {
    name: 'Agentic AI Extensions',
    nameId: 'ecosystem.framework.extensions.name',
    description: 'Optional repository for model adapters, persistence backends, A2A discovery, MCP registry, and sandboxed tool execution.',
    descriptionId: 'ecosystem.framework.extensions.description',
    icon: 'EX',
    repoUrl: 'https://github.com/agentic-spring-ai/agentic-spring-ai-extensions',
    stars: 'agentic-spring-ai-extensions',
  },
]

interface EcosystemCardProps {
  item: EcosystemItem;
}

function EcosystemCard({ item }: EcosystemCardProps): React.JSX.Element {
  return (
    <div className={styles.ecosystemCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{item.icon}</span>
        <h3 className={styles.cardTitle}>
          <Translate id={item.nameId}>{item.name}</Translate>
        </h3>
      </div>
      <p className={styles.cardDescription}>
        <Translate id={item.descriptionId}>{item.description}</Translate>
      </p>
      <div className={styles.cardFooter}>
        <div className={styles.cardLinks}>
          {item.docUrl && (
            <Link to={item.docUrl} className={styles.cardLink}>
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
              className={styles.cardLink}>
              <svg
                className={styles.githubIcon}
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <Translate id="ecosystem.viewOnGithub">View on GitHub</Translate>
              <span className={styles.externalIcon}>→</span>
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
          <h2 className={styles.ecosystemTitle}>
            <Translate id="ecosystem.title">Agentic AI Ecosystem</Translate>
          </h2>
          <p className={styles.ecosystemSubtitle}>
            <Translate id="ecosystem.subtitle">
              A comprehensive ecosystem for building intelligent applications
            </Translate>
          </p>
        </div>

        {/* Framework Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Translate id="ecosystem.framework.title">Core Framework</Translate>
            </h3>
            <p className={styles.sectionDescription}>
              <Translate id="ecosystem.framework.description">
                Runtime modules for building agentic Java applications
              </Translate>
            </p>
          </div>
          <div className={styles.frameworkGrid}>
            {frameworkItems.map((item, idx) => (
              <EcosystemCard key={idx} item={item} />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
