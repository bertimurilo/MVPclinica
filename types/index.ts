// ============================================================================
// CliniqAI — Tipos principales del proyecto
// ============================================================================

export interface Clinic {
  id: string
  name: string
  email: string
  phone?: string
  plan: 'trial' | 'basic' | 'pro'
  created_at: string
}

export interface Lead {
  id: string
  clinic_id: string
  name?: string
  phone: string
  channel: 'whatsapp' | 'instagram' | 'web'
  status: 'new' | 'contacted' | 'qualified' | 'appointed' | 'lost'
  score: 'cold' | 'warm' | 'hot'
  created_at: string
  last_contact_at?: string
}

export interface Message {
  id: string
  lead_id: string
  clinic_id: string
  direction: 'inbound' | 'outbound'
  content: string
  channel: 'whatsapp' | 'instagram'
  created_at: string
}

export interface AgentConfig {
  id: string
  clinic_id: string
  clinic_name: string
  treatments: Treatment[]
  tone: 'formal' | 'cercano' | 'profesional'
  rules: string[]
  welcome_message: string
  active: boolean
}

export interface Treatment {
  id: string
  name: string
  price: number
  duration_minutes: number
  description?: string
}

export interface Appointment {
  id: string
  lead_id: string
  clinic_id: string
  treatment_id?: string
  scheduled_at: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_at: string
  lead?: Lead
  treatment?: Treatment
}

export interface DashboardStats {
  leads_today: number
  leads_active: number
  appointments_this_week: number
  conversion_rate: number
}
