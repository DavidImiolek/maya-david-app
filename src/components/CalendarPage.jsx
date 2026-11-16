import { useMemo, useState } from 'react'
import { useCalendarData } from '../lib/useCalendarData.js'
import { dateKey } from '../lib/recurrence.js'
import MonthScroll from './MonthScroll.jsx'
import DayView from './DayView.jsx'
import EventForm from './EventForm.jsx'
import EventDetail from './EventDetail.jsx'
import { GEMEINSAM_FARBE } from '../lib/colors.js'
import KalenderAbo from './KalenderAbo.jsx'
import Jubel, { JUBEL_TEXTE, useJubelBild } from './Jubel.jsx'

export default function CalendarPage({ session }) {
  const userId = session.user.id
  const { data, loadError, reload } = useCalendarData()
  const [sheet, setSheet] = useState(null) // { type: 'form', event?, defaults? } | { type: 'detail', eventId, datum } | { type: 'abo' }
  const [jubel, setJubel] = useState(null)
  const [view, setView] = useState('month') // 'month' | 'day'
  const [selectedDay, setSelectedDay] = useState(dateKey(new Date()))

  const profilesById = useMemo(
    () => Object.fromEntries(data.profiles.map((p) => [p.id, p])),
    [data.profiles]
  )
  const me = profilesById[userId]
  const jubelBild = useJubelBild(me && JUBEL_TEXTE[me.name]?.bild)
  const detailEvent = sheet?.type === 'detail' ? data.events.find((e) => e.id === sheet.eventId) : null

  function openDay(dk) {
    setSelectedDay(dk)
    setView('day')
  }

  function goBackToMonth() {
    setView('month')
  }

  function scrollToToday() {
    if (view === 'day') {
      setSelectedDay(dateKey(new Date()))
    } else {
      // Im MonthScroll: Scroll zum heutigen Tag auslösen durch kurzen Re-Mount
      setView('_reset')
      requestAnimationFrame(() => setView('month'))
    }
  }

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

      {view === 'month' && (
        <MonthScroll
          data={data}
          profilesById={profilesById}
          onDayClick={openDay}
        />
      )}

      {view === 'day' && (
        <DayView
          datum={selectedDay}
          data={data}
          profilesById={profilesById}
          onBack={goBackToMonth}
          onDayChange={setSelectedDay}
          onEventClick={(eventId, datum) => setSheet({ type: 'detail', eventId, datum })}
          onTimeClick={(date, time) => setSheet({ type: 'form', defaults: { date, time, allDay: false } })}
        />
      )}

      {/* Heute-Button */}
      <button className="heute-btn" onClick={scrollToToday}>Heute</button>

      {/* FAB */}
      <button
        className="fab"
        aria-label="Neuer Termin"
        onClick={() =>
          setSheet({
            type: 'form',
            defaults: view === 'day' ? { date: selectedDay } : {},
          })
        }
      >+</button>

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
