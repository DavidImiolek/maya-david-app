import { useShoppingData } from '../lib/useShoppingData.js'

// Kurzinfo auf der Einkaufs-Kachel
export default function EinkaufTile() {
  const { items, loaded } = useShoppingData()
  if (!loaded) return <p className="tile-sub">Lädt …</p>
  const open = items.filter((i) => !i.erledigt)
  return (
    <>
      <p className="tile-sub">{open.length === 0 ? 'Alles da' : open.length === 1 ? '1 Sache offen' : `${open.length} Sachen offen`}</p>
      {open.length > 0 && <p className="tile-next">{open.slice(0, 3).map((i) => i.text).join(', ')}{open.length > 3 ? ' …' : ''}</p>}
    </>
  )
}
