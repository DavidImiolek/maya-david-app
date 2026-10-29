import { useEffect, useState } from 'react'
import { supabase, configMissing } from './lib/supabase.js'
import { FEATURES } from './features.js'
import Login from './components/Login.jsx'
import Home from './components/Home.jsx'

// Aktuelle Seite steht in der Adresse hinter dem #, z. B. ...#/kalender
function useRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '')
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => { setRoute(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = lädt noch
  const route = useRoute()

  useEffect(() => {
    if (configMissing) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (configMissing) {
    return (
      <div className="center-screen">
        <p>
          Die Supabase-Zugangsdaten fehlen. Setze <code>VITE_SUPABASE_URL</code> und{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
        </p>
      </div>
    )
  }
  if (session === undefined) return <div className="center-screen muted">Lädt …</div>
  if (!session) return <Login />

  const feature = FEATURES.find((f) => f.id === route)
  if (feature) return <feature.Page session={session} />
  return <Home session={session} />
}
