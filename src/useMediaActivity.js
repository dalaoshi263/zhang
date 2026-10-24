import { useSyncExternalStore } from 'react'

// Hero and carousel share one document observer instead of watching every
// React mutation independently. Snapshots stay stable until playback policy changes.
const subscribers = new Set()
let snapshot = { pageVisible: !document.hidden, dialogOpen: Boolean(document.querySelector('dialog[open]')) }
let observer
const update = () => {
  const next = { pageVisible: !document.hidden, dialogOpen: Boolean(document.querySelector('dialog[open]')) }
  if (next.pageVisible === snapshot.pageVisible && next.dialogOpen === snapshot.dialogOpen) return
  snapshot = next
  subscribers.forEach((notify) => notify())
}
const includesDialog = (node) => node.nodeType === 1 && (node.tagName === 'DIALOG' || node.querySelector('dialog'))
const subscribe = (notify) => {
  subscribers.add(notify)
  if (subscribers.size === 1) {
    observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'attributes'
        ? record.target.tagName === 'DIALOG'
        : [...record.addedNodes, ...record.removedNodes].some(includesDialog))) update()
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['open'], childList: true, subtree: true })
    document.addEventListener('visibilitychange', update)
    update()
  }
  return () => {
    subscribers.delete(notify)
    if (!subscribers.size) {
      observer.disconnect()
      observer = null
      document.removeEventListener('visibilitychange', update)
    }
  }
}
const getSnapshot = () => snapshot

export default function useMediaActivity() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
