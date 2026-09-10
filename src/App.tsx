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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

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
    <div
      className={`min-h-dvh w-full flex flex-col px-6 sm:px-12 lg:px-20 xl:px-32 py-14 sm:py-20 text-center transition-all duration-700 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <header>
        <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black uppercase tracking-tighter leading-none">
          Apalucha
        </h1>
        <p className="mt-5 mb-20 sm:mb-28 text-gray-600 text-base sm:text-lg">
          Objednávejte na emailu{' '}
          <a href="mailto:info@blackfoxart.cz" className="font-bold text-black hover:opacity-60 transition-opacity">
            info@blackfoxart.cz
          </a>
        </p>
      </header>

      <main className="flex-1">
        {error && <p>Nepodařilo se načíst data. Zkuste to prosím později.</p>}
        {!error && seasons === null && <p className="text-gray-500">Načítám...</p>}
        {!error && seasons?.length === 0 && <p>Zatím žádné ročníky.</p>}
        {!error &&
          seasons?.map((season, index) => {
            const seasonItems = items.filter((i) => i.season_id === season.id)
            return (
              <section key={season.id} className={index === 0 ? '' : 'mt-28 sm:mt-36'}>
                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight mb-12 sm:mb-16">
                  {season.year}
                </h2>
                {seasonItems.length === 0 ? (
                  <p className="text-sm uppercase tracking-wide text-gray-400">
                    Merch pro tento ročník brzy přibude.
                  </p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-x-16 lg:gap-x-24 gap-y-20">
                    {seasonItems.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                        <img
                          src={item.image_url || PLACEHOLDER_IMG}
                          alt={`${item.name} – přední strana`}
                          loading="lazy"
                          className="w-56 sm:w-72 md:w-80 lg:w-96 aspect-square object-contain transition-transform duration-300 hover:scale-105"
                        />
                        <div className="min-w-[110px]">
                          <p className="text-base sm:text-lg font-bold uppercase tracking-wide">{item.name}</p>
                          <p className="text-base sm:text-lg font-semibold text-gray-600">{item.price_kc} KČ</p>
                        </div>
                        <img
                          src={item.image_back_url || item.image_url || PLACEHOLDER_IMG}
                          alt={`${item.name} – zadní strana`}
                          loading="lazy"
                          className="w-56 sm:w-72 md:w-80 lg:w-96 aspect-square object-contain transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
      </main>

      <footer className="mt-28 sm:mt-36">
        <a
          href={`${import.meta.env.BASE_URL}admin/`}
          className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
        >
          Admin
        </a>
      </footer>
    </div>
  )
}
