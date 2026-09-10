import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase, ADMIN_EMAIL } from './supabase'
import { seasonLabel, sortSeasons, TERM_LABEL, type Season } from './seasons'

interface Item {
  id: string
  season_id: string
  name: string
  price_kc: number
  image_url: string | null
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return 'neznámá chyba'
}

const fieldLabel = 'flex flex-col gap-1 text-xs font-bold uppercase tracking-wide'
const textInput =
  'border-2 border-black px-3 py-2 text-base font-normal normal-case tracking-normal bg-white focus:outline-2 focus:outline-black'
const primaryButton =
  'self-start bg-black text-white px-5 py-3 text-sm font-bold uppercase tracking-wide hover:opacity-75 transition-opacity'
const linkButton = 'text-sm text-gray-400 underline hover:text-black transition-colors'

export default function Admin() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(!!data.session))
      .catch(() => setSignedIn(false))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-dvh w-full flex justify-center px-6 py-14 sm:py-20">
      <div className="w-full max-w-md">
        <a
          href={import.meta.env.BASE_URL}
          className="inline-block text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-10"
        >
          ← Zpět na web
        </a>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-10">Správa</h1>
        {signedIn === null && <p className="text-gray-500 text-sm">Načítám...</p>}
        {signedIn === false && <LoginForm />}
        {signedIn === true && <AdminForms />}
      </div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg('Přihlašuji...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMsg(error ? `Přihlášení se nezdařilo: ${errorMessage(error)}` : '')
  }

  async function handleForgot() {
    setMsg('Odesílám odkaz pro obnovení hesla...')
    const { error } = await supabase.auth.resetPasswordForEmail(email || ADMIN_EMAIL)
    setMsg(error ? 'Nepodařilo se odeslat e-mail.' : 'E-mail s odkazem byl odeslán.')
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={fieldLabel}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={textInput}
          />
        </label>
        <label className={fieldLabel}>
          Heslo
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={textInput}
          />
        </label>
        <button type="submit" className={primaryButton}>
          Přihlásit
        </button>
        <p className="text-sm text-gray-600 min-h-[1.2em]">{msg}</p>
      </form>
      <button type="button" onClick={handleForgot} className={`mt-2 ${linkButton}`}>
        Zapomenuté heslo?
      </button>
    </div>
  )
}

