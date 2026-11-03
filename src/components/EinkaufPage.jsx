import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useShoppingData } from '../lib/useShoppingData.js'

export default function EinkaufPage({ session }) {
  const userId = session.user.id
  const { items, setItems, profiles, loadError, reload } = useShoppingData()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const byId = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles])
  const open = items.filter((i) => !i.erledigt)
  const done = items.filter((i) => i.erledigt).sort((a, b) => (b.erledigt_at || '').localeCompare(a.erledigt_at || ''))

  async function run(promise) {
    setError('')
    const { error } = await promise
    if (error) {
      setError(error.message)
      reload()
    }
  }

  async function add(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    inputRef.current?.focus() // Tastatur bleibt offen → mehrere Sachen schnell hintereinander
    await run(supabase.from('shopping_items').insert({ text: t }))
    reload()
  }

  function toggle(item) {
    const erledigt = !item.erledigt
    const patch = erledigt
      ? { erledigt: true, erledigt_von: userId, erledigt_at: new Date().toISOString() }
      : { erledigt: false, erledigt_von: null, erledigt_at: null }
    // Sofort anzeigen, nicht auf die Datenbank warten
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
    run(supabase.from('shopping_items').update(patch).eq('id', item.id))
  }

  function remove(item) {
    setItems((list) => list.filter((i) => i.id !== item.id))
    run(supabase.from('shopping_items').delete().eq('id', item.id))
  }

  function clearDone() {
    if (!confirm(`${done.length} erledigte Einträge löschen?`)) return
    setItems((list) => list.filter((i) => !i.erledigt))
    run(supabase.from('shopping_items').delete().eq('erledigt', true))
  }

  return (
    <div className="page">
      <header className="page-head">
        <a className="link back" href="#/">‹ Start</a>
        <h1>Einkaufsliste</h1>
        <span />
      </header>

      <form className="add-form" onSubmit={add}>
        <input ref={inputRef} placeholder="Was fehlt?" value={text} enterKeyHint="done"
          onChange={(e) => setText(e.target.value)} />
        <button className="primary" aria-label="Hinzufügen">+</button>
      </form>

      {(loadError || error) && <p className="error">{loadError || error}</p>}

      {open.length === 0 && <p className="muted empty">Alles da. 🎉</p>}
      <ul className="shop-list">
        {open.map((i) => (
          <li key={i.id}>
            <button className="check" aria-label="Abhaken" onClick={() => toggle(i)} />
            <span className="shop-text">{i.text}</span>
            <i className="who" style={{ background: byId[i.created_by]?.farbe }} title={byId[i.created_by]?.name} />
            <button className="link small" aria-label="Löschen" onClick={() => remove(i)}>✕</button>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <div className="done-head">
            <span className="muted small">Erledigt ({done.length})</span>
            <button className="link small" onClick={clearDone}>Erledigte löschen</button>
          </div>
          <ul className="shop-list done">
            {done.map((i) => (
              <li key={i.id} onClick={() => toggle(i)}>
                <button className="check on" aria-label="Wieder offen">✓</button>
                <span className="shop-text">{i.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
