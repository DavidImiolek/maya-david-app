import { useEffect, useMemo, useRef, useState } from 'react'
import { buildOccurrences } from '../lib/occurrences.js'
import { dateKey } from '../lib/recurrence.js'

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTH_NAMES = [
  'Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni',
  'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.',
]

const HOUR_H = 60 // px pro Stunde
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SWIPE_MIN = 50

function parseDate(dk) {
  const [y, m, d] = dk.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(dk, n) {
  const d = parseDate(dk)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

// Woche (Mo–So) um einen Tag
function weekDays(dk) {
  const d = parseDate(dk)
  const dow = (d.getDay() + 6) % 7 // Mo=0
  const mon = new Date(d)
  mon.setDate(mon.getDate() - dow)
  const days = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(mon)
    dd.setDate(dd.getDate() + i)
    days.push(dateKey(dd))
  }
  return days
}

function formatHeading(dk) {
  const d = parseDate(dk)
  return `${DAY_NAMES[d.getDay()]} – ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function formatMonthBack(dk) {
  const d = parseDate(dk)
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ]
  return months[d.getMonth()]
}

// Positioniere Termine in Spalten bei Überlappungen
function layoutEvents(occs) {
  if (!occs.length) return []
  const sorted = [...occs].sort((a, b) => a.start - b.start || b.end - a.end)
  const columns = []

  for (const occ of sorted) {
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      const last = columns[c][columns[c].length - 1]
      if (last.end <= occ.start) {
        columns[c].push(occ)
        occ._col = c
        placed = true
        break
      }
    }
    if (!placed) {
      occ._col = columns.length
      columns.push([occ])
    }
  }

  const totalCols = columns.length
  for (const col of columns) {
    for (const occ of col) {
      occ._totalCols = totalCols
    }
  }
  return sorted
}

export default function DayView({ datum, data, profilesById, onBack, onDayChange, onEventClick, onTimeClick }) {
  const timelineRef = useRef(null)
  const touchRef = useRef(null)
  const todayKey = dateKey(new Date())
  const week = useMemo(() => weekDays(datum), [datum])

  // Vorkommen für diesen Tag
  const rangeStart = useMemo(() => parseDate(datum), [datum])
  const rangeEnd = useMemo(() => {
    const d = parseDate(datum)
    d.setDate(d.getDate() + 1)
    return d
  }, [datum])

  const occMap = useMemo(
    () => buildOccurrences(data, profilesById, rangeStart, rangeEnd),
    [data, profilesById, rangeStart, rangeEnd]
  )
  const dayOccs = occMap.get(datum) || []
  const allDayOccs = dayOccs.filter((o) => o.allDay)
  const timedOccs = dayOccs.filter((o) => !o.allDay)
  const laid = useMemo(() => layoutEvents(timedOccs), [timedOccs])

  // Beim Öffnen zur aktuellen Stunde scrollen (oder 7:00)
  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const now = new Date()
    const isToday = datum === todayKey
    const hour = isToday ? Math.max(now.getHours() - 1, 0) : 7
    el.scrollTop = hour * HOUR_H
  }, [datum, todayKey])

  // Wischen links/rechts → Tag ±1
  function onTouchStart(e) {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    const s = touchRef.current
    touchRef.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return
    onDayChange(addDays(datum, dx < 0 ? 1 : -1))
  }

  // Now-Linie
  const now = new Date()
  const nowMinutes = datum === todayKey ? now.getHours() * 60 + now.getMinutes() : -1

  return (
    <div className="day-view" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Zurück-Button */}
      <button className="dv-back link" onClick={onBack}>‹ {formatMonthBack(datum)}</button>

      {/* Wochenleiste */}
      <div className="dv-weekstrip">
        {week.map((dk, i) => {
          const d = parseDate(dk)
          const isSelected = dk === datum
          const isToday = dk === todayKey
          return (
            <button
              key={dk}
              className={'dv-weekday' + (isSelected ? ' dv-sel' : '') + (isToday && !isSelected ? ' dv-wtoday' : '')}
              onClick={() => onDayChange(dk)}
            >
              <span className="dv-wlabel">{WEEKDAYS_SHORT[i]}</span>
              <span className={'dv-wnum' + (isSelected ? ' dv-sel-num' : '') + (isToday ? ' dv-today-num' : '')}>{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Tagesüberschrift */}
      <div className="dv-heading">{formatHeading(datum)}</div>

      {/* Ganztägig */}
      {allDayOccs.length > 0 && (
        <div className="dv-allday">
          <span className="dv-allday-label">Ganztägig</span>
          <div className="dv-allday-items">
            {allDayOccs.map((o, i) => (
              <button
                key={i}
                className={'dv-allday-ev' + (o.maybe ? ' dv-maybe' : '') + (o.gemeinsam ? ' dv-light' : '')}
                style={{ '--ev': o.color, background: o.maybe ? `color-mix(in srgb, ${o.color} 18%, white)` : o.color }}
                onClick={() => onEventClick(o.event.id, o.datum)}
              >
                {o.recurring && '↻ '}{o.event.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="dv-timeline" ref={timelineRef}>
        <div className="dv-hours" style={{ height: 24 * HOUR_H }}>
          {HOURS.map((h) => (
            <div key={h} className="dv-hour" style={{ top: h * HOUR_H }}>
              <span className="dv-hour-label">{String(h).padStart(2, '0')}:00</span>
              <div className="dv-hour-line" />
            </div>
          ))}

          {/* Termin-Blöcke */}
          {laid.map((o, i) => {
            const startMin = o.start.getHours() * 60 + o.start.getMinutes()
            const endMin = o.end.getHours() * 60 + o.end.getMinutes() || 24 * 60
            const top = (startMin / 60) * HOUR_H
            const height = Math.max(((endMin - startMin) / 60) * HOUR_H, 22)
            const left = `calc(56px + ${(o._col / o._totalCols) * 100}% * (1 - 56/100))`
            const width = `calc(${(1 / o._totalCols) * 100}% * (1 - 56/100) - 2px)`

            return (
              <button
                key={i}
                className={'dv-event' + (o.maybe ? ' dv-ev-maybe' : '') + (o.openEnd ? ' dv-ev-openend' : '') + (o.gemeinsam ? ' dv-ev-light' : '')}
                style={{ '--ev': o.color, top, height, left, width, background: o.color }}
                onClick={() => onEventClick(o.event.id, o.datum)}
              >
                <span className="dv-ev-time">
                  {o.start.toTimeString().slice(0, 5)}{o.openEnd ? ' –' : ` – ${o.end.toTimeString().slice(0, 5)}`}
                </span>
                <span className="dv-ev-title">{o.recurring && '↻ '}{o.event.title}</span>
              </button>
            )
          })}

          {/* Now-Linie */}
          {nowMinutes >= 0 && (
            <div className="dv-now" style={{ top: (nowMinutes / 60) * HOUR_H }}>
              <i /><span />
            </div>
          )}

          {/* Klickbare Bereiche für neue Termine */}
          {HOURS.map((h) => (
            <div
              key={`click${h}`}
              className="dv-click"
              style={{ top: h * HOUR_H, height: HOUR_H }}
              onClick={() => onTimeClick(datum, `${String(h).padStart(2, '0')}:00`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
