import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Wer bekommt beim Anlegen eines GEMEINSAMEN Termins eine Jubel-Animation – und mit welchem Text?
// Schlüssel = Name im Profil. Weitere Personen einfach ergänzen.
// bild = Dateiname im privaten Supabase-Speicher (Bucket "privat"); ohne Bild erscheint ein Herz.
export const JUBEL_TEXTE = {
  Maya:  { titel: 'Hurra! 🎉', text: 'David freut sich riesig.\nMit dir verbringt er so gerne Zeit!', bild: 'fuer-maya.jpg' },
  David: { titel: 'Hurra! 🎉', text: 'Maya freut sich riesig.\nMit dir verbringt sie so gerne Zeit!', bild: 'fuer-david.jpg' },
}

// Bild vorab aus dem privaten Speicher laden (nur für eingeloggte Nutzer erlaubt),
// damit es beim Jubel sofort da ist. Ergebnis: lokale Bild-Adresse oder null.
export function useJubelBild(dateiname) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!dateiname) return
    let objectUrl = null
    supabase.storage.from('privat').download(dateiname).then(({ data }) => {
      if (data) {
        objectUrl = URL.createObjectURL(data)
        setUrl(objectUrl)
      }
    })
    return () => objectUrl && URL.revokeObjectURL(objectUrl)
  }, [dateiname])
  return url
}

const HEARTS = ['❤️', '💖', '💕', '💗', '💞', '💓', '🩷']

// Vollbild-Animation mit vielen aufsteigenden Herzen. Schließt sich nach ein paar Sekunden oder per Tipp.
export default function Jubel({ titel, text, bildUrl, onClose }) {
  const hearts = useMemo(
    () => Array.from({ length: 45 }, (_, i) => ({
      id: i,
      emoji: HEARTS[i % HEARTS.length],
      left: Math.random() * 100,          // Position quer über den Bildschirm (%)
      size: 18 + Math.random() * 30,      // Größe (px)
      delay: Math.random() * 2.2,         // Startverzögerung (s)
      duration: 3 + Math.random() * 2.5,  // Flugdauer (s)
      drift: (Math.random() - 0.5) * 80,  // seitliches Schwanken (px)
    })),
    []
  )

  useEffect(() => {
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="jubel" onClick={onClose} role="dialog" aria-label={titel}>
      {hearts.map((h) => (
        <span key={h.id} className="jubel-heart" aria-hidden="true"
          style={{ left: `${h.left}%`, fontSize: h.size, animationDelay: `${h.delay}s`, animationDuration: `${h.duration}s`, '--drift': `${h.drift}px` }}>
          {h.emoji}
        </span>
      ))}
      <div className="jubel-card">
        <h2>{titel}</h2>
        <p>{text}</p>
        {bildUrl ? <img className="jubel-bild" src={bildUrl} alt="" /> : <div className="jubel-big">💞</div>}
        <span className="jubel-hint">Tippen zum Schließen</span>
      </div>
    </div>
  )
}
