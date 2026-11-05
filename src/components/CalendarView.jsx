import { useCallback, useMemo, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import deLocale from '@fullcalendar/core/locales/de'
import { expandEvent, dateKey } from '../lib/recurrence.js'
import { eventColor } from '../lib/colors.js'

// Wischen: mindestens so weit (px) und deutlich mehr waagrecht als senkrecht
const SWIPE_MIN = 60

export default function CalendarView({ data, profilesById, onEventClick, onDateClick }) {
  const calRef = useRef(null)
  const touch = useRef(null)
  const wrapRef = useRef(null)

  // Nach links wischen → nächste Woche/Monat, nach rechts → vorherige
  // (FullCalendar weiß selbst, ob gerade Woche oder Monat angezeigt wird)
  function onTouchStart(e) {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, time: Date.now() }
  }
  function onTouchEnd(e) {
    const start = touch.current
    touch.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - start.time > 800) return
    const api = calRef.current?.getApi()
    if (!api) return
    if (dx < 0) api.next()
    else api.prev()
    // kleine Gleit-Animation in Wischrichtung
    const el = wrapRef.current
    if (el) {
      el.classList.remove('slide-left', 'slide-right')
      void el.offsetWidth
      el.classList.add(dx < 0 ? 'slide-left' : 'slide-right')
    }
  }

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
        const color = eventColor(ev, profilesById)
        const classes = []
        if (ev.gemeinsam) classes.push('ev-light')
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
    <div className="calendar" ref={wrapRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <FullCalendar
        ref={calRef}
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
