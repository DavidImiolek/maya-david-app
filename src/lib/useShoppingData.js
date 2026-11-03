import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

// Lädt die Einkaufsliste und hält sie per Realtime aktuell.
export function useShoppingData() {
  const [items, setItems] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const timer = useRef(null)

  const load = useCallback(async () => {
    const [i, p] = await Promise.all([
      supabase.from('shopping_items').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, farbe'),
    ])
    if (i.error || p.error) {
      setLoadError('Liste konnte nicht geladen werden: ' + (i.error || p.error).message)
      return
    }
    setLoadError('')
    setItems(i.data)
    setProfiles(p.data)
    setLoaded(true)
  }, [])

  const scheduleReload = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(load, 200)
  }, [load])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('einkauf-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, scheduleReload)
      .subscribe()
    const onVisible = () => document.visibilityState === 'visible' && scheduleReload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer.current)
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load, scheduleReload])

  return { items, setItems, profiles, loaded, loadError, reload: load }
}
