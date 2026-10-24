import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import useMediaActivity from './useMediaActivity.js'
import { publicAsset } from './publicAsset.js'

const FILM_URL = publicAsset('video/cinematic-reel.mp4')
const PREVIEW_URL = publicAsset('video/cinematic-reel-preview.mp4')
const FILM_POSTER = publicAsset('images/cinematic-poster.webp')

function Arrow({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 19 19 5M7 5h12v12" /></svg>
}

function PlayIcon({ size = 17 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 4 12 8-12 8V4Z" /></svg>
}

function PauseIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(value || 0))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function CinematicHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let frame = 0
    let previous = window.scrollY > 32
    setScrolled(previous)
    const update = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const next = window.scrollY > 32
        if (next !== previous) { previous = next; setScrolled(next) }
      })
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => { window.removeEventListener('scroll', update); cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const links = [
    ['works', '作品放映'],
    ['about', '关于我'],
    ['strengths', '创作能力'],
  ]

  return <header className={`editorial-header${scrolled ? ' is-scrolled' : ''}${open ? ' menu-open' : ''}`}>
    <div className="editorial-header-inner container">
      <a className="editorial-brand" href="#home" onClick={() => setOpen(false)} aria-label="张依婷作品集首页">
        <span className="editorial-brand-name">YITING<span className="editorial-brand-period">.</span></span>
        <span className="editorial-brand-caption">张依婷 / 短视频剪辑师</span>
      </a>
      <nav id="editorial-mobile-navigation" className={`editorial-nav${open ? ' is-open' : ''}`} aria-label="主导航">
        {links.map(([id, name], index) => <a href={`#${id}`} key={id} onClick={() => setOpen(false)}><span>0{index + 1}</span>{name}</a>)}
        <a href="#contact" className="editorial-mobile-contact" onClick={() => setOpen(false)}>联系合作 <Arrow size={16} /></a>
      </nav>
      <a className="editorial-contact" href="#contact" onClick={() => setOpen(false)}><span>联系合作</span><span className="editorial-contact-arrow"><Arrow size={17} /></span></a>
      <button className="editorial-menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? '关闭导航' : '打开导航'} aria-expanded={open} aria-controls="editorial-mobile-navigation"><span>{open ? 'CLOSE' : 'MENU'}</span><span className="editorial-menu-lines" aria-hidden="true"><i /><i /></span></button>
    </div>
  </header>
}

