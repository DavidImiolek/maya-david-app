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

## Neues Feature hinzufügen
1. Neue Seite anlegen, z. B. `src/components/EinkaufPage.jsx` (bekommt `session` als Prop, Zurück-Link: `<a href="#/">‹ Start</a>`).
2. In `src/features.js` einen Eintrag ergänzen (id, title, icon, color, Page, optional Tile).
3. Falls Daten gespeichert werden: neue SQL-Datei in `supabase/` (Tabelle + Row Level Security), im SQL Editor ausführen.
Die Kachel auf der Startseite und die Adresse `#/<id>` entstehen automatisch.
