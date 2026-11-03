import { supabase } from './supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

// Was ist auf diesem Gerät möglich?
export function pushStatus() {
  if (isIOS() && !isStandalone()) return 'ios-browser' // iPhone: geht nur in der Homescreen-App
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

function keyToBytes(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// Gerät für Push anmelden und das Abo in Supabase speichern
export async function subscribePush(userId) {
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

// Wird bei jedem Öffnen der App aufgerufen: rote Zahl weg, "zuletzt gesehen" merken
export async function markSeen(userId) {
  try { await navigator.clearAppBadge?.() } catch { /* nicht unterstützt */ }
  await supabase.from('profiles').update({ zuletzt_gesehen: new Date().toISOString() }).eq('id', userId)
}
