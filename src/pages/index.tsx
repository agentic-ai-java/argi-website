import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Layout from '@theme/Layout'
import EcosystemShowcase from '../components/EcosystemShowcase'
import Translate from '@docusaurus/Translate'

import styles from './index.module.css'
import projectConfig, { getGitHubUrls } from '../../project.config'

// Generate GitHub links from project configuration
const githubUrls = getGitHubUrls(projectConfig)

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  const logo = useBaseUrl('/img/brand/logo.svg')

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={clsx('container', styles.heroContainer)}>
        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <div className={styles.brandLockup}>
              <img
                src={logo}
                alt={`${siteConfig.title} Logo`}
                className={styles.brandMark}
              />
              <span className={styles.brandText}>Agentic AI</span>
            </div>
            <h1 className={clsx('hero__title', styles.heroTitle)}>
              Agent Runtime for Java builders
            </h1>
            <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
              面向生产环境的智能体运行时。用 ReAct Agent、Graph 工作流、持久化执行和上下文工程构建可观察、可恢复、可协作的 Java Agent 应用。
            </p>

            <div className={styles.heroLabels}>
              <span className={styles.label}>ReAct Agent</span>
              <span className={styles.label}>Graph Orchestration</span>
              <span className={styles.label}>Durable Execution</span>
            </div>

            <div className={styles.heroButtons}>
              <Link
                className={clsx('button button--primary button--lg', styles.heroButton, styles.heroButtonPrimary)}
                to="/docs/quick-start">
                <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
                <Translate id="homepage.quickStart" description="Quick Start button text">快速开始</Translate>
              </Link>
              <Link
                className={clsx('button button--secondary button--lg', styles.heroButton, styles.heroButtonSecondary)}
                to={githubUrls.repo}>
                <svg className={styles.buttonIcon} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <Translate id="homepage.viewOnGithub" description="View on GitHub button text">GitHub</Translate>
              </Link>
            </div>
          </div>

          <div className={styles.runtimeMap} aria-label="Agentic AI runtime flow">
            <div className={styles.runtimeNode}>Plan</div>
            <div className={styles.runtimeLine} />
            <div className={styles.runtimeNode}>Act</div>
            <div className={styles.runtimeLine} />
            <div className={styles.runtimeNode}>Observe</div>
            <div className={styles.runtimeLoop}>State checkpoint</div>
            <div className={styles.runtimeFooter}>ReAct Agent + Graph Core</div>
          </div>
        </div>
      </div>
    </header>
  )
}

function CapabilitySection() {
  return (
    <section className={styles.architectureSection}>
      <div className="container">
        <div className={styles.architectureContent}>
          <div className={styles.sectionIntro}>
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
            <div className={styles.capabilityItem}>
              <span className={styles.capabilityKicker}>01</span>
              <h3>ReAct Agent</h3>
              <p>将推理、工具调用和观察反馈组织成可扩展的 Agent 执行循环。</p>
            </div>
            <div className={styles.capabilityItem}>
              <span className={styles.capabilityKicker}>02</span>
              <h3>Graph Core</h3>
              <p>用节点、边、状态和检查点描述长期运行工作流，支持恢复与人在回路。</p>
            </div>
            <div className={styles.capabilityItem}>
              <span className={styles.capabilityKicker}>03</span>
              <h3>Studio</h3>
              <p>内嵌可视化调试界面，用于检查 Agent 对话、图执行和工具调用过程。</p>
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
      title={`${siteConfig.title}`}
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <CapabilitySection />
        <EcosystemShowcase />
      </main>
    </Layout>
  )
}
