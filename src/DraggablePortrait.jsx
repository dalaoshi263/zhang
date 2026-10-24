import React, { useId, useRef, useState } from 'react'
import { publicAsset } from './publicAsset.js'
import './portrait.css'

const MAX_X = 55
const MAX_Y = 40
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value))

export default function DraggablePortrait({ src = publicAsset('images/yiting-portrait.webp'), alt = '张依婷头像' }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const gesture = useRef(null)
  const instructionsId = useId()

  function reset() {
    gesture.current = null
    setDragging(false)
    setOffset({ x: 0, y: 0 })
  }

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function moveDrag(event) {
    const current = gesture.current
    if (!current || event.pointerId !== current.pointerId) return
    if (Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY) > 3) setHasDragged(true)
    setOffset({
      x: clamp(current.offsetX + event.clientX - current.startX, MAX_X),
      y: clamp(current.offsetY + event.clientY - current.startY, MAX_Y),
    })
  }

  function finishDrag(event) {
    if (!gesture.current || event.pointerId !== gesture.current.pointerId) return
    reset()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleKeyDown(event) {
    const step = event.shiftKey ? 15 : 8
    const directions = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (directions[event.key]) {
      event.preventDefault()
      const [x, y] = directions[event.key]
      setOffset((current) => ({
        x: clamp(current.x + x, MAX_X),
        y: clamp(current.y + y, MAX_Y),
      }))
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault()
      const pointerId = gesture.current?.pointerId
      reset()
      if (pointerId !== undefined && event.currentTarget.hasPointerCapture(pointerId)) {
        event.currentTarget.releasePointerCapture(pointerId)
      }
    }
  }

  return <div className="portrait-block portrait-draggable">
    <div className="portrait-drag-stage">
      <div
        className={`portrait-image portrait-interactive-image${dragging ? ' is-dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="拖动张依婷的头像"
        aria-describedby={instructionsId}
        draggable={false}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!gesture.current) reset() }}
        onDragStart={(event) => event.preventDefault()}
        style={{
          '--portrait-offset-x': `${offset.x}px`,
          '--portrait-offset-y': `${offset.y}px`,
        }}
      >
        <img src={src} alt={alt} width="600" height="600" loading="lazy" decoding="async" draggable={false} />
        <span className="portrait-corner corner-tl" />
        <span className="portrait-corner corner-br" />
        <span className="portrait-drag-hint" aria-hidden="true"><span>↔</span>{dragging ? '松手，轻轻归位' : hasDragged ? '已轻轻归位 · 再拖动看看' : '轻扫有光 · 拖动认识我'}</span>
        <span className="portrait-label mono">THE PERSON BEHIND THE CUT</span>
      </div>
    </div>
    <span className="portrait-keyboard-help" id={instructionsId}>按住并拖动头像，松开即可回到原位。也可使用方向键移动，按 Enter、空格或 Escape 复位。</span>
    <div className="portrait-caption"><span>张依婷</span><span className="mono">YITING ZHANG</span><span className="mini-status"><span className="status-dot" />苏州</span></div>
  </div>
}
