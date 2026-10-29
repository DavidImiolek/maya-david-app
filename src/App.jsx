import { useEffect, useState } from 'react'
import { supabase, configMissing } from './lib/supabase.js'
import Login from './components/Login.jsx'
import Home from './components/Home.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = lädt noch

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
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (lokal in <code>.env.local</code>, online in Vercel).
        </p>
      </div>
    )
  }
  if (session === undefined) return <div className="center-screen muted">Lädt …</div>
  if (!session) return <Login />
  return <Home session={session} />
}
