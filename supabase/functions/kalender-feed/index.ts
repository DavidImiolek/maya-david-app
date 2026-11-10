// Edge Function "kalender-feed": liefert einen privaten Kalender im iCalendar-Format (.ics),
// den der iPhone-Kalender abonnieren kann.
// Aufruf: .../functions/v1/kalender-feed?token=<kalender_token aus profiles>
//
// Enthalten: alle Termine mit "In iPhone-Kalender übernehmen" = an,
//            die dieser Person gehören ODER gemeinsam sind.
// "Verify JWT" muss AUS sein (der iPhone-Kalender kann sich nicht einloggen; der Token schützt).

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const TZ = 'Europe/Berlin'
const DAY = 24 * 60 * 60 * 1000

// Zeitzone Berlin (Sommer-/Winterzeit), damit Serien nicht um 1 Stunde springen
const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST',
  'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET',
  'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
]

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})
function parts(d: Date) {
  return Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>
}
const localDate = (d: Date) => { const p = parts(d); return `${p.year}${p.month}${p.day}` }
const localTime = (d: Date) => { const p = parts(d); return `${p.hour}${p.minute}${p.second}` }
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// iCalendar verlangt Zeilen von max. 75 Bytes – längere werden umgebrochen
function fold(line: string) {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch } else cur += ch
  }
  out.push(cur)
  return out.join('\r\n ')
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!token || token.length < 32) return new Response('Nicht gefunden', { status: 404 })

  const { data: me } = await supabase.from('profiles').select('id, name').eq('kalender_token', token).maybeSingle()
  if (!me) return new Response('Nicht gefunden', { status: 404 })

  const [{ data: profiles }, { data: events }] = await Promise.all([
    supabase.from('profiles').select('id, name'),
    supabase.from('events').select('*').eq('im_iphone_kalender', true).or(`owner_id.eq.${me.id},gemeinsam.eq.true`),
  ])
  const ids = (events ?? []).map((e) => e.id)
  const { data: exceptions } = ids.length
    ? await supabase.from('event_exceptions').select('*').in('event_id', ids)
    : { data: [] as { event_id: string; datum: string }[] }

  const nameOf = (id: string) => profiles?.find((p) => p.id === id)?.name ?? ''
  const other = profiles?.find((p) => p.id !== me.id)
  const now = utcStamp(new Date())

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maya & David//Kalender//DE', 'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH', 'X-WR-CALNAME:Maya & David', `X-WR-TIMEZONE:${TZ}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M', 'X-PUBLISHED-TTL:PT15M',
    ...VTIMEZONE,
  ]

  for (const ev of events ?? []) {
    const start = new Date(ev.start_at)
    const end = ev.end_at ? new Date(ev.end_at) : null
    const maybe = ev.status === 'vielleicht'
    const title = `${maybe ? '? ' : ''}${ev.title}${ev.gemeinsam && other ? ` · mit ${other.name}` : ''}`
    const desc = [
      maybe ? 'Status: vielleicht' : '',
      ev.created_by !== me.id ? `Eingetragen von ${nameOf(ev.created_by)}` : '',
      !ev.all_day && !end ? 'Open End' : '',
      ev.note ?? '',
    ].filter(Boolean).join('\n')

    lines.push('BEGIN:VEVENT', `UID:${ev.id}@maya-david-app`, `DTSTAMP:${now}`,
      `LAST-MODIFIED:${utcStamp(new Date(ev.updated_at ?? ev.created_at ?? Date.now()))}`)

    if (ev.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${localDate(start)}`)
      lines.push(`DTEND;VALUE=DATE:${localDate(end ?? new Date(start.getTime() + DAY))}`)
    } else {
      lines.push(`DTSTART;TZID=${TZ}:${localDate(start)}T${localTime(start)}`)
      // Open End: wie in der App bis Mitternacht
      lines.push(end
        ? `DTEND;TZID=${TZ}:${localDate(end)}T${localTime(end)}`
        : `DTEND;TZID=${TZ}:${localDate(new Date(start.getTime() + DAY))}T000000`)
    }

    if (ev.recurrence_rule) {
      // UNTIL muss je nach Termin als Datum bzw. als UTC-Zeitpunkt angegeben werden
      const rule = ev.recurrence_rule.replace(/UNTIL=(\d{8})/, (_: string, d: string) =>
        ev.all_day ? `UNTIL=${d}` : `UNTIL=${d}T235959Z`)
      lines.push(`RRULE:${rule}`)
      for (const x of (exceptions ?? []).filter((x) => x.event_id === ev.id)) {
        const d = x.datum.replaceAll('-', '')
        lines.push(ev.all_day ? `EXDATE;VALUE=DATE:${d}` : `EXDATE;TZID=${TZ}:${d}T${localTime(start)}`)
      }
    }

    lines.push(`SUMMARY:${esc(title)}`, `STATUS:${maybe ? 'TENTATIVE' : 'CONFIRMED'}`)
    if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`)
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')

  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="maya-david.ics"',
      'Cache-Control': 'no-cache',
    },
  })
})