function ReelDialog({ onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return <dialog className="cinematic-dialog" ref={dialogRef} onCancel={onClose} onClick={(event) => { if (event.target === dialogRef.current) onClose() }} aria-labelledby="cinematic-dialog-title">
    <div className="cinematic-dialog-inner">
      <div className="cinematic-dialog-top"><span>YITING / FILM STUDY № 01</span><button type="button" onClick={onClose} aria-label="关闭影像放映">关闭 <span aria-hidden="true">×</span></button></div>
      <video src={FILM_URL} poster={FILM_POSTER} autoPlay controls playsInline preload="metadata" aria-label="六镜头电影感影像混剪" />
      <div className="cinematic-dialog-bottom"><div><h2 id="cinematic-dialog-title">影像的情绪练习</h2><p>人物、镜头、城市和自然的六镜头混剪。公开授权素材制作的视觉演示，并非张依婷的真实客户作品。</p></div><span>00:22 / 2026</span></div>
    </div>
  </dialog>
}

export default function CinematicHero() {
  const videoRef = useRef(null)
  const heroRef = useRef(null)
  const progressRef = useRef(null)
  const { pageVisible, dialogOpen } = useMediaActivity()
  const [heroVisible, setHeroVisible] = useState(false)
  const [videoRequested, setVideoRequested] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const wantsPlaybackRef = useRef(!reducedMotion && !navigator.connection?.saveData)
  const [playing, setPlaying] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(22.75)
  const [reelOpen, setReelOpen] = useState(false)
  const openingRef = useRef(null)
  const skipOpeningRef = useRef(() => {})
  const replayOpeningRef = useRef(() => {})
  const [openingActive, setOpeningActive] = useState(() => {
    const destination = window.location.hash
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && (!destination || destination === '#home') && window.scrollY < 80
  })

  useLayoutEffect(() => {
    const hero = heroRef.current
    const opening = openingRef.current
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const destination = window.location.hash
    const bypass = motionQuery.matches || (destination && destination !== '#home') || window.scrollY > 80
    const header = document.querySelector('.editorial-header')
    const headerParts = header ? [...header.querySelectorAll('.editorial-brand, .editorial-nav > a, .editorial-contact, .editorial-menu-button')] : []
    const titleLines = hero.querySelectorAll('.cinematic-title-line')
    const details = hero.querySelectorAll('.cinematic-topline > span, .cinematic-kicker, .cinematic-title-bottom > p, .cinematic-title-actions, .cinematic-hero-footer > div, .cinematic-watch')
    let timeline
    let active = false

    const finishOpening = () => {
      if (!timeline) return
      timeline.progress(1).pause()
      active = false
      setOpeningActive(false)
    }

    const context = gsap.context(() => {
      const settle = () => {
        active = false
        setOpeningActive(false)
        gsap.set(opening, { autoAlpha: 0 })
        gsap.set([...titleLines, ...details, ...headerParts], { clearProps: 'transform,opacity,visibility,willChange' })
        gsap.set(hero.querySelector('.cinematic-media'), { clearProps: 'transform,willChange' })
      }

      timeline = gsap.timeline({ paused: true, defaults: { ease: 'power4.inOut' }, onComplete: settle })
      timeline
        .set(opening, { autoAlpha: 1 })
        .set('.hero-opening-panel', { yPercent: 0 })
        .set('.hero-opening-wordmark > span', { yPercent: 125, scaleY: 1.4, rotate: 4, transformOrigin: '50% 100%' })
        .set('.hero-opening-caption > span', { yPercent: 120 })
        .set('.hero-opening-meta, .hero-opening-skip', { autoAlpha: 0, y: 14 })
        .set('.hero-opening-rule', { scaleX: 0, transformOrigin: '0% 50%' })
        .set(titleLines, { yPercent: 130, scaleY: 1.28, rotate: 2, transformOrigin: '0% 100%', willChange: 'transform' })
        .set(details, { y: 36, autoAlpha: 0, willChange: 'transform' })
        .set(headerParts, { y: -28, autoAlpha: 0, willChange: 'transform' })
        .set('.cinematic-media', { scale: 1.13, transformOrigin: '65% 50%', willChange: 'transform' })
        .to('.hero-opening-wordmark > span', { yPercent: 0, scaleY: 1, rotate: 0, duration: 1.15, stagger: .085, ease: 'expo.out' }, .12)
        .to('.hero-opening-caption > span', { yPercent: 0, duration: .85, ease: 'power3.out' }, .4)
        .to('.hero-opening-meta, .hero-opening-skip', { autoAlpha: 1, y: 0, duration: .7, stagger: .07, ease: 'power3.out' }, .24)
        .to('.hero-opening-rule', { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }, .3)
        .to('.hero-opening-wordmark > span', { yPercent: -125, scaleY: .72, duration: .8, stagger: .055, ease: 'power4.in' }, 1.3)
        .to('.hero-opening-caption > span', { yPercent: -120, duration: .6, ease: 'power3.in' }, 1.38)
        .to('.hero-opening-meta, .hero-opening-skip, .hero-opening-rule', { autoAlpha: 0, duration: .45 }, 1.45)
        .to('.hero-opening-panel-top', { yPercent: -101, duration: 1.55 }, 1.55)
        .to('.hero-opening-panel-bottom', { yPercent: 101, duration: 1.55 }, 1.55)
        .to('.cinematic-media', { scale: 1, duration: 2.4, ease: 'power3.out' }, 1.6)
        .to(titleLines, { yPercent: 0, scaleY: 1, rotate: 0, duration: 1.85, stagger: .18, ease: 'expo.out' }, 1.92)
        .to(headerParts, { y: 0, autoAlpha: 1, duration: 1.15, stagger: .055, ease: 'power3.out' }, 2.16)
        .to(details, { y: 0, autoAlpha: 1, duration: 1.2, stagger: .075, ease: 'power3.out' }, 2.34)

      replayOpeningRef.current = () => {
        if (motionQuery.matches) return
        window.scrollTo({ top: 0, behavior: 'instant' })
        active = true
        setOpeningActive(true)
        timeline.restart()
      }
      skipOpeningRef.current = finishOpening
      if (bypass) finishOpening()
      else {
        active = true
        timeline.play(0)
      }
    }, hero)

    const skipOnIntent = (event) => {
      if (!active) return
      if (event.type !== 'keydown' || ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) finishOpening()
    }
    const skipOnDestination = () => {
      if (window.location.hash && window.location.hash !== '#home') finishOpening()
    }
    const skipForMotionPreference = () => { if (motionQuery.matches) finishOpening() }
    window.addEventListener('wheel', skipOnIntent, { passive: true })
    window.addEventListener('touchmove', skipOnIntent, { passive: true })
    window.addEventListener('keydown', skipOnIntent)
    window.addEventListener('hashchange', skipOnDestination)
    motionQuery.addEventListener('change', skipForMotionPreference)
    return () => {
      window.removeEventListener('wheel', skipOnIntent)
      window.removeEventListener('touchmove', skipOnIntent)
      window.removeEventListener('keydown', skipOnIntent)
      window.removeEventListener('hashchange', skipOnDestination)
      motionQuery.removeEventListener('change', skipForMotionPreference)
      skipOpeningRef.current = () => {}
      replayOpeningRef.current = () => {}
      context.revert()
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(query.matches)
      if (query.matches) {
        wantsPlaybackRef.current = false
        videoRef.current?.pause()
      }
    }
    query.addEventListener('change', update)
    if (query.matches) videoRef.current?.pause()
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const intersection = new IntersectionObserver(([entry]) => {
      setHeroVisible(entry.isIntersecting && entry.intersectionRatio >= .2)
    }, { threshold: [0, .2] })
    intersection.observe(heroRef.current)
    return () => intersection.disconnect()
  }, [])

  useEffect(() => {
    if (videoRequested || !heroVisible || !pageVisible || dialogOpen || !wantsPlaybackRef.current) return undefined
    // Let the critical poster and opening text paint before fetching the reel.
    const timer = window.setTimeout(() => setVideoRequested(true), openingActive ? 1400 : 0)
    return () => clearTimeout(timer)
  }, [videoRequested, heroVisible, pageVisible, dialogOpen, openingActive])

  useEffect(() => {
    const video = videoRef.current
    if (videoRequested && wantsPlaybackRef.current && heroVisible && pageVisible && !dialogOpen) {
      video.play().catch(() => setPlaying(false))
    } else video.pause()
    return () => video.pause()
  }, [videoRequested, heroVisible, pageVisible, dialogOpen])

  async function togglePlayback() {
    const video = videoRef.current
    if (!video || videoError) return
    if (video.paused) {
      wantsPlaybackRef.current = true
      if (!videoRequested) { setVideoRequested(true); return }
      try { await video.play() } catch { setPlaying(false) }
    } else {
      wantsPlaybackRef.current = false
      video.pause()
    }
  }

  function openReel() {
    videoRef.current?.pause()
    setReelOpen(true)
  }

  function closeReel() {
    setReelOpen(false)
  }

  function updateProgress(event) {
    const video = event.currentTarget
    const second = Math.floor(video.currentTime)
    setCurrentTime((previous) => previous === second ? previous : second)
    const progress = Math.min(1, video.currentTime / Math.max(video.duration || duration, 1))
    progressRef.current?.style.setProperty('--film-progress', progress)
    progressRef.current?.setAttribute('aria-valuenow', Math.round(progress * 100))
  }

  return <section ref={heroRef} className={`cinematic-hero${openingActive ? ' is-opening' : ''}`} id="home" aria-label="张依婷作品集首页">
    <div ref={openingRef} className={`hero-opening${openingActive ? ' is-active' : ''}`} aria-hidden={!openingActive}>
      <div className="hero-opening-panel hero-opening-panel-top" aria-hidden="true" />
      <div className="hero-opening-panel hero-opening-panel-bottom" aria-hidden="true" />
      <div className="hero-opening-meta" aria-hidden="true"><span>YITING / INDEPENDENT EDITOR</span><span>A PORTFOLIO IN MOTION · 2026</span></div>
      <div className="hero-opening-center" aria-hidden="true"><div className="hero-opening-wordmark"><span>Y</span><span>T</span><span>.</span></div><div className="hero-opening-caption"><span>FILMS. STORIES. FEELINGS.</span></div></div>
      <div className="hero-opening-rule" aria-hidden="true" />
      <button className="hero-opening-skip" type="button" onClick={() => skipOpeningRef.current()} tabIndex={openingActive ? 0 : -1}>跳过开场 <span aria-hidden="true">↗</span><small>SKIP INTRO / ESC</small></button>
    </div>
    <div className="cinematic-media" aria-hidden="true">
      <img src={FILM_POSTER} alt="" width="1920" height="1080" fetchPriority="high" decoding="async" />
      <video ref={videoRef} src={videoRequested ? PREVIEW_URL : undefined} muted loop playsInline preload="none" poster={FILM_POSTER} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 22.75)} onTimeUpdate={updateProgress} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setVideoError(true); setPlaying(false) }} />
    </div>
    <div className="cinematic-overlay" aria-hidden="true" />
    <div className="cinematic-grain" aria-hidden="true" />
    <div className="cinematic-hero-inner container">
      <div className="cinematic-topline"><span>ZHANG YITING / EDITOR & STORYTELLER</span><span>SUZHOU, CN <i /> 2026</span></div>
      <div className="cinematic-title-group">
        <div className="cinematic-kicker"><span className="cinematic-kicker-line" />独立短视频剪辑师 <span>·</span> 剪出节奏，留下故事</div>
        <h1><span className="cinematic-title-mask"><span className="cinematic-title-line">让画面，</span></span><span className="cinematic-title-mask"><span className="cinematic-title-line">留下<span className="cinematic-title-italic">回响。</span></span></span></h1>
        <div className="cinematic-title-bottom"><p>从素材到情绪，从第一帧到最后一秒。<br />让品牌和人物的故事，被认真看见。</p><div className="cinematic-title-actions"><a href="#works" className="cinematic-primary">探索剪辑作品 <Arrow size={18} /></a><a href="#about" className="cinematic-text-link">认识我 <span aria-hidden="true">↘</span></a></div></div>
      </div>
      <div className="cinematic-hero-footer">
        <div className="cinematic-film-label"><span className="cinematic-film-star" aria-hidden="true">✳</span><div><strong>VISUAL FILM STUDY</strong><span>电影感影像练习 / 授权素材演示</span></div><button className="hero-opening-replay" type="button" onClick={() => replayOpeningRef.current()} aria-label="重播首屏开场动画"><span aria-hidden="true">↻</span>重播开场</button></div>
        <button className="cinematic-watch" type="button" onClick={openReel} aria-label="播放电影感影像练习"><span className="cinematic-watch-orbit"><PlayIcon /></span><span>观看影片 <small>PLAY THE FILM</small></span></button>
        <div className="cinematic-playback"><div className="cinematic-time"><span>{formatTime(currentTime)}</span><span>/</span><span>{formatTime(duration)}</span></div><button type="button" onClick={togglePlayback} disabled={videoError} aria-label={playing ? '暂停背景视频' : '播放背景视频'}>{playing ? <PauseIcon /> : <PlayIcon size={14} />}<span>{playing ? '暂停' : '播放'}</span></button></div>
      </div>
    </div>
    <div ref={progressRef} className="cinematic-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="背景短片播放进度"><span /></div>
    {reelOpen && <ReelDialog onClose={closeReel} />}
  </section>
}
