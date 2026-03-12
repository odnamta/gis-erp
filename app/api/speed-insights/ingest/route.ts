import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Vercel Speed Insights sends an array of events
    const events = Array.isArray(body) ? body : [body]

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const rows = events
      .filter((e: any) => e.type === 'vitals' && e.payload) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((e: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        event_name: e.payload.event_name,
        href: e.payload.href,
        route: e.payload.route || extractRoute(e.payload.href),
        value: e.payload.value,
        speed: e.payload.speed,
        event_id: e.payload.id,
        dsn: e.payload.dsn,
      }))

    if (rows.length > 0) {
      await supabase.from('speed_insights_events' as any).insert(rows) // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

function extractRoute(href: string | undefined): string | null {
  if (!href) return null
  try {
    const url = new URL(href)
    return url.pathname
  } catch {
    return null
  }
}
