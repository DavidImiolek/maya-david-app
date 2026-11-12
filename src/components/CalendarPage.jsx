import { useMemo, useState } from 'react'
import { useCalendarData } from '../lib/useCalendarData.js'
import CalendarView from './CalendarView.jsx'
import EventForm from './EventForm.jsx'
import EventDetail from './EventDetail.jsx'
import { GEMEINSAM_FARBE } from '../lib/colors.js'
import KalenderAbo from './KalenderAbo.jsx'
import Jubel, { JUBEL_TEXTE, useJubelBild } from './Jubel.jsx'

export default function CalendarPage({ session }) {
  const userId = session.user.id
  const { data, loadError, reload } = useCalendarData()
  const [sheet, setSheet] = useState(null)
  const [jubel, setJubel] = useState(null) // { type: 'form', event?, defaults? } | { type: 'detail', eventId, datum }

  const profilesById = useMemo(
    () => Object.fromEntries(data.profiles.map((p) => [p.id, p])),
    [data.profiles]
  )
  const me = profilesById[userId]
  const jubelBild = useJubelBild(me && JUBEL_TEXTE[me.name]?.bild)
  const detailEvent = sheet?.type === 'detail' ? data.events.find((e) => e.id === sheet.eventId) : null

  return (
    <div className="app">
      <header className="topbar">
        <a className="link back" href="#/">‹ Start</a>
        <div className="legend">
          {data.profiles.map((p) => (
            <span key={p.id}><i style={{ background: p.farbe }} />{p.name}</span>
          ))}
          <span><i style={{ background: GEMEINSAM_FARBE }} />Beide</span>
          <span className="legend-maybe"><i />vielleicht</span>
        </div>
        <button className="link abo-btn" aria-label="iPhone-Kalender einrichten" onClick={() => setSheet({ type: 'abo' })}>📲</button>
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
          onSaved={(info) => {
            setSheet(null)
            reload()
            // Neuer gemeinsamer Termin → Jubel-Animation (nur für Personen mit eigenem Text)
            if (info?.neu && info?.gemeinsam && me && JUBEL_TEXTE[me.name]) setJubel(JUBEL_TEXTE[me.name])
          }}
        />
      )}

      {jubel && <Jubel titel={jubel.titel} text={jubel.text} bildUrl={jubelBild} onClose={() => setJubel(null)} />}

      {sheet?.type === 'abo' && <KalenderAbo userId={userId} onClose={() => setSheet(null)} />}

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
