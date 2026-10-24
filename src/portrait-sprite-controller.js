const modulo = (angle) => ((angle % 360) + 360) % 360
const angularDistance = (a, b) => Math.abs(((modulo(a) - modulo(b) + 540) % 360) - 180)

// Every destination comes from visually calibrated pose anchors, never from
// angle / 360 * video length. Sparse legacy sheets still use nearest poses.
export function selectAngleKey(angle, angleKeys, previousKey = null, hysteresis = 3) {
  if (!angleKeys.length) return null
  let nearest = angleKeys[0]
  for (const key of angleKeys) {
    if (angularDistance(angle, key.angle) < angularDistance(angle, nearest.angle)) nearest = key
  }
  if (previousKey && angleKeys.includes(previousKey)
    && angularDistance(angle, previousKey.angle) <= angularDistance(angle, nearest.angle) + hysteresis) {
    return previousKey
  }
  return nearest
}

// Dense sheets contain consecutive REAL source frames. Only seek the measured
// source interval between nearby audited anchors, never across a missing pose.
export function resolveCalibratedPose(angle, angleKeys) {
  const keys = [...angleKeys].sort((a, b) => a.angle - b.angle)
  const nearest = selectAngleKey(angle, keys)
  if (!nearest) return null
  const bearing = modulo(angle)
  let lower = keys[keys.length - 1], upper = keys[0]
  for (let index = 0; index < keys.length - 1; index++) {
    if (bearing >= keys[index].angle && bearing <= keys[index + 1].angle) {
      lower = keys[index]; upper = keys[index + 1]; break
    }
  }
  const span = modulo(upper.angle - lower.angle)
  if (!span || span > 45) return { ...nearest, sourcePosition: nearest.sourceFrame ?? nearest.frame }
  const progress = Math.min(1, modulo(bearing - lower.angle) / span)
  return { ...nearest, sourcePosition: (lower.sourceFrame ?? lower.frame)
    + ((upper.sourceFrame ?? upper.frame) - (lower.sourceFrame ?? lower.frame)) * progress }
}

export function advanceSourceFrame(current, target, seconds) {
  const delta = Math.max(0, Math.min(seconds, 1 / 30))
  const distance = target - current
  if (Math.abs(distance) < .12) return target
  const eased = distance * (1 - Math.exp(-delta / .115))
  const step = Math.min(120 * delta, Math.max(-120 * delta, eased))
  return current + step
}

