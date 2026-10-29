import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError('E-Mail oder Passwort stimmt nicht.')
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <form className="login" onSubmit={submit}>
        <img src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" width="72" height="72" />
        <h1>Maya & David</h1>
        <input type="email" placeholder="E-Mail" autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Passwort" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Anmelden …' : 'Anmelden'}</button>
      </form>
    </div>
  )
}
