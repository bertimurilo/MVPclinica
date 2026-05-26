import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()
  const url = new URL('/login', request.url)
  return NextResponse.redirect(url)
}
