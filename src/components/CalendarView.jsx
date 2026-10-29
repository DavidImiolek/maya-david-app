import { useCallback, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import deLocale from '@fullcalendar/core/locales/de'
import { expandEvent, dateKey } from '../lib/recurrence.js'

export default function CalendarView({ data, profilesById, onEventClick, onDateClick }) {
  // Ausnahmen je Termin: { eventId: Set("2026-11-10", ...) }
  const exceptionsByEvent = useMemo(() => {
    const map = {}
    for (const x of data.exceptions) (map[x.event_id] ??= new Set()).add(x.datum)
    return map
  }, [data.exceptions])

  // Anzahl Kommentare je Termin und Tag
  const commentCounts = useMemo(() => {
    const map = {}
    for (const c of data.comments) {
      const k = `${c.event_id}|${c.datum}`
      map[k] = (map[k] || 0) + 1
    }
    return map
  }, [data.comments])

  // FullCalendar fragt nach Terminen für den sichtbaren Zeitraum – wir berechnen die Vorkommen
  const fetchEvents = useCallback(
    (info, success) => {
      const out = []
      for (const ev of data.events) {
        const color = profilesById[ev.owner_id]?.farbe || '#888888'
        const classes = []
        if (ev.status === 'vielleicht') classes.push('ev-maybe')
        if (!ev.end_at && !ev.all_day) classes.push('ev-openend')
        for (const o of expandEvent(ev, info.start, info.end, exceptionsByEvent[ev.id])) {
          out.push({
            id: `${ev.id}|${o.datum}`,
            title: ev.title,
            start: o.start,
            end: o.end,
            allDay: ev.all_day,
            backgroundColor: color,
            borderColor: color,
            classNames: classes,
            extendedProps: {
              eventId: ev.id,
              datum: o.datum,
              color,
              openEnd: !ev.end_at && !ev.all_day,
              recurring: !!ev.recurrence_rule,
              comments: commentCounts[`${ev.id}|${o.datum}`] || 0,
            },
          })
        }
      }
      success(out)
    },
    [data.events, profilesById, exceptionsByEvent, commentCounts]
  )

  return (
    <div className="calendar">
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        locale={deLocale}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
        titleFormat={{ month: 'short', day: 'numeric' }}
        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
        views={{ dayGridMonth: { titleFormat: { month: 'short', year: 'numeric' }, dayHeaderFormat: { weekday: 'short' } } }}
        height="100%"
        nowIndicator
        slotEventOverlap={false}
        scrollTime="07:00:00"
        allDayText="ganzt."
        eventDisplay="block"
        dayMaxEventRows={3}
        events={fetchEvents}
        eventDidMount={(arg) => arg.el.style.setProperty('--ev', arg.event.extendedProps.color)}
        eventContent={(arg) => {
          const p = arg.event.extendedProps
          return (
            <div className="ev-inner">
              {arg.timeText && <span className="ev-time">{arg.timeText}{p.openEnd ? ' –' : ''}</span>}
              <span className="ev-title">
                {p.recurring && '↻ '}{arg.event.title}{p.comments > 0 && ` 💬${p.comments}`}
              </span>
            </div>
          )
        }}
        displayEventEnd={false}
        eventClick={(arg) => onEventClick(arg.event.extendedProps.eventId, arg.event.extendedProps.datum)}
        dateClick={(arg) =>
          onDateClick({ date: dateKey(arg.date), time: arg.allDay ? null : arg.date.toTimeString().slice(0, 5), allDay: arg.allDay && arg.view.type === 'timeGridWeek' })
        }
      />
    </div>
  )
}
