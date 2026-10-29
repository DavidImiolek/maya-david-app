import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import CalendarView from './CalendarView.jsx'
import EventForm from './EventForm.jsx'
import EventDetail from './EventDetail.jsx'

export default function Home({ session }) {
  const userId = session.user.id
  const [data, setData] = useState({ profiles: [], events: [], exceptions: [], comments: [] })
  const [loadError, setLoadError] = useState('')
  const [sheet, setSheet] = useState(null) // { type: 'form', event?, defaults? } | { type: 'detail', eventId, datum }
  const reloadTimer = useRef(null)

  const load = useCallback(async () => {
    const [p, e, x, c] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('events').select('*'),
      supabase.from('event_exceptions').select('*'),
      supabase.from('comments').select('*').order('created_at'),
    ])
    const err = p.error || e.error || x.error || c.error
    if (err) {
      setLoadError('Daten konnten nicht geladen werden: ' + err.message)
      return
    }
    setLoadError('')
    setData({ profiles: p.data, events: e.data, exceptions: x.data, comments: c.data })
  }, [])

  // Mehrere Änderungen kurz hintereinander nur einmal neu laden
  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(load, 250)
  }, [load])

  useEffect(() => {
    load()
    // Live-Updates: bei jeder Änderung in der Datenbank neu laden
    const channel = supabase
      .channel('alles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_exceptions' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, scheduleReload)
      .subscribe()
    // iPhone pausiert Apps im Hintergrund – beim Zurückkehren frisch laden
    const onVisible = () => document.visibilityState === 'visible' && scheduleReload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load, scheduleReload])

  const profilesById = useMemo(
    () => Object.fromEntries(data.profiles.map((p) => [p.id, p])),
    [data.profiles]
  )
  const me = profilesById[userId]

  const detailEvent = sheet?.type === 'detail' ? data.events.find((e) => e.id === sheet.eventId) : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="legend">
          {data.profiles.map((p) => (
            <span key={p.id}><i style={{ background: p.farbe }} />{p.name}</span>
          ))}
          <span className="legend-maybe"><i />vielleicht</span>
        </div>
        <button className="link" onClick={() => supabase.auth.signOut()}>Abmelden</button>
      </header>

      {loadError && <p className="error banner">{loadError}</p>}

      <CalendarView
        data={data}
        profilesById={profilesById}
        onEventClick={(eventId, datum) => setSheet({ type: 'detail', eventId, datum })}
        onDateClick={(defaults) => setSheet({ type: 'form', defaults })}
      />

      <button className="fab" aria-label="Neuer Termin" onClick={() => setSheet({ type: 'form', defaults: {} })}>+</button>

      {sheet?.type === 'form' && (
        <EventForm
          me={me}
          profiles={data.profiles}
          event={sheet.event}
          defaults={sheet.defaults}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); load() }}
        />
      )}

      {sheet?.type === 'detail' && detailEvent && (
        <EventDetail
          event={detailEvent}
          datum={sheet.datum}
          userId={userId}
          profilesById={profilesById}
          comments={data.comments.filter((c) => c.event_id === detailEvent.id && c.datum === sheet.datum)}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ type: 'form', event: detailEvent })}
          onChanged={load}
          onDeleted={() => { setSheet(null); load() }}
        />
      )}
    </div>
  )
}
