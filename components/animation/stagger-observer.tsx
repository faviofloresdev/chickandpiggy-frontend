'use client'

import { useEffect } from 'react'

const STAGGER_SELECTOR = '[data-stagger]'

export function StaggerObserver() {
  useEffect(() => {
    const frameIds = new Map<Element, number[]>()

    const markVisible = (element: Element) => {
      element.classList.add('is-stagger-visible')
      element.setAttribute('data-stagger-seen', 'true')
      const ids = frameIds.get(element)

      ids?.forEach((id) => window.cancelAnimationFrame(id))
      frameIds.delete(element)
    }

    const scheduleVisible = (element: Element) => {
      if (element.getAttribute('data-stagger-seen') === 'true') {
        return
      }

      const pendingIds = frameIds.get(element)

      pendingIds?.forEach((id) => window.cancelAnimationFrame(id))

      const firstFrame = window.requestAnimationFrame(() => {
        const secondFrame = window.requestAnimationFrame(() => {
          markVisible(element)
        })

        frameIds.set(element, [firstFrame, secondFrame])
      })

      frameIds.set(element, [firstFrame])
    }

    const elements = new Set<Element>()

    const observeElement = (element: Element, observer: IntersectionObserver | null) => {
      if (elements.has(element) || element.getAttribute('data-stagger-seen') === 'true') {
        return
      }

      elements.add(element)

      if (!observer) {
        scheduleVisible(element)
        return
      }

      observer.observe(element)
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = reducedMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return
              }

              scheduleVisible(entry.target)
              observer?.unobserve(entry.target)
            })
          },
          {
            threshold: 0.16,
            rootMargin: '0px 0px -8% 0px',
          },
        )

    const scan = (root: ParentNode = document) => {
      root.querySelectorAll(STAGGER_SELECTOR).forEach((element) => {
        observeElement(element, observer)
      })
    }

    scan()

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return
          }

          if (node.matches(STAGGER_SELECTOR)) {
            observeElement(node, observer)
          }

          scan(node)
        })
      })
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer?.disconnect()
      mutationObserver.disconnect()
      frameIds.forEach((ids) => {
        ids.forEach((id) => window.cancelAnimationFrame(id))
      })
      frameIds.clear()
      elements.clear()
    }
  }, [])

  return null
}
