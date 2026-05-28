export type UserRole = 'driver' | 'admin'
export type VehicleType = 'leve' | 'pesado' | 'moto' | 'utilitario'
export type ChecklistStatus = 'draft' | 'submitted'

export interface Company {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}

export interface AppUser {
  id: string
  company_id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  created_at: string
}

export interface Vehicle {
  id: string
  company_id: string
  plate: string
  model: string
  year: number | null
  vehicle_type: VehicleType
  last_km: number
  last_check_at: string | null
  last_location_lat: number | null
  last_location_lng: number | null
  active: boolean
  created_at: string
}

export interface ChecklistTemplateItem {
  id: string
  label: string
  icon: string
  description: string
  type: 'ok_nok'
  order: number
  if_nok: {
    fields: Array<{
      id: string
      label: string
      type: 'select' | 'text' | 'photo'
      options?: string[]
      placeholder?: string
      required?: boolean
    }>
  }
}

export interface ChecklistTemplate {
  id: string
  company_id: string
  vehicle_type: VehicleType
  name: string
  items: ChecklistTemplateItem[]
  active: boolean
}

export interface ChecklistItemResult {
  id: string
  status: 'ok' | 'nok' | null
  nok_data?: Record<string, string>
  photo_url?: string
  label?: string
  icon?: string
}

export interface Checklist {
  id: string
  company_id: string
  vehicle_id: string
  user_id: string
  template_id: string | null
  km_reading: number | null
  km_photo_url: string | null
  location_lat: number | null
  location_lng: number | null
  items: ChecklistItemResult[]
  notes: string | null
  status: ChecklistStatus
  synced_at: string | null
  created_at: string
  // joined
  vehicle?: Vehicle
  user?: AppUser
}

// Offline queue entry
export interface OfflineChecklist {
  localId: string
  checklist: Omit<Checklist, 'id' | 'synced_at'>
  photoBlobs: Record<string, Blob>
  createdAt: number
}
