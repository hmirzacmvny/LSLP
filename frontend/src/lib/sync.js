import { db } from './db'
import { createVisit } from './api'

export async function getPendingCount() {
  return db.pendingVisits.where('syncStatus').equals('pending').count()
}

export async function syncPendingVisits() {
  const pending = await db.pendingVisits
    .where('syncStatus')
    .equals('pending')
    .toArray()

  if (pending.length === 0) return

  let failedCount = 0
  for (const record of pending) {
    try {
      const formData = new FormData()
      Object.entries(record.formData).forEach(([key, val]) => {
        if (val) formData.append(key, val)
      })
      record.photos.forEach((photo) => formData.append('photos', photo))

      await createVisit(formData)
      await db.pendingVisits.delete(record.id)
    } catch (err) {
      console.error(`[sync] Failed to sync visit id=${record.id}:`, err)
      await db.pendingVisits.update(record.id, { syncStatus: 'failed' })
      failedCount++
    }
  }

  if (failedCount === 0) {
    window.dispatchEvent(new CustomEvent('lslp:sync-success'))
  } else {
    window.dispatchEvent(
      new CustomEvent('lslp:sync-failed', { detail: { count: failedCount } })
    )
  }
}

export function initSync() {
  window.addEventListener('online', () => {
    syncPendingVisits()
  })
}
