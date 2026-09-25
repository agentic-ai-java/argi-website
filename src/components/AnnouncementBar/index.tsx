import React, { useState } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'

interface AnnouncementBarProps {
  /**
   * Announcement content. Supports ReactNode or an HTML string.
   */
  content?: React.ReactNode | string
  /**
   * Whether the announcement can be closed.
   */
  closable?: boolean
  /**
   * Callback after closing.
   */
  onClose?: () => void
}

export default function AnnouncementBar({
  content = '<a href="/docs/overview" target="_blank">Agentic AI 文档已更新</a>，聚焦 ReAct Agent、Graph Core 与 Studio。',
  closable = true,
  onClose,
}: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) {
    return null
  }

  // Detect whether content is an HTML string.
  const isHtmlString = typeof content === 'string' && /<[^>]+>/.test(content)

  return (
    <div className={styles.announcementBar}>
      <div className={clsx('container', styles.container)}>
        {isHtmlString ? (
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: content as string }}
          />
        ) : (
          <div className={styles.content}>
            {content}
          </div>
        )}
        {closable && (
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="关闭通知"
            title="关闭通知"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
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
