import { useMemo } from 'react'
import { useCalendarData } from '../lib/useCalendarData.js'
import { expandEvent } from '../lib/recurrence.js'

// Kurzinfo auf der Kalender-Kachel: Anzahl heute + nächster Termin
export default function CalendarTile() {
  const { data, loaded } = useCalendarData()

  const info = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
    const exceptions = {}
    for (const x of data.exceptions) (exceptions[x.event_id] ??= new Set()).add(x.datum)

    let today = 0
    let next = null
    for (const ev of data.events) {
      for (const o of expandEvent(ev, todayStart, weekEnd, exceptions[ev.id])) {
        if (o.start < todayEnd) today++
        if (!ev.all_day && o.start >= now && (!next || o.start < next.start)) next = { start: o.start, ev }
      }
    }
    return { today, next }
  }, [data])

  if (!loaded) return <p className="tile-sub">Lädt …</p>
  const color = info.next && data.profiles.find((p) => p.id === info.next.ev.owner_id)?.farbe
  return (
    <>
      <p className="tile-sub">{info.today === 0 ? 'Heute nichts' : info.today === 1 ? '1 Termin heute' : `${info.today} Termine heute`}</p>
      {info.next && (
        <p className="tile-next">
          <i style={{ background: color }} />
          {info.next.start.toLocaleDateString('de-DE', { weekday: 'short' })}{' '}
          {info.next.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} {info.next.ev.title}
        </p>
      )}
    </>
  )
}
