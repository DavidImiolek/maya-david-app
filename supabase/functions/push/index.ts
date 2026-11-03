// Edge Function "push": benachrichtigt den jeweils anderen, wenn etwas Neues eingetragen wurde.
// Wird von Datenbank-Triggern aufgerufen mit { table, id }.
//   table = 'events'          → neuer Termin (jedes Mal)
//   table = 'shopping_items'  → neuer Einkaufslisten-Eintrag (gebündelt: max. 1 Push / 10 Min.)
//
// Secrets (Supabase → Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase automatisch bereit.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const BASE = '/maya-david-app/'
const EINKAUF_PAUSE_MS = 10 * 60 * 1000

type Profile = { id: string; name: string; zuletzt_gesehen: string; letzter_einkauf_push: string | null }

function formatWhen(ev: { start_at: string; end_at: string | null; all_day: boolean }) {
  const s = new Date(ev.start_at)
  const day = s.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'numeric' })
  if (ev.all_day) return `${day} · ganztägig`
  const time = s.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}${ev.end_at ? '' : ' (Open End)'}`
}

// Zahl am App-Icon: alles Neue vom anderen seit dem letzten Öffnen der App
async function badgeFor(r: Profile) {
  const [a, b] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).neq('created_by', r.id).gt('created_at', r.zuletzt_gesehen),
    supabase.from('shopping_items').select('id', { count: 'exact', head: true }).neq('created_by', r.id).gt('created_at', r.zuletzt_gesehen),
  ])
  return (a.count ?? 0) + (b.count ?? 0)
}

async function sendTo(userId: string, payload: object) {
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId)
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24, urgency: 'high' },
      )
      sent++
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
      console.error('Push fehlgeschlagen', code, (err as Error).message)
    }
  }
  return sent
}

// Nur frische, noch nicht benachrichtigte Einträge – und jeden nur einmal.
// (Die Funktion ist ohne Login aufrufbar, kann so aber nichts Doppeltes oder Altes auslösen.)
async function claim(table: string, id: string) {
  const { data } = await supabase
    .from(table)
    .update({ benachrichtigt: true })
    .eq('id', id)
    .eq('benachrichtigt', false)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .select('*')
    .maybeSingle()
  return data
}

Deno.serve(async (req) => {
  try {
    const { table, id } = await req.json()
    if (!['events', 'shopping_items'].includes(table) || !id) return new Response('ungültig', { status: 400 })

    const row = await claim(table, id)
    if (!row) return new Response('nichts zu tun')

    const { data: profiles } = await supabase.from('profiles').select('id, name, zuletzt_gesehen, letzter_einkauf_push')
    const creator = (profiles ?? []).find((p) => p.id === row.created_by)
    const recipients = (profiles ?? []).filter((p) => p.id !== row.created_by) as Profile[]
    let sent = 0

    for (const r of recipients) {
      if (table === 'events') {
        const title = row.gemeinsam
          ? `${creator?.name} hat einen gemeinsamen Termin eingetragen`
          : row.owner_id === r.id
            ? `${creator?.name} hat dir einen Termin eingetragen`
            : `Neuer Termin von ${creator?.name}`
        sent += await sendTo(r.id, {
          title,
          body: `${row.title}${row.status === 'vielleicht' ? ' (vielleicht)' : ''}\n${formatWhen(row)}`,
          badge: await badgeFor(r),
          url: BASE + '#/kalender',
          tag: 'termin-' + row.id,
        })
      } else {
        // Bündeln: innerhalb von 10 Minuten nach der letzten Einkaufs-Nachricht keine neue
        if (r.letzter_einkauf_push && Date.now() - new Date(r.letzter_einkauf_push).getTime() < EINKAUF_PAUSE_MS) continue
        await supabase.from('profiles').update({ letzter_einkauf_push: new Date().toISOString() }).eq('id', r.id)
        sent += await sendTo(r.id, {
          title: `${creator?.name} hat etwas auf die Einkaufsliste gesetzt`,
          body: row.text,
          badge: await badgeFor(r),
          url: BASE + '#/einkauf',
          tag: 'einkauf',
        })
      }
    }
    return new Response(`gesendet: ${sent}`)
  } catch (err) {
    console.error(err)
    return new Response('Fehler: ' + (err as Error).message, { status: 500 })
  }
})
