import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Einmalige Einrichtung: den persönlichen Kalender-Link im iPhone-Kalender abonnieren
export default function KalenderAbo({ userId, onClose }) {
  const [token, setToken] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('kalender_token').eq('id', userId).single()
      .then(({ data, error }) => (error ? setError(error.message) : setToken(data.kalender_token)))
  }, [userId])

  const httpsUrl = token && `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kalender-feed?token=${token}`
  const webcalUrl = httpsUrl && httpsUrl.replace(/^https:\/\//, 'webcal://')

  async function copy() {
    try {
      await navigator.clipboard.writeText(httpsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Kopieren ging nicht – Link bitte manuell markieren.')
    }
  }

  async function renew() {
    if (!confirm('Neuen Link erzeugen? Der alte funktioniert dann nicht mehr und muss im iPhone-Kalender ersetzt werden.')) return
    const neu = (crypto.randomUUID() + crypto.randomUUID()).replaceAll('-', '')
    const { error } = await supabase.from('profiles').update({ kalender_token: neu }).eq('id', userId)
    if (error) setError(error.message)
    else setToken(neu)
  }

  return (
    <div className="sheet">
      <div className="sheet-body">
        <div className="sheet-head">
          <button className="link" onClick={onClose}>‹ Zurück</button>
          <strong>iPhone-Kalender</strong>
          <span />
        </div>

        <p>
          Termine mit <b>„📲 In iPhone-Kalender übernehmen“</b> erscheinen in deiner iPhone-Kalender-App
          als eigener Kalender <b>„Maya &amp; David“</b> – deine eigenen und die gemeinsamen.
          Änderungen kommen automatisch mit (das iPhone holt sie sich regelmäßig ab).
        </p>

        <h3>Einmalig einrichten</h3>
        <ol className="steps">
          <li>Auf <b>„Im iPhone-Kalender abonnieren“</b> tippen.</li>
          <li>Im Kalender-Fenster <b>„Abonnieren“</b> bestätigen.</li>
          <li>Als Account am besten <b>iCloud</b> wählen, Farbe nach Wunsch → <b>Hinzufügen</b>.</li>
        </ol>

        {error && <p className="error">{error}</p>}
        {!token && !error && <p className="muted">Lädt …</p>}
        {token && (
          <>
            <a className="primary big-link" href={webcalUrl}>Im iPhone-Kalender abonnieren</a>
            <button className="link" onClick={copy}>{copied ? 'Kopiert ✓' : 'Link kopieren (falls der Button nichts tut)'}</button>
          </>
        )}

        <h3>Gut zu wissen</h3>
        <ul className="steps">
          <li>Schneller aktualisieren: <b>Einstellungen → Kalender → Accounts → Abonnierte Kalender abrufen</b> (bzw. „Datenabgleich“) auf <b>„Alle 15 Minuten“</b>.</li>
          <li>Bearbeitet wird nur hier in der App – im iPhone-Kalender sind die Termine schreibgeschützt.</li>
          <li>Der Link ist privat. Wer ihn hat, sieht deine übernommenen Termine.</li>
        </ul>
        {token && <button className="danger" onClick={renew}>Neuen Link erzeugen</button>}
      </div>
    </div>
  )
}
