import { useEffect, useState } from 'react'
import { pushStatus, subscribePush } from '../lib/push.js'

// Karte auf der Startseite: Benachrichtigungen einschalten
export default function PushSetup({ userId }) {
  const [status, setStatus] = useState(pushStatus)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Schon erlaubt → Abo bei jedem Start still auffrischen (falls iOS es erneuert hat)
  useEffect(() => {
    if (status === 'granted') subscribePush(userId).catch((e) => setError(e.message))
  }, [status, userId])

  async function enable() {
    setBusy(true)
    setError('')
    try {
      // Muss direkt durch einen Fingertipp ausgelöst werden – sonst blockt das iPhone
      const result = await Notification.requestPermission()
      if (result === 'granted') await subscribePush(userId)
      setStatus(result)
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  if (status === 'unsupported') return null
  if (status === 'granted') return error ? <p className="error small">Benachrichtigungen: {error}</p> : null

  return (
    <div className="push-card">
      <span className="push-icon">🔔</span>
      {status === 'ios-browser' && (
        <p>Benachrichtigungen gibt es am iPhone nur in der installierten App: in Safari <b>Teilen → „Zum Home-Bildschirm“</b>, dann die App über das Icon öffnen.</p>
      )}
      {status === 'denied' && (
        <p>Benachrichtigungen sind blockiert. Erlauben unter <b>iPhone-Einstellungen → Mitteilungen → Maya &amp; David</b>.</p>
      )}
      {status === 'default' && (
        <>
          <p>Bekomm Bescheid, wenn ein neuer Termin oder etwas auf der Einkaufsliste dazukommt.</p>
          <button className="primary" onClick={enable} disabled={busy}>{busy ? 'Einen Moment …' : 'Benachrichtigungen aktivieren'}</button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}
