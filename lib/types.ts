// ============================================================================
// CLINIQ AI — Types
// SaaS de agente IA por WhatsApp para clinicas esteticas
// ============================================================================

// --- Clinic (tenant) ---
export interface Clinic {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city: string;
  phone_whatsapp?: string;
  z_api_instance_id?: string;
  z_api_token?: string;
  z_api_client_token?: string;
  z_api_connected: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  active: boolean;
  trial_ends_at?: string;
  notification_phone?: string;
  created_at: string;
}

// --- User ---
export interface User {
  id: string;
  clinic_id: string;
  email: string;
  name: string;
  role: 'admin' | 'receptionist' | 'viewer';
  active: boolean;
}

// --- Treatment ---
export interface Treatment {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  price?: number;
  duration_minutes?: number;
  category?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- Agent Config ---
export interface AgentConfig {
  id: string;
  clinic_id: string;
  agent_name?: string;
  tone: 'profesional' | 'cercano' | 'formal' | 'calido';
  welcome_message: string;
  fallback_message: string;
  out_of_hours_message: string;
  escalation_rules: EscalationRules;
  business_hours: BusinessHours;
  max_auto_messages: number;
  custom_instructions?: string;
}

export interface EscalationRules {
  unknown_question?: boolean;
  surgery_mention?: boolean;
  complaint?: boolean;
  [key: string]: boolean | undefined;
}

export type BusinessHours = Record<string, { open: string; close: string } | null>

// --- Conversation stage machine ---
export type ConversationStage = 'welcome' | 'discovery' | 'presentation' | 'pricing' | 'confirmed' | 'closed' | 'escalated'
export type ObjectionType = 'price' | 'thinking' | 'competitor' | 'fear' | 'time' | 'doubt'

// --- Lead ---
export type LeadStatus = 'nuevo' | 'contactado' | 'cita_agendada' | 'convertido' | 'inactivo' | 'perdido';
export type LeadQualification = 'frio' | 'tibio' | 'caliente';

export interface Lead {
  id: string;
  clinic_id: string;
  phone: string;
  name?: string;
  email?: string;
  status: LeadStatus;
  treatment_interest?: string;
  source: string;
  score: number;
  qualification: LeadQualification;
  notes?: string;
  last_message_at?: string;
  escalated: boolean;
  conversation_stage?: ConversationStage;
  objection_count?: number;
  created_at: string;
  updated_at: string;
  // Joined
  messages?: Message[];
  appointments?: Appointment[];
}

// --- Message ---
export type MessageDirection = 'inbound' | 'outbound';
export type MessageSender = 'client' | 'agent' | 'human';
export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'sticker';

export interface Message {
  id: string;
  lead_id: string;
  clinic_id: string;
  direction: MessageDirection;
  content: string;
  sender: MessageSender;
  message_type: MessageType;
  z_api_message_id?: string;
  response_time_seconds?: number;
  out_of_hours?: boolean;
  created_at: string;
}

// --- Appointment ---
export type AppointmentStatus = 'agendada' | 'confirmada' | 'completada' | 'cancelada' | 'no_show';

export interface Appointment {
  id: string;
  lead_id: string;
  clinic_id: string;
  treatment_id?: string;
  appointment_date?: string;
  status: AppointmentStatus;
  notes?: string;
  reported_to_stripe: boolean;
  proposed_by?: 'agent' | 'human' | 'client';
  requires_human_confirmation?: boolean;
  created_at: string;
  // Joined
  treatment?: Treatment;
  lead?: Lead;
}

// --- Usage Event ---
export interface UsageEvent {
  id: string;
  clinic_id: string;
  event_type: 'appointment_generated' | 'message_sent' | 'lead_created';
  appointment_id?: string;
  stripe_reported: boolean;
  created_at: string;
}

// --- Dashboard Stats ---
export interface DashboardStats {
  new_leads_today: number;
  leads_without_response: number;
  appointments_this_week: number;
  conversion_rate: number;
  total_leads: number;
  total_conversations: number;
}

// --- Z-API Webhook Payload ---
export interface ZAPIWebhookPayload {
  phone: string;
  message: {
    text?: string;
    type: string;
  };
  messageId: string;
  instanceId: string;
  timestamp: number;
}

// --- AI Agent Request/Response ---
export interface AgentRequest {
  lead_id: string;
  clinic_id: string;
  incoming_message: string;
}

export interface AgentResponse {
  response: string;
  should_escalate: boolean;
  detected_treatment?: string;
  detected_intent?: 'info' | 'pricing' | 'booking' | 'complaint' | 'other';
  lead_score_update?: number;
  qualification_update?: LeadQualification;
}

export interface AgentAnalysis {
  should_escalate: boolean;
  escalation_reason?: string;
  detected_treatment?: string;
  intent: 'info' | 'pricing' | 'booking' | 'complaint' | 'other';
  qualification: 'frio' | 'tibio' | 'caliente';
  score_delta: number;
  next_stage: ConversationStage;
  detected_objection?: ObjectionType | null;
  client_name?: string | null;
  proposed_appointment?: {
    treatment_name?: string;
    preferred_date_iso?: string;
    notes?: string;
  };
}

export interface AgentResult {
  responses: string[];
  analysis: AgentAnalysis;
  was_sent: boolean;
  reason_not_sent?: 'max_messages_reached' | 'already_escalated' | 'config_missing' | 'openai_error' | 'empty_response';
}

// --- Activity Timeline ---
export type TimelineEventType =
  | 'lead_created'
  | 'messages_day'
  | 'appointment_proposed'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'escalated'
  | 'escalation_reset'

export interface TimelineEvent {
  type: TimelineEventType;
  timestamp: string;
  label: string;
  detail?: string;
}
