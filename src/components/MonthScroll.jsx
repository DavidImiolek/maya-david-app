import { useEffect, useMemo, useRef } from 'react'
import { buildOccurrences } from '../lib/occurrences.js'
import { dateKey } from '../lib/recurrence.js'

const WEEKDAYS = ['M', 'D', 'M', 'D', 'F', 'S', 'S']
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

// Monate von -6 bis +12 relativ zum aktuellen Monat
const MONTH_RANGE = [-6, 12]

function getMonths() {
  const now = new Date()
  const months = []
  for (let off = MONTH_RANGE[0]; off <= MONTH_RANGE[1]; off++) {
    const d = new Date(now.getFullYear(), now.getMonth() + off, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}-${d.getMonth()}` })
  }
  return months
}

// Welcher Wochentag ist der 1.? (Mo=0 … So=6)
function startCol(year, month) {
  const d = new Date(year, month, 1).getDay() // So=0
  return (d + 6) % 7
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export default function MonthScroll({ data, profilesById, onDayClick }) {
  const scrollRef = useRef(null)
  const todayRef = useRef(null)
  const months = useMemo(getMonths, [])

  // Vorkommen über den ganzen Zeitraum berechnen
  const rangeStart = useMemo(() => new Date(months[0].year, months[0].month, 1), [months])
  const rangeEnd = useMemo(() => {
    const last = months[months.length - 1]
    return new Date(last.year, last.month + 1, 1)
  }, [months])

  const occMap = useMemo(
    () => buildOccurrences(data, profilesById, rangeStart, rangeEnd),
    [data, profilesById, rangeStart, rangeEnd]
  )

  const todayKey = dateKey(new Date())

  // Beim ersten Rendern zum aktuellen Monat scrollen
  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="month-scroll" ref={scrollRef}>
      {/* Feste Wochentag-Leiste */}
      <div className="ms-weekbar">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className={i >= 5 ? 'ms-weekend' : ''}>{d}</span>
        ))}
      </div>

      <div className="ms-body">
        {months.map((m) => {
          const sc = startCol(m.year, m.month)
          const days = daysInMonth(m.year, m.month)
          const cells = []

          for (let i = 0; i < sc; i++) cells.push(<span key={`pad${i}`} className="ms-cell ms-empty" />)

          for (let d = 1; d <= days; d++) {
            const dk = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const isToday = dk === todayKey
            const isWeekend = ((sc + d - 1) % 7) >= 5
            const occs = occMap.get(dk) || []
            const shown = occs.slice(0, 3)
            const extra = occs.length - 3

            cells.push(
              <button
                key={d}
                className={'ms-cell' + (isWeekend ? ' ms-wknd' : '')}
                ref={isToday ? todayRef : undefined}
                onClick={() => onDayClick(dk)}
              >
                <span className={'ms-day' + (isToday ? ' ms-today' : '')}>{d}</span>
                <span className="ms-events">
                  {shown.map((o, i) => (
                    <span key={i} className={'ms-ev' + (o.maybe ? ' ms-ev-maybe' : '')} style={{ background: o.maybe ? 'transparent' : o.color, borderColor: o.color, color: o.gemeinsam ? '#24476B' : '#fff' }}>
                      {o.event.title}
                    </span>
                  ))}
                  {extra > 0 && <span className="ms-more">+{extra}</span>}
                </span>
              </button>
            )
          }

          return (
            <div key={m.key} className="ms-month">
              <div className="ms-label">{MONTH_NAMES[m.month]}{m.year !== new Date().getFullYear() ? ` ${m.year}` : ''}</div>
              <div className="ms-grid">{cells}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
