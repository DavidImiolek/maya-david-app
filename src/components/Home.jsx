import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { FEATURES } from '../features.js'

// Begrüßungsname: einmal pro App-Start zufällig aus den Spitznamen,
// möglichst nicht derselbe wie beim letzten Mal
function pickGreetingName(profile) {
  const names = (profile.spitznamen || []).filter((n) => n && n.trim())
  if (names.length === 0) return profile.name
  try {
    const current = sessionStorage.getItem('gruss')
    if (current && names.includes(current)) return current // gleicher App-Start → gleicher Name
    const last = localStorage.getItem('gruss-zuletzt')
    const pool = names.length > 1 ? names.filter((n) => n !== last) : names
    const pick = pool[Math.floor(Math.random() * pool.length)]
    sessionStorage.setItem('gruss', pick)
    localStorage.setItem('gruss-zuletzt', pick)
    return pick
  } catch {
    return names[Math.floor(Math.random() * names.length)]
  }
}

// Startseite: Begrüßung + eine Kachel pro Feature
export default function Home({ session }) {
  const [me, setMe] = useState(null)

  const [gruss, setGruss] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('name, farbe, spitznamen').eq('id', session.user.id).single()
      .then(({ data }) => {
        setMe(data)
        if (data) setGruss(pickGreetingName(data))
      })
  }, [session.user.id])

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <p className="muted small">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>Hallo{gruss ? ` ${gruss}` : ''}</h1>
        </div>
        <button className="link" onClick={() => supabase.auth.signOut()}>Abmelden</button>
      </header>

      <div className="tiles">
        {FEATURES.map((f) => (
          <a key={f.id} className="tile" href={`#/${f.id}`} style={{ '--tile': f.color }}>
            <span className="tile-icon">{f.icon}</span>
            <strong className="tile-title">{f.title}</strong>
            {f.Tile && <f.Tile />}
          </a>
        ))}
        <div className="tile tile-soon">
          <span className="tile-icon">✨</span>
          <strong className="tile-title">Bald mehr</strong>
          <p className="tile-sub">Nächstes Feature</p>
        </div>
      </div>
    </div>
  )
}
