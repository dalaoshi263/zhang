import React, { useEffect, useRef } from 'react'
import './portrait-sprite.css'

// Keep the opening screen lightweight: this module fetches the calibrated atlas
// only when the portrait is visible and the device can use pointer interaction.
export default function PortraitSprite({ frontUrl, configUrl = '/portrait-turn/calibration.json' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas.parentElement
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const abort = new AbortController()
    let visible = false, disposed = false, initializing = false, failed = false
    let controller = null, atlasReady = false

    const allowed = () => visible && pointerQuery.matches && !motionQuery.matches && !document.hidden
    const display = () => {
      const ready = atlasReady && canvas.dataset.ready === 'true' ? 'true' : 'false'
      if (parent.dataset.spriteReady !== ready) parent.dataset.spriteReady = ready
    }
    const initialize = async () => {
      if (disposed || controller || initializing || failed || !allowed()) return
      initializing = true
      try {
        const [response, module] = await Promise.all([
          fetch(configUrl, { signal: abort.signal, cache: 'no-cache' }),
          import('./portrait-sprite-controller.js'),
        ])
        if (!response.ok) throw new Error(`Portrait calibration: ${response.status}`)
        const config = await response.json()
        if (disposed || !allowed()) return
        const spriteLocation = new URL('sprite.webp', new URL(configUrl, window.location.href))
        spriteLocation.searchParams.set('v', config.assetVersion || String(config.version))
        const spriteUrl = spriteLocation.href
        controller = module.createSpriteController({
          canvas,
          config: { ...config, alignY: 'bottom', faceAnchor: config.faceAnchor || { x: .5, y: .43 } },
          spriteUrl,
          frontUrl,
          onFrame: display,
        })
        const loaded = await controller.ready
        if (disposed) return
        atlasReady = loaded
        if (!loaded) {
          failed = true
          controller.destroy()
          controller = null
        }
        display()
      } catch (error) {
        if (disposed || error.name === 'AbortError') return
        failed = true
        canvas.dataset.spriteError = 'initialization'
        display()
      } finally {
        initializing = false
      }
    }
    const updateActivity = () => {
      if (allowed()) initialize()
      else controller?.reset()
    }
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0
      updateActivity()
    }, { threshold: [0, .01] })
    parent.dataset.spriteReady = 'false'
    intersection.observe(canvas)
    document.addEventListener('visibilitychange', updateActivity)
    pointerQuery.addEventListener('change', updateActivity)
    motionQuery.addEventListener('change', updateActivity)

    return () => {
      disposed = true
      abort.abort()
      controller?.destroy()
      intersection.disconnect()
      canvas.width = canvas.height = 1
      delete parent.dataset.spriteReady
      document.removeEventListener('visibilitychange', updateActivity)
      pointerQuery.removeEventListener('change', updateActivity)
      motionQuery.removeEventListener('change', updateActivity)
    }
  }, [frontUrl, configUrl])

  return <canvas ref={canvasRef} className="portrait-sprite-overlay" width="1" height="1" aria-hidden="true" data-ready="false" data-direction="中心" />
}
