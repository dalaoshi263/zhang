import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function PortfolioMotion() {
  useLayoutEffect(() => {
    const root = document.getElementById('root')
    const media = gsap.matchMedia()
    const owners = new Map()
    let disposed = false
    let refreshFrame = 0
    const refresh = () => {
      if (disposed) return
      cancelAnimationFrame(refreshFrame)
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh())
    }

    media.add({ desktop: '(min-width: 761px)', mobile: '(max-width: 760px)', reduced: '(prefers-reduced-motion: reduce)' }, (context) => {
      const { desktop, reduced } = context.conditions
      if (reduced) return undefined
      const sections = [...root.querySelectorAll('[data-motion-section]')]
      // Snapshot visibility in one read phase, before GSAP writes transforms
      // and masks. Interleaving these reads with each reveal's setup forces
      // repeated layout and can misclassify already-scrolled content.
      const bottoms = new Map([...root.querySelectorAll('.section-overture, [data-motion-group], [data-motion-item], [data-motion-image], .wc-heading')]
        .map((node) => [node, node.getBoundingClientRect().bottom]))
      const connections = []
      const register = (nodes, timeline) => nodes.forEach((node) => owners.set(node, timeline))
      const prepare = (nodes) => nodes.forEach((node) => { node.dataset.motionState = 'ready' })
      const begin = (nodes) => nodes.forEach((node) => {
        node.dataset.motionState = 'running'
        node.classList.add('is-motion-running')
        node.style.willChange = 'transform, clip-path'
      })
      const settle = (nodes) => {
        gsap.set(nodes, { clearProps: 'transform,opacity,visibility,clipPath,willChange' })
        nodes.forEach((node) => { node.dataset.motionState = 'complete'; node.classList.remove('is-motion-running'); owners.delete(node) })
      }
      const connect = (timeline, trigger, id, nodes) => {
        register(nodes, timeline)
        connections.push({
          id, trigger, start: 'top 88%', end: 'bottom top', animation: timeline,
          toggleActions: 'play none none none', once: true,
          onLeave: () => { if (timeline.progress() < 1) timeline.progress(1).pause() },
        })
      }
      const revealItems = (items, trigger, id) => {
        if (!items.length) return
        if (bottoms.get(trigger) < 0) {
          items.forEach((node) => { node.dataset.motionState = 'complete' })
          return
        }
        prepare(items)
        gsap.set(items, { y: desktop ? 100 : 58, scaleY: .94, rotation: desktop ? .85 : 0, clipPath: 'inset(100% -2% -2% -2%)', transformOrigin: '50% 100%' })
        const timeline = gsap.timeline({ paused: true, delay: .5, onStart: () => begin(items), onComplete: () => settle(items) })
        timeline.to(items,
          { y: 0, scaleY: 1, rotation: 0, clipPath: 'inset(-2% -2% -2% -2%)', duration: 1.45, stagger: { each: .14, from: 'start' }, ease: 'power4.out' },
          .08)
        connect(timeline, trigger, id, items)
      }

      sections.forEach((section, sectionIndex) => {
        section.dataset.motionEnhanced = 'true'
        const title = section.querySelector('.section-overture')
        const lines = [...section.querySelectorAll('.motion-title-line')]
        if (title && lines.length && bottoms.get(title) >= 0) {
          prepare(lines)
          gsap.set(lines, { xPercent: desktop ? 14 : 7, yPercent: 118, scaleX: .76, scaleY: 1.24, rotation: 4, skewY: 3, transformOrigin: '0% 100%' })
          const timeline = gsap.timeline({ paused: true, onStart: () => begin(lines), onComplete: () => settle(lines) })
          timeline.to(lines,
            { xPercent: 0, yPercent: 0, scaleX: 1, scaleY: 1, rotation: 0, skewY: 0, duration: 1.8, stagger: .18, ease: 'expo.out' })
          connect(timeline, title, `section-title-${section.id}`, lines)
        }

        const grouped = new Set()
        section.querySelectorAll('[data-motion-group]').forEach((group, index) => {
          const items = [...group.querySelectorAll('[data-motion-item]')].filter((item) => item.closest('[data-motion-group]') === group)
          items.forEach((item) => grouped.add(item))
          revealItems(items, group, `section-group-${section.id}-${index}`)
        })

        // Adjacent heading columns enter together; cards farther down have
        // their own local trigger so they never finish outside the viewport.
        const independent = [...section.querySelectorAll('[data-motion-item]')].filter((item) => !grouped.has(item))
        const heading = section.querySelector('.wc-heading')
        const headingItems = heading ? independent.filter((node) => heading.contains(node)) : []
        if (headingItems.length) revealItems(headingItems, heading, `section-heading-${section.id}`)
        independent.filter((node) => !headingItems.includes(node)).forEach((node, index) => {
          revealItems([node], node, `section-item-${sectionIndex}-${index}`)
        })

        section.querySelectorAll('[data-motion-image]').forEach((image, index) => {
          if (bottoms.get(image) < 0) { image.dataset.motionState = 'complete'; return }
          prepare([image])
          const isPortrait = image.classList.contains('portrait-motion-frame')
          gsap.set(image, { clipPath: 'inset(0% 100% 0% 0%)', scale: isPortrait ? 1 : 1.035, y: isPortrait ? 0 : desktop ? 48 : 28, transformOrigin: '0% 50%' })
          const timeline = gsap.timeline({ paused: true, delay: .55, onStart: () => begin([image]), onComplete: () => settle([image]) })
          timeline.to(image,
            { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, y: 0, duration: 1.7, ease: 'power4.inOut' })
          connect(timeline, image, `section-image-${section.id}-${index}`, [image])
        })
      })

      // Register triggers after the initial style-write phase. ScrollTrigger
      // owns one shared scroll update loop; no per-card scroll listener runs.
      connections.forEach((options) => ScrollTrigger.create(options))

      // Keep the portrait's geometry fixed while the real video frames turn.
      // A second scroll-driven transform made the head appear to float.

      // Keyboard users can reveal a focused control immediately, without
      // waiting for its cinematic entrance to reach the final position.
      const revealFocused = (event) => {
        const item = event.target.closest('[data-motion-item], [data-motion-image]')
        if (item) owners.get(item)?.progress(1).pause()
      }
      root.addEventListener('focusin', revealFocused)
      refresh()
      return () => {
        root.removeEventListener('focusin', revealFocused)
        owners.clear()
        sections.forEach((section) => {
          delete section.dataset.motionEnhanced
          section.querySelectorAll('.is-motion-running').forEach((node) => node.classList.remove('is-motion-running'))
          section.querySelectorAll('[data-motion-state]').forEach((node) => delete node.dataset.motionState)
        })
      }
    }, root)

    if (document.fonts?.ready) document.fonts.ready.then(refresh)
    window.addEventListener('load', refresh, { once: true })
    refresh()
    return () => {
      disposed = true
      cancelAnimationFrame(refreshFrame)
      window.removeEventListener('load', refresh)
      media.revert()
    }
  }, [])
  return null
}
