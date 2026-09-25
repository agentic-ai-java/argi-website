import React, { useEffect, useMemo } from 'react'
import { useLocation } from '@docusaurus/router'
import useBaseUrl from '@docusaurus/useBaseUrl'
import BackToTop from '../components/BackToTop'
import AnnouncementBar from '../components/AnnouncementBar'

interface RootProps {
  children: React.ReactNode
}

export default function Root({ children }: RootProps) {
  const location = useLocation()
  const rootUrl = useBaseUrl('/')
  const zhUrl = useBaseUrl('/zh-Hans/')
  const enUrl = useBaseUrl('/en/')

  const isHomePage = useMemo(() => {
    const normalize = (value: string) => value.replace(/\/+$/, '') || '/'
    const current = normalize(location.pathname)
    return (
      current === normalize(rootUrl) ||
      current === normalize(zhUrl) ||
      current === normalize(enUrl) ||
      current === '/' ||
      current === '/zh-Hans' ||
      current === '/en'
    )
  }, [location.pathname, rootUrl, zhUrl, enUrl])

  // Add the version selector portal to the right side of the navbar once.
  useEffect(() => {
    const navbar = document.querySelector('.navbar__items--right')
    if (!navbar) return

    let versionContainer = document.querySelector('.navbar__version-dropdown')
    if (!versionContainer) {
      versionContainer = document.createElement('div')
      versionContainer.className = 'navbar__version-dropdown'
      versionContainer.id = 'version-dropdown-portal'
      const localeDropdown = navbar.querySelector('.navbar__item.dropdown')
      if (localeDropdown) {
        navbar.insertBefore(versionContainer, localeDropdown)
      } else {
        navbar.appendChild(versionContainer)
      }
    }
  }, [])

  // Enable lightweight image zoom and native lazy-loading for article images on route change.
  useEffect(() => {
    const article = document.querySelector('article')
    if (!article) return

    const images = article.querySelectorAll<HTMLImageElement>('img')
    images.forEach((img) => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy')
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async')
      }

      if (img.closest('.image-zoom-wrapper')) return
      const src = img.getAttribute('src')
      if (!src) return

      const wrapper = document.createElement('div')
      wrapper.className = 'image-zoom-wrapper'

      img.setAttribute('data-zoom-src', src)
      img.setAttribute('data-zoom-alt', img.getAttribute('alt') || '')
      img.style.cursor = 'pointer'

      const zoomButton = document.createElement('div')
      zoomButton.className = 'image-zoom-button'
      zoomButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      `

      img.parentNode?.insertBefore(wrapper, img)
      wrapper.appendChild(img)
      wrapper.appendChild(zoomButton)
    })
  }, [location.pathname])

  useEffect(() => {
    function openImageZoom(src: string, alt: string) {
      const modal = document.createElement('div')
      modal.className = 'image-zoom-modal'
      modal.innerHTML = `
        <div class="image-zoom-backdrop">
          <div class="image-zoom-container">
            <img src="${src}" alt="${alt}" class="image-zoom-image" decoding="async" />
            <button class="image-zoom-close" aria-label="Close image preview">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            ${alt ? `<div class="image-zoom-caption">${alt}</div>` : ''}
          </div>
        </div>
      `

      document.body.appendChild(modal)
      document.body.style.overflow = 'hidden'

      const closeModal = () => {
        modal.remove()
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleKeyDown)
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeModal()
        }
      }

      modal.addEventListener('click', (event) => {
        if (
          event.target === modal ||
          (event.target as Element).classList.contains('image-zoom-backdrop') ||
          (event.target as Element).closest('.image-zoom-close')
        ) {
          closeModal()
        }
      })

      document.addEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        modal.classList.add('image-zoom-modal--open')
      })
    }

    function handleImageClick(event: Event) {
      const target = event.target as HTMLElement
      if (!target) return

      if (target.tagName === 'IMG' && target.closest('.image-zoom-wrapper')) {
        event.preventDefault()
        const imgElement = target as HTMLImageElement
        const src = imgElement.getAttribute('data-zoom-src') || imgElement.src
        const alt = imgElement.getAttribute('data-zoom-alt') || imgElement.alt
        openImageZoom(src, alt)
        return
      }

      if (target.closest('.image-zoom-button')) {
        event.preventDefault()
        const wrapper = target.closest('.image-zoom-wrapper')
        const imgElement = wrapper?.querySelector('img') as HTMLImageElement | null
        if (imgElement) {
          const src = imgElement.getAttribute('data-zoom-src') || imgElement.src
          const alt = imgElement.getAttribute('data-zoom-alt') || imgElement.alt
          openImageZoom(src, alt)
        }
      }
    }

    document.addEventListener('click', handleImageClick)
    return () => {
      document.removeEventListener('click', handleImageClick)
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
