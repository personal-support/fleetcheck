import Dexie, { type EntityTable } from 'dexie'
import type { OfflineChecklist } from '@/types'

class FleetCheckDB extends Dexie {
  pendingChecklists!: EntityTable<OfflineChecklist, 'localId'>

  constructor() {
    super('FleetCheckDB')
    this.version(1).stores({
      pendingChecklists: 'localId, createdAt',
    })
  }
}

export const db = new FleetCheckDB()

export async function savePendingChecklist(entry: OfflineChecklist) {
  await db.pendingChecklists.put(entry)
}

export async function getPendingChecklists(): Promise<OfflineChecklist[]> {
  return db.pendingChecklists.orderBy('createdAt').toArray()
}

export async function deletePendingChecklist(localId: string) {
  await db.pendingChecklists.delete(localId)
}

export async function countPending(): Promise<number> {
  return db.pendingChecklists.count()
}
