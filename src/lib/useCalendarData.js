import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

// Lädt alle Kalenderdaten und hält sie per Realtime aktuell.
// Wird von der Kalender-Seite und von der Kalender-Kachel auf der Startseite genutzt.
export function useCalendarData() {
  const [data, setData] = useState({ profiles: [], events: [], exceptions: [], comments: [] })
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const reloadTimer = useRef(null)

  const load = useCallback(async () => {
    const [p, e, x, c] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('events').select('*'),
      supabase.from('event_exceptions').select('*'),
      supabase.from('comments').select('*').order('created_at'),
    ])
    const err = p.error || e.error || x.error || c.error
    if (err) {
      setLoadError('Daten konnten nicht geladen werden: ' + err.message)
      return
    }
    setLoadError('')
    setData({ profiles: p.data, events: e.data, exceptions: x.data, comments: c.data })
    setLoaded(true)
  }, [])

  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(load, 250)
  }, [load])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('kalender-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_exceptions' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, scheduleReload)
      .subscribe()
    // iPhone pausiert Apps im Hintergrund – beim Zurückkehren frisch laden
    const onVisible = () => document.visibilityState === 'visible' && scheduleReload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(reloadTimer.current)
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load, scheduleReload])

  return { data, loaded, loadError, reload: load }
}
