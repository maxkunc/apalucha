import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase, ADMIN_EMAIL } from './supabase'

interface Season {
  id: string
  year: number
}

const fieldLabel = 'flex flex-col gap-1 text-xs font-bold uppercase tracking-wide'
const textInput =
  'border-2 border-black px-3 py-2 text-base font-normal normal-case tracking-normal bg-white focus:outline-2 focus:outline-black'
const primaryButton =
  'self-start bg-black text-white px-5 py-3 text-sm font-bold uppercase tracking-wide hover:opacity-75'
const linkButton = 'text-sm text-gray-400 underline hover:text-black'

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
    <div className="max-w-md mx-auto px-5 py-12 sm:py-16">
      <a
        href={import.meta.env.BASE_URL}
        className="inline-block text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black mb-10"
      >
        ← Zpět na web
      </a>
      <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-10">Správa</h1>
      {signedIn === null && <p className="text-gray-500 text-sm">Načítám...</p>}
      {signedIn === false && <LoginForm />}
      {signedIn === true && <AdminForms />}
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
    setMsg(error ? 'Přihlášení se nezdařilo.' : '')
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
  const [seasonYear, setSeasonYear] = useState('')
  const [seasonMsg, setSeasonMsg] = useState('')

  const [itemSeasonId, setItemSeasonId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemMsg, setItemMsg] = useState('')
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  async function refreshSeasons() {
    const { data } = await supabase.from('seasons').select('id, year').order('year', { ascending: false })
    setSeasons(data ?? [])
    setItemSeasonId((current) => current || (data && data[0]?.id) || '')
  }

  useEffect(() => {
    refreshSeasons()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleAddSeason(e: FormEvent) {
    e.preventDefault()
    setSeasonMsg('Ukládám...')
    const { error } = await supabase.from('seasons').insert({ year: parseInt(seasonYear, 10) })
    if (error) {
      setSeasonMsg('Nepodařilo se přidat ročník.')
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
    } catch {
      setItemMsg('Nepodařilo se přidat kousek.')
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
                {s.year}
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
    </div>
  )
}
