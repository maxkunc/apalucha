import { useEffect, useState } from 'react'
import { supabase } from './supabase'

interface Season {
  id: string
  year: number
}

interface Item {
  id: string
  season_id: string
  name: string
  price_kc: number
  image_url: string | null
  image_back_url: string | null
}

const PLACEHOLDER_IMG = `${import.meta.env.BASE_URL}placeholder-tshirt-black.png`

export default function App() {
  const [seasons, setSeasons] = useState<Season[] | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [
          { data: seasonsData, error: seasonsError },
          { data: itemsData, error: itemsError },
        ] = await Promise.all([
          supabase.from('seasons').select('id, year').order('year', { ascending: false }),
          supabase
            .from('merch_items')
            .select('id, season_id, name, price_kc, image_url, image_back_url')
            .order('created_at', { ascending: true }),
        ])

        if (cancelled) return

        if (seasonsError || itemsError) {
          setError(true)
          return
        }

        setSeasons(seasonsData ?? [])
        setItems(itemsData ?? [])
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-5 py-12 sm:py-16 text-center">
      <header>
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-black uppercase tracking-tighter leading-none">
          Apalucha
        </h1>
        <p className="mt-5 mb-16 text-gray-600 text-base sm:text-lg">
          Objednávejte na emailu{' '}
          <a href="mailto:info@blackfoxart.cz" className="font-bold text-black">
            info@blackfoxart.cz
          </a>
        </p>
      </header>

      <main>
        {error && <p>Nepodařilo se načíst data. Zkuste to prosím později.</p>}
        {!error && seasons === null && <p className="text-gray-500">Načítám...</p>}
        {!error && seasons?.length === 0 && <p>Zatím žádné ročníky.</p>}
        {!error &&
          seasons?.map((season) => {
            const seasonItems = items.filter((i) => i.season_id === season.id)
            return (
              <section key={season.id} className="mt-16 pt-8 border-t-2 border-black">
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-10">
                  {season.year}
                </h2>
                {seasonItems.length === 0 ? (
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Merch pro tento ročník brzy přibude.
                  </p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-x-16 gap-y-10">
                    {seasonItems.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-center gap-4">
                        <img
                          src={item.image_url || PLACEHOLDER_IMG}
                          alt={`${item.name} – přední strana`}
                          loading="lazy"
                          className="w-24 sm:w-28 aspect-square object-contain"
                        />
                        <div className="min-w-[92px]">
                          <p className="text-sm font-bold uppercase tracking-wide">{item.name}</p>
                          <p className="text-sm font-semibold text-gray-600">{item.price_kc} KČ</p>
                        </div>
                        <img
                          src={item.image_back_url || item.image_url || PLACEHOLDER_IMG}
                          alt={`${item.name} – zadní strana`}
                          loading="lazy"
                          className="w-24 sm:w-28 aspect-square object-contain"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
      </main>

      <footer className="mt-20 pt-6 border-t border-gray-200">
        <a
          href={`${import.meta.env.BASE_URL}admin/`}
          className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black"
        >
          Admin
        </a>
      </footer>
    </div>
  )
}
