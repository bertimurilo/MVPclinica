import { google } from 'googleapis'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) return null

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  )
}

function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID ?? 'mbertibusiness@gmail.com'
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusySlot {
  start: string
  end: string
}

export interface CreatedCalendarEvent {
  id: string
  htmlLink: string
}

// ---------------------------------------------------------------------------
// Free/busy query
// ---------------------------------------------------------------------------

export async function getGoogleCalendarBusyTimes(
  startISO: string,
  endISO: string
): Promise<BusySlot[]> {
  const auth = getOAuth2Client()
  if (!auth) return []

  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = getCalendarId()

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startISO,
      timeMax: endISO,
      items: [{ id: calendarId }],
    },
  })

  const busy = response.data.calendars?.[calendarId]?.busy ?? []
  return busy
    .filter((b): b is { start: string; end: string } => !!(b.start && b.end))
    .map(b => ({ start: b.start, end: b.end }))
}

// ---------------------------------------------------------------------------
// Create event
// ---------------------------------------------------------------------------

export async function createGoogleCalendarEvent(params: {
  summary: string
  description: string
  startISO: string
  endISO: string
}): Promise<CreatedCalendarEvent | null> {
  const auth = getOAuth2Client()
  if (!auth) return null

  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startISO, timeZone: 'Europe/Madrid' },
      end: { dateTime: params.endISO, timeZone: 'Europe/Madrid' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    },
  })

  const event = response.data
  if (!event.id) return null

  return {
    id: event.id,
    htmlLink: event.htmlLink ?? 'https://calendar.google.com',
  }
}
