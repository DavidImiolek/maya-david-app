# Maya & David – geteilter Kalender

PWA (Web-App fürs iPhone) mit React, Vite, FullCalendar und Supabase.
Die Spezifikation liegt im claude.ai-Projekt „Maya David App“.

## Aufbau
| Ordner/Datei | Inhalt |
|---|---|
| `supabase/01_datenbank.sql` | Datenbank: Tabellen, Regeln, Berechtigungen (einmalig im Supabase SQL Editor ausgeführt) |
| `src/components/` | Die Screens: Login, Kalender, Termin-Formular, Termin-Details |
| `src/lib/recurrence.js` | Berechnung der Wiederholungen (RRULE) |
| `src/lib/supabase.js` | Verbindung zu Supabase |
| `public/` | App-Icons |
| `.env.example` | Vorlage für die Zugangsdaten |

## Zugangsdaten
Stehen in `.env.production` (Project URL + publishable key). Beide sind öffentlich und dürfen ins Repo.
**Niemals** den secret/service_role key eintragen.

## Veröffentlichen (GitHub Pages)
Online unter: https://davidimiolek.github.io/maya-david-app/

Einmalig: Auf GitHub im Repo → Settings → Pages → Source: **GitHub Actions**.

Bei jeder Änderung (PowerShell in diesem Ordner):
```
git add .
git commit -m "Was geändert wurde"
git push
```
GitHub baut die App dann automatisch neu (Tab „Actions“, ca. 1 Minute).

Am iPhone: Adresse in **Safari** öffnen → Teilen → „Zum Home-Bildschirm“.

## Lokal starten (optional, braucht Node.js)
```
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev
npm test                     # testet die Wiederholungslogik
```
