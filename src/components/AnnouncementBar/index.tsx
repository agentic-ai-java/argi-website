import React, { useState, useEffect } from 'react'
import Link from '@docusaurus/Link'
import Translate from '@docusaurus/Translate'
import styles from './styles.module.css'
import clsx from 'clsx'

interface AnnouncementBarProps {
  content?: React.ReactNode | string
  closable?: boolean
  onClose?: () => void
}

const STORAGE_KEY = 'agentic_ai_announcement_dismissed_v1'

export default function AnnouncementBar({
  content,
  closable = true,
  onClose,
}: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === '1') {
        setIsVisible(false)
      }
    } catch {
      // Ignore storage access restrictions in private browsing
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Ignore storage errors
    }
    onClose?.()
  }

  if (!isVisible) {
    return null
  }

  const isHtmlString = typeof content === 'string' && /<[^>]+>/.test(content)

  return (
    <div className={styles.announcementBar} role="region" aria-label="Runtime announcement">
      <div className={clsx('container', styles.container)}>
        {content ? (
          isHtmlString ? (
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: content as string }}
            />
          ) : (
            <div className={styles.content}>{content}</div>
          )
        ) : (
          <div className={styles.content}>
            <span className={styles.statusBadge}>
              <span className={styles.statusDot} />
              RUNTIME v1.0
            </span>
            <span className={styles.messageText}>
              <Translate id="announcement.message" description="Announcement bar main message">
                Agentic AI 智能体运行时现已全面支持 ReAct 循环、Graph 状态编排与 Studio 实时观测
              </Translate>
            </span>
            <Link to="/docs/overview" className={styles.ctaLink}>
              <Translate id="announcement.cta" description="Announcement bar CTA link">
                探索架构总览
              </Translate>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
        {closable && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close announcement"
            title="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