export function createSpriteController({ canvas, config, spriteUrl, frontUrl, onFrame = () => {} }) {
  if (!canvas) throw new Error('A canvas is required.')
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Canvas 2D is unavailable.')
  const width = Number(config.frameWidth), height = Number(config.frameHeight)
  const columns = Number(config.columns), frameCount = Number(config.frameCount)
  if (![width, height, columns, frameCount].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Invalid sprite dimensions.')
  }
  const frontFrame = Math.max(0, Math.min(frameCount - 1, Number(config.frontFrame) || 0))
  const denseTimeline = frameCount > 32 && config.sourceFrames?.length === frameCount
    && config.sourceFrames.every((frame, index) => frame === index)
  const neutralFrames = denseTimeline && Number.isInteger(config.returnFrontFrame)
    ? [frontFrame, config.returnFrontFrame] : [frontFrame]
  const ANGLE_KEYS = (config.angleKeys || []).filter((key) => Number.isFinite(key.angle)
    && Number.isInteger(key.frame) && key.frame >= 0 && key.frame < frameCount)
    .map((key) => ({ ...key, angle: modulo(key.angle) }))
  const faceAnchor = config.faceAnchor || { x: 0.5, y: 0.3 }
  const alignY = config.alignY === 'bottom' ? 1 : config.alignY === 'top' ? 0 : 0.5
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
  const pointerQuery = matchMedia('(hover: hover) and (pointer: fine)')
  const sprite = new Image(), front = new Image()
  sprite.decoding = front.decoding = 'async'
  let destroyed = false, visible = true, pageVisible = !document.hidden, listening = false
  let spriteLoaded = false, frontLoaded = false, spriteRequested = false
  let raf = 0, pointer = null, explicitAngle = null, previousKey = null
  let currentFrame = -1, currentSource = '', rect = null, dirtyGeometry = true
  let position = frontFrame, lastTimestamp = 0, centered = true
  let lastDirection = '中心', lastBearing = null, resolveReady
  const ready = new Promise((resolve) => { resolveReady = resolve })
  const invalidate = () => { dirtyGeometry = true; schedule() }
  const scroll = () => { dirtyGeometry = true; if (pointer) schedule() }
  const canFollow = () => visible && pageVisible && pointerQuery.matches && !motionQuery.matches
  const measure = () => {
    if (!dirtyGeometry && rect) return rect
    const bounds = canvas.getBoundingClientRect()
    // Allocate using the untransformed CSS box, so transforms never change
    // the portrait's proportions or resize the drawing buffer while moving.
    const cssWidth = canvas.clientWidth || bounds.width
    const cssHeight = canvas.clientHeight || bounds.height
    const scale = Math.min(cssWidth / width, cssHeight / height)
    rect = {
      width: cssWidth, height: cssHeight, scale,
      x: bounds.left + (cssWidth - width * scale) / 2,
      y: bounds.top + (cssHeight - height * scale) * alignY,
    }
    dirtyGeometry = false
    return rect
  }
  const updateData = (frame, direction, bearing) => {
    const value = bearing === null ? '' : modulo(bearing).toFixed(1)
    if (canvas.dataset.frame !== String(frame)) canvas.dataset.frame = String(frame)
    if (canvas.dataset.direction !== direction) canvas.dataset.direction = direction
    if (canvas.dataset.bearing !== value) canvas.dataset.bearing = value
    const following = pointer && canFollow() ? 'true' : 'false'
    if (canvas.dataset.following !== following) canvas.dataset.following = following
  }
  function paint(frame, direction = '中心', bearing = null, force = false) {
    if (destroyed || !visible || !pageVisible) return
    const bounds = measure()
    if (!bounds.width || !bounds.height) return
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.5,
      Math.sqrt(1200000 / (bounds.width * bounds.height)))
    const renderWidth = Math.max(1, Math.round(bounds.width * pixelRatio))
    const renderHeight = Math.max(1, Math.round(bounds.height * pixelRatio))
    const resized = canvas.width !== renderWidth || canvas.height !== renderHeight
    if (resized) { canvas.width = renderWidth; canvas.height = renderHeight }
    const source = frame === frontFrame && frontLoaded ? 'front' : spriteLoaded ? 'sprite' : frontLoaded ? 'front' : ''
    updateData(frame, direction, bearing)
    if (!source || (!force && !resized && currentFrame === frame && currentSource === source)) return
    context.clearRect(0, 0, renderWidth, renderHeight)
    const scale = Math.min(renderWidth / width, renderHeight / height)
    const drawWidth = width * scale, drawHeight = height * scale
    const x = (renderWidth - drawWidth) / 2, y = (renderHeight - drawHeight) * alignY
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if (source === 'front') context.drawImage(front, 0, 0, front.naturalWidth, front.naturalHeight, x, y, drawWidth, drawHeight)
    else context.drawImage(sprite, (frame % columns) * width, Math.floor(frame / columns) * height,
      width, height, x, y, drawWidth, drawHeight)
    currentFrame = frame; currentSource = source
    lastDirection = direction; lastBearing = bearing
    canvas.dataset.ready = 'true'
    onFrame({ frame, direction, bearing, source })
  }
  function draw(timestamp) {
    raf = 0
    if (destroyed || !visible || !pageVisible) return
    const bounds = measure()
    let angle = explicitAngle
    if (pointer && canFollow()) {
      const x = pointer.x - bounds.x - width * bounds.scale * faceAnchor.x
      const y = pointer.y - bounds.y - height * bounds.scale * faceAnchor.y
      const deadZone = Math.max(20, Math.min(Number(config.deadZone) || 54, width * bounds.scale * .16))
      // Separate enter/exit radii keep tiny movements around the nose still.
      const radius = deadZone * (centered ? 1.3 : 1)
      centered = Math.hypot(x, y) < radius
      angle = centered ? null : modulo(Math.atan2(y, x) * 180 / Math.PI)
    }
    if (!spriteLoaded || !ANGLE_KEYS.length || !canFollow()) {
      previousKey = null
      position = frontFrame; lastTimestamp = 0
      canvas.dataset.moving = 'false'
      paint(frontFrame, '中心', null)
      return
    }
    let target = frontFrame, direction = '中心'
    if (angle !== null) {
      const key = selectAngleKey(angle, ANGLE_KEYS, previousKey, 4)
      previousKey = key
      direction = key.label || `${Math.round(key.angle)}°`
      target = denseTimeline ? resolveCalibratedPose(angle, ANGLE_KEYS).sourcePosition : key.frame
    } else {
      previousKey = null
      target = neutralFrames.reduce((nearest, frame) => Math.abs(frame - position) < Math.abs(nearest - position) ? frame : nearest)
    }
    canvas.dataset.targetFrame = String(Math.round(target))
    if (denseTimeline) {
      const delta = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 1 / 60
      position = advanceSourceFrame(position, target, delta)
      lastTimestamp = timestamp
      const moving = Math.abs(position - target) >= .12
      canvas.dataset.moving = moving ? 'true' : 'false'
      paint(Math.max(0, Math.min(frameCount - 1, Math.round(position))), direction, angle)
      if (moving) schedule()
      else lastTimestamp = 0
    } else {
      position = target
      canvas.dataset.moving = 'false'
      paint(target, direction, angle)
    }
  }
  function schedule() {
    if (!destroyed && !raf && visible && pageVisible) raf = requestAnimationFrame(draw)
  }
  function reset() {
    pointer = null; explicitAngle = null; previousKey = null; centered = true
    schedule()
  }
  const move = (event) => {
    if (event.buttons && canvas.closest('.is-dragging')) {
      // Dragging only translates the card. Hold its current real pose rather
      // than running a second head movement against the captured pointer.
      cancelAnimationFrame(raf); raf = 0; lastTimestamp = 0
      canvas.dataset.moving = 'false'
      return
    }
    pointer = { x: event.clientX, y: event.clientY }; explicitAngle = null
    // The portfolio allows dragging this portrait; its face origin can move
    // without a resize or scroll. Measure once in the scheduled animation frame.
    dirtyGeometry = true; schedule()
  }
  const leave = (event) => { if (!event.relatedTarget) reset() }
  function syncListeners() {
    const follow = canFollow()
    if (follow === listening) return
    listening = follow
    if (follow) {
      window.addEventListener('pointermove', move, { passive: true })
      window.addEventListener('pointerout', leave, { passive: true })
    } else {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerout', leave)
      reset()
    }
  }
  function requestSprite() {
    if (spriteRequested || destroyed) return
    spriteRequested = true
    sprite.src = spriteUrl
  }
  const visibility = () => {
    pageVisible = !document.hidden
    if (!pageVisible) { cancelAnimationFrame(raf); raf = 0; pointer = null; explicitAngle = null; lastTimestamp = 0 }
    syncListeners(); invalidate()
  }
  const preference = () => { syncListeners(); reset() }
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(invalidate) : null
  const intersectionObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) { requestSprite(); invalidate() }
    else { cancelAnimationFrame(raf); raf = 0; pointer = null; explicitAngle = null; lastTimestamp = 0 }
    syncListeners()
  }, { threshold: 0.01 }) : null
  front.onload = () => { frontLoaded = true; schedule() }
  front.onerror = () => { canvas.dataset.frontError = 'true' }
  sprite.onload = () => {
    if (destroyed) return
    if (sprite.naturalWidth !== columns * width || sprite.naturalHeight !== Math.ceil(frameCount / columns) * height) {
      canvas.dataset.spriteError = 'dimensions'; resolveReady(false); return
    }
    spriteLoaded = true
    canvas.dataset.spriteLoaded = 'true'
    resolveReady(true); schedule()
  }
  sprite.onerror = () => { canvas.dataset.spriteError = 'load'; resolveReady(false) }
  canvas.dataset.frame = String(frontFrame)
  canvas.dataset.direction = '中心'
  canvas.dataset.bearing = ''
  canvas.dataset.ready = 'false'
  front.src = frontUrl
  resizeObserver?.observe(canvas)
  if (intersectionObserver) intersectionObserver.observe(canvas)
  else requestSprite()
  window.addEventListener('resize', invalidate, { passive: true })
  window.addEventListener('scroll', scroll, { passive: true })
  window.addEventListener('blur', reset)
  document.addEventListener('visibilitychange', visibility)
  motionQuery.addEventListener('change', preference)
  pointerQuery.addEventListener('change', preference)
  syncListeners(); schedule()
  return {
    ready,
    reset,
    setDirection(angle) {
      pointer = null; previousKey = null
      explicitAngle = angle === null ? null : modulo(Number(angle))
      centered = angle === null
      schedule()
    },
    setPointer(x, y) { pointer = { x, y }; explicitAngle = null; dirtyGeometry = true; schedule() },
    getState() { return { frame: currentFrame, direction: lastDirection, bearing: lastBearing, spriteLoaded, visible, moving: canvas.dataset.moving === 'true' } },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      intersectionObserver?.disconnect(); resizeObserver?.disconnect()
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerout', leave)
      window.removeEventListener('resize', invalidate); window.removeEventListener('scroll', scroll)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', visibility)
      motionQuery.removeEventListener('change', preference); pointerQuery.removeEventListener('change', preference)
      sprite.onload = sprite.onerror = front.onload = front.onerror = null
      resolveReady(false)
    },
  }
}
