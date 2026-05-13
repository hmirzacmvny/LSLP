import Dexie from 'dexie'

export const db = new Dexie('lslpOfflineDB')

db.version(1).stores({
  // ++id = auto-increment PK; syncStatus indexed for efficient filtering
  pendingVisits: '++id, syncStatus, savedAt',
})
