// Service Worker: läuft im Hintergrund – auch wenn die App geschlossen ist.
// 1) hält die App offline verfügbar  2) empfängt Push-Nachrichten  3) setzt die Zahl am Icon
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const scope = self.registration.scope
  const jobs = [
    // WICHTIG fürs iPhone: Jede Push-Nachricht MUSS sichtbar angezeigt werden,
    // sonst entzieht iOS der App nach wenigen Malen die Berechtigung.
    self.registration.showNotification(data.title || 'Maya & David', {
      body: data.body || '',
      icon: scope + 'icon-192.png',
      badge: scope + 'icon-192.png',
      tag: data.tag,
      data: { url: data.url || scope },
    }),
  ]
  if (data.badge && self.navigator.setAppBadge) {
    jobs.push(self.navigator.setAppBadge(data.badge).catch(() => {}))
  }
  event.waitUntil(Promise.all(jobs))
})

// Tippen auf die Benachrichtigung → App an der passenden Stelle öffnen
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || self.registration.scope, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(url).catch(() => {})
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
