// Wiederholungen im RRULE-Standardformat, z. B. "FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20270331".
// Unterstützt: DAILY, WEEKLY (mit Wochentagen), MONTHLY (gleicher Tag im Monat), optionales Enddatum.

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] // Index = JS getDay()
const DAY_MS = 86400000

export function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseRule(rule) {
  if (!rule) return null
  const parts = Object.fromEntries(
    rule.split(';').map((p) => p.split('=')).filter((p) => p.length === 2)
  )
  const freq = parts.FREQ
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(freq)) return null
  const byday = parts.BYDAY
    ? parts.BYDAY.split(',').map((c) => DAY_CODES.indexOf(c)).filter((i) => i >= 0)
    : []
  let until = null
  if (parts.UNTIL && /^\d{8}/.test(parts.UNTIL)) {
    const u = parts.UNTIL
    until = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`
  }
  return { freq, byday, until }
}

export function buildRule({ freq, byday = [], until = null }) {
  if (!freq || freq === 'NONE') return null
  let r = `FREQ=${freq}`
  if (freq === 'WEEKLY' && byday.length) {
    r += `;BYDAY=${[...byday].sort((a, b) => a - b).map((i) => DAY_CODES[i]).join(',')}`
  }
  if (until) r += `;UNTIL=${until.replaceAll('-', '')}`
  return r
}

// Ende eines Vorkommens berechnen
function occurrenceEnd(ev, occStart, durationMs, allDayDays) {
  if (ev.all_day) {
    return new Date(occStart.getFullYear(), occStart.getMonth(), occStart.getDate() + allDayDays)
  }
  if (!ev.end_at) {
    // Open End: bis Mitternacht
    return new Date(occStart.getFullYear(), occStart.getMonth(), occStart.getDate() + 1)
  }
  return new Date(occStart.getTime() + durationMs)
}

/**
 * Liefert alle Vorkommen eines Termins, die in [rangeStart, rangeEnd) sichtbar sind.
 * exceptions: Set von "YYYY-MM-DD" (ausgefallene Einzeltermine)
 */
export function expandEvent(ev, rangeStart, rangeEnd, exceptions = new Set()) {
  const start = new Date(ev.start_at)
  const end = ev.end_at ? new Date(ev.end_at) : null
  const durationMs = end ? end - start : 0
  const allDayDays = ev.all_day && end ? Math.max(1, Math.round((end - start) / DAY_MS)) : 1
  const rule = parseRule(ev.recurrence_rule)

  const visible = (s, e) => s < rangeEnd && e > rangeStart

  if (!rule) {
    const e = occurrenceEnd(ev, start, durationMs, allDayDays)
    return visible(start, e) ? [{ start, end: e, datum: dateKey(start) }] : []
  }

  // Tag für Tag durch das sichtbare Fenster gehen (plus Vorlauf für lange Termine)
  const spanDays = Math.ceil(Math.max(durationMs, allDayDays * DAY_MS) / DAY_MS) + 1
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  let day = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() - spanDays)
  if (day < startDay) day = startDay

  const weekdays = rule.byday.length ? rule.byday : [start.getDay()]
  const out = []
  while (day < rangeEnd) {
    const key = dateKey(day)
    if (rule.until && key > rule.until) break
    let match = false
    if (rule.freq === 'DAILY') match = true
    else if (rule.freq === 'WEEKLY') match = weekdays.includes(day.getDay())
    else if (rule.freq === 'MONTHLY') match = day.getDate() === start.getDate()

    if (match && !exceptions.has(key)) {
      const occStart = new Date(
        day.getFullYear(), day.getMonth(), day.getDate(), start.getHours(), start.getMinutes()
      )
      const occEnd = occurrenceEnd(ev, occStart, durationMs, allDayDays)
      if (visible(occStart, occEnd)) out.push({ start: occStart, end: occEnd, datum: key })
    }
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  }
  return out
}

// Für die Anzeige: "Jeden Di, Do bis 31.03.2027"
const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
export function describeRule(rule, start) {
  const r = parseRule(rule)
  if (!r) return null
  let text
  if (r.freq === 'DAILY') text = 'Täglich'
  else if (r.freq === 'WEEKLY') {
    const days = (r.byday.length ? r.byday : [new Date(start).getDay()])
      .slice()
      .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    text = 'Jeden ' + days.map((d) => DAY_NAMES[d]).join(', ')
  } else text = `Monatlich am ${new Date(start).getDate()}.`
  if (r.until) {
    const [y, m, d] = r.until.split('-')
    text += ` bis ${d}.${m}.${y}`
  }
  return text
}
