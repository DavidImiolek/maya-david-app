import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildRule, parseRule, dateKey } from '../lib/recurrence.js'
import { GEMEINSAM_FARBE } from '../lib/colors.js'

const WEEKDAYS = [ [1, 'Mo'], [2, 'Di'], [3, 'Mi'], [4, 'Do'], [5, 'Fr'], [6, 'Sa'], [0, 'So'] ]
const timeOf = (d) => d.toTimeString().slice(0, 5)
const toDate = (day, time = '00:00') => {
  const [y, m, d] = day.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, mi)
}
const addDays = (day, n) => {
  const d = toDate(day)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

// Ausgangswerte: entweder aus bestehendem Termin oder aus dem angeklickten Datum
function initialState(event, defaults, me) {
  if (event) {
    const s = new Date(event.start_at)
    const e = event.end_at ? new Date(event.end_at) : null
    const rule = parseRule(event.recurrence_rule)
    return {
      title: event.title, owner_id: event.owner_id, both: !!event.gemeinsam, status: event.status, all_day: event.all_day,
      day: dateKey(s),
      endDay: event.all_day && e ? addDays(dateKey(e), -1) : dateKey(s),
      startTime: timeOf(s), endTime: e && !event.all_day ? timeOf(e) : '',
      openEnd: !event.all_day && !e,
      freq: rule?.freq || 'NONE', byday: rule?.byday?.length ? rule.byday : [s.getDay()],
      until: rule?.until || '',
      location: event.location || '', note: event.note || '',
      iphone: !!event.im_iphone_kalender,
    }
  }
  const day = defaults?.date || dateKey(new Date())
  const startTime = defaults?.time || '18:00'
  const [h, m] = startTime.split(':').map(Number)
  return {
    title: '', owner_id: me?.id, both: false, status: 'fest', all_day: !!defaults?.allDay,
    day, endDay: day, startTime,
    endTime: `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    openEnd: false, freq: 'NONE', byday: [toDate(day).getDay()], until: '',
    location: '', note: '', iphone: false,
  }
}

export default function EventForm({ me, profiles, event, defaults, onClose, onSaved }) {
  const [f, setF] = useState(() => initialState(event, defaults, me))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setF((old) => ({ ...old, ...patch }))

  const endsNextDay = !f.all_day && !f.openEnd && f.endTime && f.endTime < f.startTime

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!f.title.trim()) return setError('Bitte einen Titel eingeben.')

    let start, end
    if (f.all_day) {
      if (f.endDay < f.day) return setError('Das Ende liegt vor dem Beginn.')
      start = toDate(f.day)
      end = toDate(addDays(f.endDay, 1)) // ganztägig: Ende = Beginn des Folgetags
    } else {
      start = toDate(f.day, f.startTime)
      if (f.openEnd) end = null
      else {
        if (!f.endTime) return setError('Bitte ein Ende eingeben oder „Open End“ wählen.')
        if (f.endTime === f.startTime) return setError('Ende und Beginn sind gleich.')
        end = toDate(endsNextDay ? addDays(f.day, 1) : f.day, f.endTime)
      }
    }
    if (f.freq === 'WEEKLY' && f.byday.length === 0) return setError('Bitte mindestens einen Wochentag wählen.')
    if (f.freq !== 'NONE' && f.until && f.until < f.day) return setError('Das Serienende liegt vor dem Beginn.')

    if (!f.both && !f.owner_id) return setError('Bitte auswählen, für wen der Termin ist.')
    const row = {
      title: f.title.trim(),
      owner_id: f.both ? (event?.owner_id || me?.id) : f.owner_id,
      gemeinsam: f.both,
      status: f.status,
      all_day: f.all_day,
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : null,
      recurrence_rule: buildRule({ freq: f.freq, byday: f.byday, until: f.until || null }),
      location: f.location.trim() || null,
      note: f.note.trim() || null,
      im_iphone_kalender: f.iphone,
    }
    setBusy(true)
    const { error } = event
      ? await supabase.from('events').update(row).eq('id', event.id)
      : await supabase.from('events').insert(row)
    setBusy(false)
    if (error) return setError('Speichern fehlgeschlagen: ' + error.message)
    onSaved()
  }

  // Antippen schaltet eine Person an/aus. Beide an = gemeinsamer Termin.
  function toggleOwner(id) {
    const selected = new Set(f.both ? profiles.map((p) => p.id) : f.owner_id ? [f.owner_id] : [])
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    if (selected.size === 2) set({ both: true })
    else if (selected.size === 1) set({ both: false, owner_id: [...selected][0] })
    else set({ both: false, owner_id: null })
  }

  const toggleDay = (d) =>
    set({ byday: f.byday.includes(d) ? f.byday.filter((x) => x !== d) : [...f.byday, d] })

  return (
    <div className="sheet">
      <form className="sheet-body" onSubmit={save}>
        <div className="sheet-head">
          <button type="button" className="link" onClick={onClose}>Abbrechen</button>
          <strong>{event ? 'Termin bearbeiten' : 'Neuer Termin'}</strong>
          <button className="link strong" disabled={busy}>Sichern</button>
        </div>

        {event?.recurrence_rule && <p className="hint">Änderungen gelten für die ganze Serie.</p>}

        <input className="title-input" placeholder="Titel" value={f.title} autoFocus={!event}
          onChange={(e) => set({ title: e.target.value })} />

        <label className="field-label">Für</label>
        <div className="segmented">
          {profiles.map((p) => {
            const on = f.both || f.owner_id === p.id
            const bg = f.both ? GEMEINSAM_FARBE : p.farbe
            return (
              <button type="button" key={p.id}
                className={on ? 'on' + (f.both ? ' light' : '') : ''}
                style={on ? { background: bg, borderColor: bg } : {}}
                onClick={() => toggleOwner(p.id)}>{p.name}</button>
            )
          })}
        </div>
        {f.both && <p className="hint">Gemeinsamer Termin – beide können ihn bearbeiten.</p>}

        <label className="field-label">Status</label>
        <div className="segmented">
          <button type="button" className={f.status === 'fest' ? 'on dark' : ''} onClick={() => set({ status: 'fest' })}>Fest</button>
          <button type="button" className={f.status === 'vielleicht' ? 'on dark dashed' : 'dashed'} onClick={() => set({ status: 'vielleicht' })}>Vielleicht</button>
        </div>

        <div className="rows">
          <label className="row">
            <span>Ganztägig</span>
            <input type="checkbox" checked={f.all_day} onChange={(e) => set({ all_day: e.target.checked, openEnd: false })} />
          </label>

          {f.all_day ? (
            <>
              <label className="row"><span>Von</span>
                <input type="date" value={f.day} onChange={(e) => set({ day: e.target.value, endDay: e.target.value > f.endDay ? e.target.value : f.endDay })} />
              </label>
              <label className="row"><span>Bis</span>
                <input type="date" value={f.endDay} onChange={(e) => set({ endDay: e.target.value })} />
              </label>
            </>
          ) : (
            <>
              <label className="row"><span>Datum</span>
                <input type="date" value={f.day} onChange={(e) => set({ day: e.target.value })} />
              </label>
              <label className="row"><span>Beginn</span>
                <input type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
              </label>
              <label className="row">
                <span>Open End</span>
                <input type="checkbox" checked={f.openEnd} onChange={(e) => set({ openEnd: e.target.checked })} />
              </label>
              {!f.openEnd && (
                <label className="row"><span>Ende{endsNextDay && <small> (Folgetag)</small>}</span>
                  <input type="time" value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} />
                </label>
              )}
            </>
          )}

          <label className="row"><span>Wiederholen</span>
            <select value={f.freq} onChange={(e) => set({ freq: e.target.value })}>
              <option value="NONE">Nie</option>
              <option value="DAILY">Täglich</option>
              <option value="WEEKLY">Wöchentlich</option>
              <option value="MONTHLY">Monatlich</option>
            </select>
          </label>
          {f.freq === 'WEEKLY' && (
            <div className="weekdays">
              {WEEKDAYS.map(([d, label]) => (
                <button type="button" key={d} className={f.byday.includes(d) ? 'on' : ''} onClick={() => toggleDay(d)}>{label}</button>
              ))}
            </div>
          )}
          {f.freq !== 'NONE' && (
            <label className="row"><span>Endet am <small>(leer = nie)</small></span>
              <input type="date" value={f.until} onChange={(e) => set({ until: e.target.value })} />
            </label>
          )}
        </div>

        <input placeholder="Ort" value={f.location} onChange={(e) => set({ location: e.target.value })} />
        <textarea placeholder="Notiz" rows={3} value={f.note} onChange={(e) => set({ note: e.target.value })} />

        <div className="rows">
          <label className="row">
            <span>📲 In iPhone-Kalender übernehmen</span>
            <input type="checkbox" checked={f.iphone} onChange={(e) => set({ iphone: e.target.checked })} />
          </label>
        </div>
        {f.iphone && (
          <p className="hint">
            Erscheint im iPhone-Kalender „Maya &amp; David“ bei{' '}
            {f.both ? 'euch beiden' : profiles.find((p) => p.id === f.owner_id)?.name || '…'}
            {' '}– sobald dort der Kalender einmal abonniert ist (📲 oben im Kalender).
          </p>
        )}

        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
