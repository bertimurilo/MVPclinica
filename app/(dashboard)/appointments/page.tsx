import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarView } from '@/components/appointments/CalendarView'
import type { AppointmentStatus } from '@/lib/types'

type CalendarAppointment = {
  id: string
  appointment_date: string | null
  status: AppointmentStatus
  notes: string | null
  requires_human_confirmation: boolean | null
  lead: { name: string | null; phone: string } | null
  treatment: { name: string; price: number | null; duration_minutes: number | null } | null
}

type PageProps = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function AppointmentsPage({ searchParams }: PageProps) {
  const now = new Date()
  const rawMonth = typeof searchParams.month === 'string' ? searchParams.month : undefined
  const rawYear  = typeof searchParams.year  === 'string' ? searchParams.year  : undefined

  const month = rawMonth ? Math.max(1, Math.min(12, parseInt(rawMonth))) : now.getMonth() + 1
  const year  = rawYear  ? parseInt(rawYear)  : now.getFullYear()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  const clinicId = (userData as { clinic_id: string } | null)?.clinic_id
  if (!clinicId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-500">No hay clínica asignada a este usuario.</p>
      </div>
    )
  }

  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate   = new Date(year, month, 1).toISOString()

  const { data } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, notes, requires_human_confirmation, lead:leads(name, phone), treatment:treatments(name, price, duration_minutes)')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', startDate)
    .lt('appointment_date', endDate)
    .order('appointment_date')

  const appointments = (data ?? []) as unknown as CalendarAppointment[]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Calendario</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona las citas de tu clínica</p>
      </div>

      <CalendarView appointments={appointments} month={month} year={year} />
    </div>
  )
}