function AdminForms() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loaded, setLoaded] = useState(false)
  const [seasonYear, setSeasonYear] = useState('')
  const [seasonTerm, setSeasonTerm] = useState<'jaro' | 'podzim'>('jaro')
  const [seasonMsg, setSeasonMsg] = useState('')

  const [itemSeasonId, setItemSeasonId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemMsg, setItemMsg] = useState('')
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  async function refreshSeasons() {
    const { data } = await supabase.from('seasons').select('id, year, term').order('year', { ascending: false })
    const sorted = sortSeasons(data ?? [])
    setSeasons(sorted)
    setItemSeasonId((current) => current || sorted[0]?.id || '')
  }

  async function refreshItems() {
    const { data } = await supabase
      .from('merch_items')
      .select('id, season_id, name, price_kc, image_url')
      .order('created_at', { ascending: true })
    setItems(data ?? [])
  }

  useEffect(() => {
    Promise.all([refreshSeasons(), refreshItems()]).then(() => setLoaded(true))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleAddSeason(e: FormEvent) {
    e.preventDefault()
    setSeasonMsg('Ukládám...')
    const { error } = await supabase
      .from('seasons')
      .insert({ year: parseInt(seasonYear, 10), term: seasonTerm })
    if (error) {
      setSeasonMsg(`Nepodařilo se přidat ročník: ${errorMessage(error)}`)
    } else {
      setSeasonMsg('Ročník přidán.')
      setSeasonYear('')
      await refreshSeasons()
    }
  }

  async function uploadImage(file: File, seasonId: string) {
    const path = `${seasonId}/${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('merch-images').upload(path, file)
    if (error) throw error
    return supabase.storage.from('merch-images').getPublicUrl(path).data.publicUrl
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault()

    if (!itemSeasonId) {
      setItemMsg('Nejprve vytvořte ročník výše.')
      return
    }

    setItemMsg('Ukládám...')
    try {
      const frontFile = frontRef.current?.files?.[0] ?? null
      const backFile = backRef.current?.files?.[0] ?? null
      const image_url = frontFile ? await uploadImage(frontFile, itemSeasonId) : null
      const image_back_url = backFile ? await uploadImage(backFile, itemSeasonId) : null

      const { error } = await supabase.from('merch_items').insert({
        season_id: itemSeasonId,
        name: itemName.trim(),
        price_kc: parseInt(itemPrice, 10),
        image_url,
        image_back_url,
      })
      if (error) throw error

      setItemMsg('Kousek přidán.')
      setItemName('')
      setItemPrice('')
      if (frontRef.current) frontRef.current.value = ''
      if (backRef.current) backRef.current.value = ''
      await refreshItems()
    } catch (err) {
      setItemMsg(`Nepodařilo se přidat kousek: ${errorMessage(err)}`)
    }
  }

  return (
    <div>
      <p className="text-sm font-bold mb-2">Přihlášen jako správce.</p>
      <button type="button" onClick={handleLogout} className={linkButton}>
        Odhlásit
      </button>

      <h2 className="text-sm font-bold uppercase tracking-wide mt-10 mb-4">Přidat ročník</h2>
      <form onSubmit={handleAddSeason} className="flex flex-col gap-4">
        <label className={fieldLabel}>
          Rok
          <input
            type="number"
            min={1900}
            max={2999}
            value={seasonYear}
            onChange={(e) => setSeasonYear(e.target.value)}
            required
            className={textInput}
          />
        </label>
        <fieldset className={fieldLabel}>
          Termín
          <div className="flex gap-4 mt-1">
            {(['jaro', 'podzim'] as const).map((term) => (
              <label key={term} className="flex items-center gap-2 text-sm font-normal normal-case tracking-normal">
                <input
                  type="radio"
                  name="term"
                  value={term}
                  checked={seasonTerm === term}
                  onChange={() => setSeasonTerm(term)}
                />
                {TERM_LABEL[term]}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className={primaryButton}>
          Přidat ročník
        </button>
        <p className="text-sm text-gray-600 min-h-[1.2em]">{seasonMsg}</p>
      </form>

      <h2 className="text-sm font-bold uppercase tracking-wide mt-10 mb-4">Přidat kousek merche</h2>
      <form onSubmit={handleAddItem} className="flex flex-col gap-4">
        <label className={fieldLabel}>
          Ročník
          <select
            value={itemSeasonId}
            onChange={(e) => setItemSeasonId(e.target.value)}
            required
            className={textInput}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {seasonLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          Název
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
            placeholder="Černé triko"
            className={textInput}
          />
        </label>
        <label className={fieldLabel}>
          Cena (Kč)
          <input
            type="number"
            min={0}
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            required
            placeholder="400"
            className={textInput}
          />
        </label>
        <label className={fieldLabel}>
          Obrázek – přední strana (volitelně)
          <input ref={frontRef} type="file" accept="image/*" className="text-sm font-normal normal-case tracking-normal" />
        </label>
        <label className={fieldLabel}>
          Obrázek – zadní strana (volitelně)
          <input ref={backRef} type="file" accept="image/*" className="text-sm font-normal normal-case tracking-normal" />
        </label>
        <button type="submit" className={primaryButton}>
          Přidat kousek
        </button>
        <p className="text-sm text-gray-600 min-h-[1.2em]">{itemMsg}</p>
      </form>

      <h2 className="text-sm font-bold uppercase tracking-wide mt-10 mb-4">Přehled sezón</h2>
      {loaded && seasons.length === 0 && <p className="text-sm text-gray-500">Zatím žádné ročníky.</p>}
      <div className="flex flex-col gap-8">
        {seasons.map((season) => {
          const seasonItems = items.filter((i) => i.season_id === season.id)
          return (
            <div key={season.id}>
              <p className="text-base font-bold mb-2">{seasonLabel(season)}</p>
              {seasonItems.length === 0 ? (
                <p className="text-sm text-gray-400">Bez kousků.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {seasonItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 text-sm">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-10 h-10 object-contain" />
                      ) : (
                        <span className="w-10 h-10" />
                      )}
                      <span className="flex-1">{item.name}</span>
                      <span className="text-gray-600">{item.price_kc} KČ</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
