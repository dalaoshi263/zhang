import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './works-carousel.css'
import useMediaActivity from './useMediaActivity.js'

function ArrowIcon({ direction = 'right' }) {
  return <svg className={direction === 'left' ? 'wc-arrow-icon is-left' : 'wc-arrow-icon'} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h17m-6-6 6 6-6 6" /></svg>
}

function PlayIcon() {
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true"><path d="m8 4 13 8-13 8V4Z" /></svg>
}

function UploadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" /></svg>
}

const pad = (number) => String(number).padStart(2, '0')
const aspectLabel = (width, height, portrait) => {
  const w = Math.round(Number(width))
  const h = Math.round(Number(height))
  if (!w || !h) return portrait ? '9:16' : '横屏'
  const divisor = (a, b) => b ? divisor(b, a % b) : a
  const common = divisor(w, h)
  return `${w / common}:${h / common}`
}

export default function WorksCarousel({ projects = [], customVideos = {}, onOpen, onUpload }) {
  const [filter, setFilter] = useState('全部作品')
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [layout, setLayout] = useState({ viewport: 0, card: 0, stage: 0, gap: 0 })
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(navigator.connection?.saveData))
  const [inViewport, setInViewport] = useState(false)
  const [mediaNearby, setMediaNearby] = useState(false)
  const { dialogOpen, pageVisible } = useMediaActivity()
  const [videoErrors, setVideoErrors] = useState({})
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const cursorRef = useRef(null)
  const interactionFrameRef = useRef(0)
  const pendingPointerRef = useRef(null)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const suppressTimerRef = useRef(null)
  const wheelRef = useRef({ amount: 0, changedAt: 0 })

  const categories = useMemo(() => ['全部作品', ...new Set(projects.map((project) => project.filter))], [projects])
  const visibleProjects = useMemo(() => projects.filter((project) => filter === '全部作品' || project.filter === filter), [projects, filter])
  const currentIndex = Math.min(activeIndex, Math.max(0, visibleProjects.length - 1))
  const currentProject = visibleProjects[currentIndex]
  const currentSource = currentProject && (customVideos[currentProject.id]?.url || currentProject.previewVideo || currentProject.video || currentProject.demoVideo)
  const canPreview = inViewport && !dialogOpen && !reducedMotion && pageVisible

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches || Boolean(navigator.connection?.saveData))
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => setVideoErrors({}), [customVideos])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    if (!('IntersectionObserver' in window)) {
      setInViewport(true)
      setMediaNearby(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => {
      setInViewport(entry.isIntersecting && entry.intersectionRatio >= .12)
    }, { threshold: [0, .12, .3] })
    const nearby = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setMediaNearby(true); nearby.disconnect() }
    }, { rootMargin: '700px 0px' })
    observer.observe(viewport)
    nearby.observe(viewport)
    return () => { observer.disconnect(); nearby.disconnect() }
  }, [])

  useEffect(() => {
    const video = viewportRef.current?.querySelector('.wc-slide.is-active .wc-preview-video')
    if (!video) return
    if (canPreview && !document.querySelector('dialog[open]')) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [currentIndex, currentProject?.id, currentSource, canPreview, videoErrors])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return undefined
    const measure = () => {
      const firstSlide = track.querySelector('.wc-slide')
      const firstArtwork = firstSlide?.querySelector('.wc-artwork')
      const styles = window.getComputedStyle(track)
      const next = {
        viewport: viewport.clientWidth,
        card: firstSlide?.offsetWidth || 0,
        stage: firstArtwork?.offsetHeight || 0,
        gap: parseFloat(styles.columnGap || styles.gap) || 0,
      }
      setLayout((previous) => Object.keys(next).every((key) => previous[key] === next[key]) ? previous : next)
    }
    measure()
    let frame = 0
    const observer = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure() })
    })
    observer.observe(viewport)
    if (track.firstElementChild) observer.observe(track.firstElementChild)
    const firstArtwork = track.firstElementChild?.querySelector('.wc-artwork')
    if (firstArtwork) observer.observe(firstArtwork)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [filter, visibleProjects.length])

  useEffect(() => () => { clearTimeout(suppressTimerRef.current); cancelAnimationFrame(interactionFrameRef.current) }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const onWheel = (event) => {
      if (visibleProjects.length < 2 || Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.15) return
      event.preventDefault()
      const now = performance.now()
      if (now - wheelRef.current.changedAt < 540) return
      wheelRef.current.amount += event.deltaX * (event.deltaMode === 1 ? 16 : 1)
      if (Math.abs(wheelRef.current.amount) < 56) return
      const direction = Math.sign(wheelRef.current.amount)
      setActiveIndex((index) => Math.max(0, Math.min(visibleProjects.length - 1, index + direction)))
      wheelRef.current.amount = 0
      wheelRef.current.changedAt = now
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [visibleProjects.length])

  function changeFilter(nextFilter) {
    setFilter(nextFilter)
    setActiveIndex(0)
    trackRef.current?.style.setProperty('--wc-drag-x', '0px')
    setDragging(false)
    wheelRef.current.amount = 0
  }

  function goTo(index) {
    setActiveIndex(Math.max(0, Math.min(visibleProjects.length - 1, index)))
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, lastX: event.clientX, dragging: false }
  }

  function handlePointerMove(event) {
    const gesture = dragRef.current
    let offset = null
    if (gesture && gesture.pointerId === event.pointerId) {
      const distance = event.clientX - gesture.startX
      gesture.lastX = event.clientX
      if (!gesture.dragging && Math.abs(distance) > 7) {
        gesture.dragging = true
        setDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      if (gesture.dragging) {
        const atEdge = (currentIndex === 0 && distance > 0) || (currentIndex === visibleProjects.length - 1 && distance < 0)
        offset = atEdge ? distance * .28 : distance
      }
    }
    if (event.pointerType === 'touch' && offset === null) return
    pendingPointerRef.current = { x: event.clientX, y: event.clientY, showCursor: event.pointerType !== 'touch' && !reducedMotion, offset }
    if (interactionFrameRef.current) return
    interactionFrameRef.current = requestAnimationFrame(() => {
      interactionFrameRef.current = 0
      const pending = pendingPointerRef.current
      const viewport = viewportRef.current
      if (!pending || !viewport) return
      const rect = pending.showCursor ? viewport.getBoundingClientRect() : null
      if (rect && cursorRef.current) {
        cursorRef.current.style.setProperty('--wc-cursor-x', `${pending.x - rect.left}px`)
        cursorRef.current.style.setProperty('--wc-cursor-y', `${pending.y - rect.top}px`)
      }
      if (pending.offset !== null) trackRef.current?.style.setProperty('--wc-drag-x', `${pending.offset}px`)
    })
  }

  function finishPointer(event, cancelled = false) {
    const gesture = dragRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.dragging) {
      const distance = gesture.lastX - gesture.startX
      if (!cancelled && Math.abs(distance) > Math.max(65, layout.card * .12)) goTo(currentIndex + (distance < 0 ? 1 : -1))
      suppressClickRef.current = true
      clearTimeout(suppressTimerRef.current)
      suppressTimerRef.current = setTimeout(() => { suppressClickRef.current = false }, 150)
    }
    dragRef.current = null
    cancelAnimationFrame(interactionFrameRef.current)
    interactionFrameRef.current = 0
    pendingPointerRef.current = null
    trackRef.current?.style.setProperty('--wc-drag-x', '0px')
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(currentIndex + 1) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(currentIndex - 1) }
    else if (event.key === 'Home') { event.preventDefault(); goTo(0) }
    else if (event.key === 'End') { event.preventDefault(); goTo(visibleProjects.length - 1) }
  }

  function handleSlideClick(event, project, index) {
    if (suppressClickRef.current) { event.preventDefault(); return }
    if (index !== currentIndex) { goTo(index); return }
    onOpen?.(project)
  }

  const trackX = layout.card
    ? (layout.viewport - layout.card) / 2 - currentIndex * (layout.card + layout.gap)
    : 0

  return <div className="wc-root">
    <div className="wc-heading">
      <div className="wc-heading-main" data-motion-item><span className="wc-kicker">SELECTED FILMS / {pad(projects.length)}</span><h2>让每一帧，<br /><em>都有回声。</em></h2></div>
      <div className="wc-heading-aside" data-motion-item><span className="wc-aside-mark" aria-hidden="true">✳</span><p>短剧与视频成片，保留原始横竖画幅。<br />左右滑动切换，点击画面观看完整作品。</p><span className="wc-aside-english">STORIES WORTH STAYING FOR.</span></div>
    </div>

    <div className="wc-toolbar" data-motion-item><div className="wc-filters" role="group" aria-label="作品类型筛选">{categories.map((category) => <button className={filter === category ? 'wc-filter is-active' : 'wc-filter'} key={category} type="button" aria-pressed={filter === category} onClick={() => changeFilter(category)}><span>{category}</span><sup>{pad(category === '全部作品' ? projects.length : projects.filter((project) => project.filter === category).length)}</sup></button>)}</div><button className="wc-upload" type="button" onClick={() => onUpload?.(currentProject?.id)}><UploadIcon />预览本地作品<ArrowIcon /></button></div>

    <div className={`wc-stage${inViewport ? ' is-media-visible' : ''}`} data-motion-image>
      <div className="wc-edge-label wc-edge-left" aria-hidden="true">YITING / SELECTED WORKS</div>
      <div className={dragging ? 'wc-viewport is-dragging' : 'wc-viewport'} ref={viewportRef} role="region" aria-roledescription="作品轮播" aria-label="剪辑作品，按左右方向键切换" tabIndex={0} onKeyDown={handleKeyDown} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishPointer} onPointerCancel={(event) => finishPointer(event, true)} onLostPointerCapture={(event) => { if (dragRef.current?.pointerId === event.pointerId) finishPointer(event, true) }}>
        <div className="wc-track" ref={trackRef} style={{ transform: `translateX(calc(${trackX}px + var(--wc-drag-x, 0px)))` }}>
          {visibleProjects.map((project, index) => {
            const isActive = index === currentIndex
            const customVideo = customVideos[project.id]
            const source = customVideo?.url || project.previewVideo || project.video || project.demoVideo
            const showVideo = Boolean(isActive && canPreview && source && !videoErrors[project.id])
            const showPoster = mediaNearby && Math.abs(index - currentIndex) <= 1
            const previewLabel = customVideo ? '本地视频 · 临时预览' : project.video ? '真实视频作品' : project.demoVideo ? '示例视频' : '作品封面'
            const isPortrait = Number(project.width) > 0 && Number(project.height) > 0 ? project.width < project.height : project.orientation === 'portrait'
            const aspectNumber = Number(project.width) > 0 && Number(project.height) > 0 ? project.width / project.height : isPortrait ? 9 / 16 : 16 / 9
            const frameWidth = layout.card && layout.stage ? Math.min(layout.card, layout.stage * aspectNumber) : null
            const frameHeight = layout.card && layout.stage ? Math.min(layout.stage, layout.card / aspectNumber) : null
            return <article className={isActive ? 'wc-slide is-active' : 'wc-slide'} key={project.id} aria-label={`${pad(index + 1)} / ${pad(visibleProjects.length)} ${project.title}`}>
              <div className={isPortrait ? 'wc-artwork is-portrait' : 'wc-artwork is-landscape'}>
                <button className="wc-artwork-button" type="button" tabIndex={isActive ? 0 : -1} onClick={(event) => handleSlideClick(event, project, index)} aria-label={isActive ? `${customVideo || project.video ? '播放作品' : project.demoVideo ? '播放示例视频' : '查看项目'}：${project.title}` : `切换到${project.title}`}>
                  {showPoster && <img className="wc-ambient" src={project.ambientImage || project.image} alt="" width="192" height="192" decoding="async" fetchPriority="low" draggable="false" />}
                  <span className="wc-media-frame" style={frameWidth && frameHeight ? { width: `${frameWidth}px`, height: `${frameHeight}px` } : undefined}>{showPoster && <img className="wc-poster" src={project.image} alt="" width={project.width} height={project.height} decoding="async" fetchPriority="low" draggable="false" />}
                    {showVideo && <video className="wc-preview-video" key={source} src={source} autoPlay muted loop playsInline preload="none" poster={project.image} aria-hidden="true" onError={() => setVideoErrors((errors) => ({ ...errors, [project.id]: true }))} />}
                  </span>
                  <span className="wc-image-wash" />
                  <span className="wc-card-top"><span>{project.number || pad(index + 1)} / {project.category}</span><span>{aspectLabel(project.width, project.height, isPortrait)} · {previewLabel}</span></span>
                  <span className="wc-play" aria-hidden="true"><PlayIcon /></span>
                  <span className="wc-card-bottom"><span className="wc-card-subtitle">{project.subtitle || project.category}</span><span className="wc-card-action">{isActive ? (customVideo || project.video ? '观看完整作品' : project.demoVideo ? '播放示例' : '查看项目') : '切换作品'}<ArrowIcon /></span></span>
                </button>
              </div>
              <div className="wc-slide-caption"><div><span className="wc-slide-number">{project.number || pad(index + 1)} <i>/</i> {project.year || '2026'}</span><h3>{project.title}</h3><p>{project.summary}</p></div><span className="wc-slide-tags">{project.tags?.slice(0, 3).join('　/　')}</span></div>
            </article>
          })}
        </div>
        <div className="wc-pointer-hint" ref={cursorRef} aria-hidden="true">DRAG<br />↔</div>
      </div>
      <div className="wc-edge-label wc-edge-right" aria-hidden="true">FRAME BY FRAME / 2026</div>
    </div>

    <div className="wc-navigation" data-motion-item><div className="wc-counter" aria-live="polite" aria-atomic="true"><strong>{pad(currentIndex + 1)}</strong><span>/ {pad(visibleProjects.length)}</span><span className="wc-sr-only">当前作品：{currentProject?.title}</span></div><div className="wc-progress"><input type="range" min="0" max={Math.max(0, visibleProjects.length - 1)} step="1" value={currentIndex} onChange={(event) => goTo(Number(event.target.value))} aria-label="选择作品" aria-valuetext={`${pad(currentIndex + 1)} / ${pad(visibleProjects.length)}：${currentProject?.title || ''}`} disabled={visibleProjects.length < 2} style={{ '--wc-progress': `${visibleProjects.length < 2 ? 100 : currentIndex / (visibleProjects.length - 1) * 100}%` }} /></div><div className="wc-arrows"><button type="button" aria-label="上一个作品" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}><ArrowIcon direction="left" /></button><button type="button" aria-label="下一个作品" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === visibleProjects.length - 1}><ArrowIcon /></button></div></div>
    <p className="wc-note" data-motion-item><span aria-hidden="true">✳</span>当前展示 {projects.length} 支已提供的作品视频。画面静音循环预览；点击画面可观看完整版本。你也可以临时载入本地视频，文件仅在当前浏览器播放。</p>
  </div>
}
