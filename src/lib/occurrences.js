// Baut aus den Rohdaten eine Map: "YYYY-MM-DD" → Array von Vorkommnissen
// Jedes Vorkommnis: { event, start, end, datum, allDay }
// Mehrtägige ganztägige Termine tauchen an jedem ihrer Tage auf.

import { expandEvent, dateKey } from './recurrence.js'
import { eventColor } from './colors.js'

const DAY_MS = 86400000

/**
 * @param {Object} data  – { events, exceptions, profiles }
 * @param {Object} profilesById
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @returns {Map<string, Array>}  dateKey → occurrences
 */
export function buildOccurrences(data, profilesById, rangeStart, rangeEnd) {
  const exByEvent = {}
  for (const x of data.exceptions) (exByEvent[x.event_id] ??= new Set()).add(x.datum)

  const commentCounts = {}
  for (const c of data.comments) {
    const k = `${c.event_id}|${c.datum}`
    commentCounts[k] = (commentCounts[k] || 0) + 1
  }

  const map = new Map()

  for (const ev of data.events) {
    const color = eventColor(ev, profilesById)
    const occs = expandEvent(ev, rangeStart, rangeEnd, exByEvent[ev.id])

    for (const o of occs) {
      const occ = {
        event: ev,
        start: o.start,
        end: o.end,
        datum: o.datum,
        allDay: ev.all_day,
        color,
        gemeinsam: ev.gemeinsam,
        maybe: ev.status === 'vielleicht',
        openEnd: !ev.end_at && !ev.all_day,
        recurring: !!ev.recurrence_rule,
        comments: commentCounts[`${ev.id}|${o.datum}`] || 0,
      }

      // Für ganztägige Termine: an jedem Tag eintragen, den sie überdecken
      if (ev.all_day) {
        let d = new Date(o.start)
        const last = new Date(o.end.getTime() - 1) // end ist exklusiv
        while (d <= last) {
          const dk = dateKey(d)
          if (!map.has(dk)) map.set(dk, [])
          map.get(dk).push(occ)
          d = new Date(d.getTime() + DAY_MS)
        }
      } else {
        if (!map.has(o.datum)) map.set(o.datum, [])
        map.get(o.datum).push(occ)
      }
    }
  }

  return map
}
