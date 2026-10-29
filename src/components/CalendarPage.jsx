import { useMemo, useState } from 'react'
import { useCalendarData } from '../lib/useCalendarData.js'
import CalendarView from './CalendarView.jsx'
import EventForm from './EventForm.jsx'
import EventDetail from './EventDetail.jsx'

export default function CalendarPage({ session }) {
  const userId = session.user.id
  const { data, loadError, reload } = useCalendarData()
  const [sheet, setSheet] = useState(null) // { type: 'form', event?, defaults? } | { type: 'detail', eventId, datum }

  const profilesById = useMemo(
    () => Object.fromEntries(data.profiles.map((p) => [p.id, p])),
    [data.profiles]
  )
  const me = profilesById[userId]
  const detailEvent = sheet?.type === 'detail' ? data.events.find((e) => e.id === sheet.eventId) : null

  return (
    <div className="app">
      <header className="topbar">
        <a className="link back" href="#/">‹ Start</a>
        <div className="legend">
          {data.profiles.map((p) => (
            <span key={p.id}><i style={{ background: p.farbe }} />{p.name}</span>
          ))}
          <span className="legend-maybe"><i />vielleicht</span>
        </div>
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
          onSaved={() => { setSheet(null); reload() }}
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
          onChanged={reload}
          onDeleted={() => { setSheet(null); reload() }}
        />
      )}
    </div>
  )
}
