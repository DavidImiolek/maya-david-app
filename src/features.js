// ==============================================================
// Alle Features der App an EINER Stelle.
// Neues Feature = neuer Eintrag hier + eigene Seite. Sonst nichts.
// ==============================================================
import CalendarPage from './components/CalendarPage.jsx'
import CalendarTile from './components/CalendarTile.jsx'

export const FEATURES = [
  {
    id: 'kalender',          // Adresse: #/kalender
    title: 'Kalender',
    icon: '🗓️',
    color: '#1D9E75',
    Page: CalendarPage,      // die eigentliche Seite
    Tile: CalendarTile,      // optional: Live-Info auf der Kachel
  },
]
