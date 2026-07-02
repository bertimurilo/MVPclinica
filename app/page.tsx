import LandingPage from '@/components/landing/LandingPage'
import { getWaitlistRemaining } from '@/app/actions/waitlist'

// Revalida el conteo de la waitlist cada 60s sin golpear la BD en cada request.
export const revalidate = 60

export default async function Page() {
  const remainingSlots = await getWaitlistRemaining()
  return <LandingPage remainingSlots={remainingSlots} />
}
