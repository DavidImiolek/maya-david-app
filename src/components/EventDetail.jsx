import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { describeRule } from '../lib/recurrence.js'

const fmtDay = (key) =>
  new Date(key + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
const fmtTime = (d) => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

function timeText(event) {
  if (event.all_day) {
    const days = Math.round((new Date(event.end_at) - new Date(event.start_at)) / 86400000)
    return days > 1 ? `ganztägig · ${days} Tage` : 'ganztägig'
  }
  const s = new Date(event.start_at)
  if (!event.end_at) return `ab ${fmtTime(s)} · Open End`
  return `${fmtTime(s)} – ${fmtTime(new Date(event.end_at))}`
}

export default function EventDetail({ event, datum, userId, profilesById, comments, onClose, onEdit, onChanged, onDeleted }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const owner = profilesById[event.owner_id]
  const creator = profilesById[event.created_by]
  const canEdit = userId === event.owner_id || userId === event.created_by
  const color = owner?.farbe || '#888'
  const maybe = event.status === 'vielleicht'
  const repeat = describeRule(event.recurrence_rule, event.start_at)

  async function run(promise) {
    setError('')
    const { error } = await promise
    if (error) setError(error.message)
    return !error
  }

  async function addComment(e) {
    e.preventDefault()
    if (!text.trim()) return
    if (await run(supabase.from('comments').insert({ event_id: event.id, datum, text: text.trim() }))) {
      setText('')
      onChanged()
    }
  }

  async function deleteOne() {
    if (!confirm(`Nur den Termin am ${fmtDay(datum)} löschen?`)) return
    if (await run(supabase.from('event_exceptions').insert({ event_id: event.id, datum }))) onDeleted()
  }

  async function deleteAll() {
    const msg = event.recurrence_rule ? 'Die ganze Serie löschen?' : 'Termin löschen?'
    if (!confirm(msg)) return
    if (await run(supabase.from('events').delete().eq('id', event.id))) onDeleted()
  }

  return (
    <div className="sheet">
      <div className="sheet-body">
        <div className="sheet-head">
          <button className="link" onClick={onClose}>‹ Zurück</button>
          <span />
          {canEdit ? <button className="link strong" onClick={onEdit}>Bearbeiten</button> : <span />}
        </div>

        <div className={'detail-card' + (maybe ? ' maybe' : '')} style={{ '--ev': color }}>
          <h2>{event.title}</h2>
          <p>{fmtDay(datum)} · {timeText(event)}</p>
          {maybe && <p className="badge">vielleicht</p>}
        </div>

        <dl className="facts">
          {repeat && <><dt>Wiederholung</dt><dd>{repeat}</dd></>}
          <dt>Kalender</dt><dd>{owner?.name}</dd>
          <dt>Eingetragen von</dt><dd>{creator?.name}</dd>
          {event.location && <><dt>Ort</dt><dd>{event.location}</dd></>}
          {event.note && <><dt>Notiz</dt><dd className="pre">{event.note}</dd></>}
        </dl>

        <h3>Kommentare</h3>
        {comments.length === 0 && <p className="muted small">Noch keine Kommentare für diesen Tag.</p>}
        <ul className="comments">
          {comments.map((c) => {
            const a = profilesById[c.author_id]
            return (
              <li key={c.id}>
                <span style={{ color: a?.farbe }}>{a?.name}:</span> {c.text}
                {c.author_id === userId && (
                  <button className="link small" aria-label="Kommentar löschen"
                    onClick={async () => (await run(supabase.from('comments').delete().eq('id', c.id))) && onChanged()}>✕</button>
                )}
              </li>
            )
          })}
        </ul>
        <form className="comment-form" onSubmit={addComment}>
          <input placeholder="Kommentar schreiben …" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="primary">Senden</button>
        </form>

        {error && <p className="error">{error}</p>}

        {canEdit && (
          <div className="danger-zone">
            {event.recurrence_rule && <button className="danger" onClick={deleteOne}>Nur diesen Termin löschen</button>}
            <button className="danger" onClick={deleteAll}>{event.recurrence_rule ? 'Ganze Serie löschen' : 'Termin löschen'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
