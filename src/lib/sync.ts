import { createClient } from '@/lib/supabase/client'
import { getPendingChecklists, deletePendingChecklist } from '@/lib/db'

export async function syncPendingChecklists(): Promise<{ synced: number; failed: number }> {
  const supabase = createClient()
  const pending = await getPendingChecklists()

  let synced = 0
  let failed = 0

  for (const entry of pending) {
    try {
      const photoUrls: Record<string, string> = {}

      // Upload photos first
      for (const [key, blob] of Object.entries(entry.photoBlobs)) {
        const filename = `${entry.localId}/${key}-${Date.now()}.jpg`
        const { data, error } = await supabase.storage
          .from('checklist-photos')
          .upload(filename, blob, { contentType: 'image/jpeg', upsert: true })

        if (error) throw error
        const { data: urlData } = supabase.storage
          .from('checklist-photos')
          .getPublicUrl(data.path)
        photoUrls[key] = urlData.publicUrl
      }

      // Replace blob keys with URLs in items
      const itemsWithUrls = entry.checklist.items.map((item) => ({
        ...item,
        photo_url: item.photo_url && photoUrls[item.photo_url]
          ? photoUrls[item.photo_url]
          : item.photo_url,
      }))

      // Insert checklist
      const { error } = await supabase.from('checklists').insert({
        ...entry.checklist,
        items: itemsWithUrls,
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
