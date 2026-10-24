import React, { useEffect, useRef } from 'react'
import './portrait-gaze.css'

const PHOTO = { width: 1122, height: 1402 }
const EYES = [{ x: 467, y: 481 }, { x: 664, y: 484 }]
const FRAME_INTERVAL = 1000 / 60

export default function PortraitGaze({ src }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas.parentElement
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const state = { face: { x: 0, y: 0 }, eyes: EYES.map(() => ({ x: 0, y: 0 })), blink: 0 }
    let renderer = null, image = null, disposed = false, failed = false, visible = false, initializing = false
    let pointer = null, listening = false, frame = 0, previousTime = 0, blinkTimer = 0, blinkStart = -Infinity

    const allowed = () => visible && pointerQuery.matches && !motionQuery.matches && !document.hidden
    const display = (rendering, following = rendering) => {
      const rendered = rendering ? 'true' : 'false'
      const tracking = following ? 'true' : 'false'
      if (parent.dataset.gazeRendering !== rendered) parent.dataset.gazeRendering = rendered
      if (canvas.dataset.following !== tracking) canvas.dataset.following = tracking
    }
    const neutral = () => {
      state.face.x = state.face.y = state.blink = 0
      state.eyes.forEach((eye) => { eye.x = eye.y = 0 })
      canvas.dataset.gazeX = canvas.dataset.gazeY = canvas.dataset.blink = '0.000'
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = previousTime = 0
      clearTimeout(blinkTimer)
      blinkTimer = 0
      blinkStart = -Infinity
      display(false)
      neutral()
    }
    const armBlink = () => {
      if (blinkTimer || !pointer || !allowed()) return
      blinkTimer = window.setTimeout(() => {
        blinkTimer = 0
        if (pointer && allowed()) { blinkStart = performance.now(); schedule() }
      }, 4200 + Math.random() * 2600)
    }
    const draw = (time) => {
      frame = 0
      if (!renderer || disposed || !allowed()) { stop(); return }
      // High refresh rate displays do not need to run this photo deformation at
      // 120 / 144 fps. Idle frames stop entirely after the gaze settles.
      if (previousTime && time - previousTime < FRAME_INTERVAL - 1) {
        frame = requestAnimationFrame(draw)
        return
      }
      const rect = canvas.getBoundingClientRect()
      const scale = Math.min(rect.width / PHOTO.width, rect.height / PHOTO.height)
      const left = rect.left + (rect.width - PHOTO.width * scale) / 2
      const top = rect.bottom - PHOTO.height * scale
      const following = Boolean(pointer)
      const dt = previousTime ? Math.min(50, time - previousTime) : 16
      previousTime = time
      const eyeEase = 1 - Math.exp(-dt / 65), faceEase = 1 - Math.exp(-dt / 110)
      const target = {
        x: following ? Math.tanh((pointer.x - left - 565 * scale) / 260) : 0,
        y: following ? Math.tanh((pointer.y - top - 482 * scale) / 240) : 0,
      }
      state.face.x += (target.x - state.face.x) * faceEase
      state.face.y += (target.y - state.face.y) * faceEase
      let moving = Math.abs(target.x - state.face.x) + Math.abs(target.y - state.face.y) > .001
      EYES.forEach((eye, index) => {
        const x = following ? Math.tanh((pointer.x - left - eye.x * scale) / 230) * 12 : 0
        const y = following ? Math.tanh((pointer.y - top - eye.y * scale) / 220) * 5.5 : 0
        state.eyes[index].x += (x - state.eyes[index].x) * eyeEase
        state.eyes[index].y += (y - state.eyes[index].y) * eyeEase
        if (Math.abs(x - state.eyes[index].x) + Math.abs(y - state.eyes[index].y) > .02) moving = true
      })
      const progress = (time - blinkStart) / 165
      if (following && progress >= 0 && progress < 1) {
        const phase = progress < .4 ? progress / .4 : (1 - progress) / .6
        state.blink = phase * phase * (3 - 2 * phase)
        moving = true
      } else { state.blink = 0; armBlink() }
      renderer.draw(state)
      display(following || moving, following)
      canvas.dataset.gazeX = state.face.x.toFixed(3)
      canvas.dataset.gazeY = state.face.y.toFixed(3)
      canvas.dataset.blink = state.blink.toFixed(3)
      if (moving) frame = requestAnimationFrame(draw)
      else previousTime = 0
    }
    function schedule() {
      if (!frame && renderer && !disposed && allowed()) frame = requestAnimationFrame(draw)
    }
    const move = (event) => {
      if (event.pointerType === 'touch') return
      pointer = { x: event.clientX, y: event.clientY }
      schedule()
      armBlink()
    }
    const resetPointer = () => {
      pointer = null
      clearTimeout(blinkTimer)
      blinkTimer = 0
      blinkStart = -Infinity
      schedule()
    }
    // Scroll only requests one coalesced frame while the portrait is active.
    // It never resizes the GPU buffer or reads layout inside the event handler.
    const positionChanged = () => { if (pointer) schedule() }
    const setListening = (active) => {
      if (active === listening) return
      listening = active
      const method = active ? 'addEventListener' : 'removeEventListener'
      window[method]('pointermove', move, { passive: true })
      window[method]('scroll', positionChanged, { passive: true })
      window[method]('resize', positionChanged, { passive: true })
      window[method]('blur', resetPointer)
      document.documentElement[method]('pointerleave', resetPointer)
    }
    const initialize = async () => {
      if (renderer || failed || initializing || !allowed() || !image?.complete || !image.naturalWidth) return
      initializing = true
      try {
        const { createPortraitRenderer } = await import('./portrait-renderer.js')
        if (disposed || !allowed()) return
        renderer = createPortraitRenderer(canvas, image)
        failed = !renderer
        canvas.dataset.ready = renderer ? 'true' : 'false'
        if (renderer) { renderer.resize(); schedule() }
        else { setListening(false); stop() }
      } catch {
        if (!disposed) { failed = true; setListening(false); stop() }
      } finally { initializing = false }
    }
    const updateActivity = () => {
      const active = allowed() && !failed
      setListening(active)
      if (!active) { pointer = null; stop(); return }
      if (!image && !failed) {
        // The static <img> remains the fallback. Do not eagerly fetch or create
        // a GPU context for a below-the-fold portrait on the opening screen.
        image = new Image()
        image.decoding = 'async'
        image.onload = () => { if (!disposed) initialize() }
        image.onerror = () => { failed = true; setListening(false); stop() }
        image.src = src
      }
      initialize()
      renderer?.resize()
      schedule()
    }
    const lost = (event) => {
      event.preventDefault()
      stop()
      renderer?.dispose()
      renderer = null
      canvas.dataset.ready = 'false'
    }
    const restored = () => {
      failed = false
      if (!disposed) updateActivity()
    }
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0
      updateActivity()
    }, { threshold: [0, .01] })
    const resize = new ResizeObserver(([entry]) => {
      if (renderer && allowed()) {
        renderer.resize(entry.contentRect.width, entry.contentRect.height)
        schedule()
      }
    })
    intersection.observe(canvas)
    resize.observe(canvas)
    document.addEventListener('visibilitychange', updateActivity)
    pointerQuery.addEventListener('change', updateActivity)
    motionQuery.addEventListener('change', updateActivity)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)

    return () => {
      disposed = true
      stop()
      setListening(false)
      intersection.disconnect()
      resize.disconnect()
      renderer?.dispose()
      if (image) { image.onload = null; image.onerror = null }
      // Release the backing store as well as shaders, texture and vertex buffer.
      canvas.width = canvas.height = 1
      document.removeEventListener('visibilitychange', updateActivity)
      pointerQuery.removeEventListener('change', updateActivity)
      motionQuery.removeEventListener('change', updateActivity)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [src])

  return <canvas ref={canvasRef} className="portrait-gaze-overlay" width="1" height="1" aria-hidden="true" data-following="false" data-ready="false" />
}
