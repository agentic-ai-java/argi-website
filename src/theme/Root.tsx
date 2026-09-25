import React, { useEffect, useState } from 'react'
import BackToTop from '../components/BackToTop'
import AnnouncementBar from '../components/AnnouncementBar'

interface RootProps {
  children: React.ReactNode;
}

export default function Root({ children }: RootProps) {
  const [isHomePage, setIsHomePage] = useState(false)

  useEffect(() => {
    // Check if we're on homepage
    const checkPath = () => {
      const path = window.location.pathname
      
      // Homepage paths: /, /zh-Hans/, /en/
      const normalizedPath = path.replace(/\/$/, '') || '/'
      const isHome = normalizedPath === '/' || 
                     normalizedPath === '/zh-Hans' || 
                     normalizedPath === '/en'
      
      setIsHomePage(isHome)
    }

    checkPath()

    // Listen for route changes
    const handleLocationChange = () => {
      checkPath()
    }

    window.addEventListener('popstate', handleLocationChange)

    // Throttle function to limit frequency
    let timeoutId: NodeJS.Timeout | null = null
    const throttledCheckPath = () => {
      if (timeoutId) return
      timeoutId = setTimeout(() => {
        checkPath()
        timeoutId = null
      }, 500)
    }

    // Use more specific MutationObserver configuration
    const observer = new MutationObserver(throttledCheckPath)

    // Only observe the main content area, not entire body
    const mainContent = document.querySelector('main') || document.body
    observer.observe(mainContent, {
      childList: true,
      subtree: false, // Changed from true to false to reduce overhead
    })

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      observer.disconnect()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // Add the version selector portal to the right side of the navbar.
  useEffect(() => {
    const navbar = document.querySelector('.navbar__items--right')
    if (navbar) {
      // 检查是否已添加
      let versionContainer = document.querySelector('.navbar__version-dropdown')
      if (!versionContainer) {
        versionContainer = document.createElement('div')
        versionContainer.className = 'navbar__version-dropdown'
        versionContainer.id = 'version-dropdown-portal'
        // Place it before the locale dropdown when one is available.
        const localeDropdown = navbar.querySelector('.navbar__item.dropdown')
        if (localeDropdown) {
          navbar.insertBefore(versionContainer, localeDropdown)
        } else {
          navbar.appendChild(versionContainer)
        }
      }
    }
  }, [])

  // Enable image zoom for article content.
  useEffect(() => {
    const processedImages = new WeakSet<HTMLImageElement>()
    
    function initImageZoom() {
      const article = document.querySelector('article')
      if (!article) return

      const images = article.querySelectorAll('img')

      images.forEach((img) => {
        if (processedImages.has(img as HTMLImageElement) || img.closest('.image-zoom-wrapper')) return
        
        processedImages.add(img as HTMLImageElement)

        const src = img.getAttribute('src')
        const alt = img.getAttribute('alt') || ''
        const className = img.getAttribute('class') || ''

        if (src) {
          const fragment = document.createDocumentFragment()
          
          const wrapper = document.createElement('div')
          wrapper.className = 'image-zoom-wrapper'

          const newImg = document.createElement('img')
          newImg.src = src
          newImg.alt = alt
          newImg.className = className
          newImg.setAttribute('data-zoom-src', src)
          newImg.setAttribute('data-zoom-alt', alt)

          Array.from(img.attributes).forEach(attr => {
            if (!['src', 'alt', 'class'].includes(attr.name)) {
              newImg.setAttribute(attr.name, attr.value)
            }
          })

          newImg.style.cursor = 'pointer'

          wrapper.appendChild(newImg)

          const zoomButton = document.createElement('div')
          zoomButton.className = 'image-zoom-button'
          zoomButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          `

          wrapper.appendChild(zoomButton)
          fragment.appendChild(wrapper)

          img.parentNode?.insertBefore(fragment, img)
          img.remove()
        }
      })
    }

    function openImageZoom(src: string, alt: string) {
      const modal = document.createElement('div')
      modal.className = 'image-zoom-modal'

      const modalContent = document.createElement('div')
      modalContent.className = 'image-zoom-modal-content'

      const closeButton = document.createElement('button')
      closeButton.className = 'image-zoom-close'
      closeButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `

      const zoomedImg = document.createElement('img')
      zoomedImg.className = 'image-zoom-zoomed'
      zoomedImg.src = src
      zoomedImg.alt = alt

      const caption = alt ? document.createElement('div') : null
      if (caption) {
        caption.className = 'image-zoom-caption'
        caption.textContent = alt
      }

      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal)
        document.body.classList.remove('modal-open')
      })

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal)
          document.body.classList.remove('modal-open')
        }
      })

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal)
          document.body.classList.remove('modal-open')
          document.removeEventListener('keydown', handleKeyDown)
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      modalContent.appendChild(closeButton)
      modalContent.appendChild(zoomedImg)
      if (caption) modalContent.appendChild(caption)
      modal.appendChild(modalContent)

      document.body.appendChild(modal)
      document.body.classList.add('modal-open')
    }

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const img = target.closest('.image-zoom-wrapper img, .image-zoom-button')
      if (img) {
        const imgElement = target.closest('.image-zoom-wrapper')?.querySelector('img')
        if (imgElement) {
          const src = imgElement.getAttribute('data-zoom-src') || imgElement.src
          const alt = imgElement.getAttribute('data-zoom-alt') || imgElement.alt
          openImageZoom(src, alt)
        }
      }
    }

    document.addEventListener('click', handleImageClick)

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initImageZoom)
    } else {
      initImageZoom()
    }

    let currentPath = window.location.pathname
    let debounceTimer: NodeJS.Timeout | null = null

    const observeUrlChange = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        currentPath = newPath
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(initImageZoom, 300)
      }
    }

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(observeUrlChange, 200)
    })

    const mainContent = document.querySelector('main') || document.body
    observer.observe(mainContent, {
      childList: true,
      subtree: false,
    })

    return () => {
      observer.disconnect()
      document.removeEventListener('click', handleImageClick)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [])

  return (
    <>
      {isHomePage && <AnnouncementBar />}
      {children}
      <BackToTop />
    </>
  )
}
