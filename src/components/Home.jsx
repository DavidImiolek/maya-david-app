import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { FEATURES } from '../features.js'

// Startseite: Begrüßung + eine Kachel pro Feature
export default function Home({ session }) {
  const [me, setMe] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('name, farbe').eq('id', session.user.id).single()
      .then(({ data }) => setMe(data))
  }, [session.user.id])

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <p className="muted small">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>Hallo{me ? ` ${me.name}` : ''}</h1>
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
