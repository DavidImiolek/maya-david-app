// Farbe für gemeinsame Termine (David UND Maya): Pastell-Hellblau
export const GEMEINSAM_FARBE = '#A7C7E7'

// Farbe eines Termins: gemeinsam → Hellblau, sonst Farbe der Person
export function eventColor(ev, profilesById) {
  if (ev.gemeinsam) return GEMEINSAM_FARBE
  return profilesById[ev.owner_id]?.farbe || '#888888'
}
