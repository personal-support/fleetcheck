import { createClient } from '@/lib/supabase/client'
import { getPendingChecklists, deletePendingChecklist } from '@/lib/db'

export async function syncPendingChecklists(): Promise<{ synced: number; failed: number }> {
  const supabase = createClient()
  const pending = await getPendingChecklists()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const entry of pending) {
    try {
      const photoUrls: Record<string, string> = {}

      // Upload photos
      for (const [key, blob] of Object.entries(entry.photoBlobs ?? {})) {
        const filename = `${entry.localId}/${key}-${Date.now()}.jpg`
        const { data, error } = await supabase.storage
          .from('checklist-photos')
          .upload(filename, blob as Blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('checklist-photos').getPublicUrl(data.path)
        photoUrls[key] = urlData.publicUrl
      }

      // Replace photo keys with URLs in departure_items
      const checklist = entry.checklist as Record<string, unknown>
      const departureItems = (checklist.departure_items ?? []) as Array<Record<string, unknown>>
      const itemsWithUrls = departureItems.map((item) => ({
        ...item,
        photo_url: item.photo_url && photoUrls[item.photo_url as string]
          ? photoUrls[item.photo_url as string]
          : item.photo_url,
      }))

      const { error } = await supabase.from('checklists').insert({
        ...checklist,
        departure_items: itemsWithUrls,
        synced_at: new Date().toISOString(),
      })

      if (error) throw error
      await deletePendingChecklist(entry.localId)
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
