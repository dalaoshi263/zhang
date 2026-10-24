import React, { useEffect, useRef } from 'react'

export default function PointerAura() {
  const auraRef = useRef(null)
  const lightRef = useRef(null)

  useEffect(() => {
    const aura = auraRef.current
    const light = lightRef.current
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let position = null
    let listening = false
    let interactive = false
    let suppressed = false

    const hide = () => {
      cancelAnimationFrame(frame)
      frame = 0
      position = null
      aura.dataset.visible = 'false'
      light.dataset.visible = 'false'
    }
    const renderPointer = () => {
      frame = 0
      if (!position) return
      const { x, y, target } = position
      const card = target.closest('.strength-card')
      // Complete geometry reads before any style writes. Only the hovered card
      // needs a local highlight; no inherited variables change on <html>.
      const rect = card?.getBoundingClientRect()
      const nextInteractive = Boolean(target.closest('a,button,[role="button"],.portrait-interactive-image'))
      const nextSuppressed = Boolean(target.closest('.wc-viewport'))
      const transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`
      aura.style.transform = transform
      light.style.transform = transform
      if (aura.dataset.visible !== 'true') {
        aura.dataset.visible = 'true'
        light.dataset.visible = 'true'
      }
      if (interactive !== nextInteractive) {
        interactive = nextInteractive
        aura.dataset.interactive = String(interactive)
      }
      if (suppressed !== nextSuppressed) {
        suppressed = nextSuppressed
        aura.dataset.suppressed = String(suppressed)
      }
      if (rect) {
        card.style.setProperty('--card-x', `${x - rect.left}px`)
        card.style.setProperty('--card-y', `${y - rect.top}px`)
      }
    }
    const move = (event) => {
      if (event.pointerType === 'touch') { hide(); return }
      if (!(event.target instanceof Element)) return
      position = { x: event.clientX, y: event.clientY, target: event.target }
      if (!frame) frame = requestAnimationFrame(renderPointer)
    }
    const updatePreferences = () => {
      const enabled = finePointer.matches && !reducedMotion.matches && !document.hidden
      if (enabled === listening) return
      listening = enabled
      if (enabled) window.addEventListener('pointermove', move, { passive: true })
      else { window.removeEventListener('pointermove', move); hide() }
    }
    document.documentElement.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)
    document.addEventListener('visibilitychange', updatePreferences)
    finePointer.addEventListener('change', updatePreferences)
    reducedMotion.addEventListener('change', updatePreferences)
    updatePreferences()
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      document.removeEventListener('visibilitychange', updatePreferences)
      finePointer.removeEventListener('change', updatePreferences)
      reducedMotion.removeEventListener('change', updatePreferences)
      hide()
    }
  }, [])

  return <><div className="pointer-light" ref={lightRef} aria-hidden="true" data-visible="false" /><div className="pointer-aura" ref={auraRef} aria-hidden="true" data-visible="false"><span /></div></>
}
