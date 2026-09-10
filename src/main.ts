import { supabase, ADMIN_EMAIL } from './supabase'
import './style.css'

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
}

const PLACEHOLDER_IMG = `${import.meta.env.BASE_URL}placeholder-tshirt.svg`

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="wrap">
    <header>
      <h1>Apalucha</h1>
      <p>Objednávejte na emailu <a href="mailto:info@blackfoxart.cz">info@blackfoxart.cz</a></p>
    </header>
    <main id="seasons"></main>
    <footer>
      <button class="link" id="admin-toggle" type="button">Admin</button>
      <div class="admin" id="admin-panel" hidden></div>
    </footer>
  </div>
`

const seasonsEl = document.querySelector<HTMLElement>('#seasons')!
const adminToggle = document.querySelector<HTMLButtonElement>('#admin-toggle')!
const adminPanel = document.querySelector<HTMLDivElement>('#admin-panel')!

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

async function loadGallery() {
  try {
    const [{ data: seasons, error: seasonsError }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase.from('seasons').select('id, year').order('year', { ascending: false }),
        supabase.from('merch_items').select('id, season_id, name, price_kc, image_url').order('created_at', { ascending: true }),
      ])

    if (seasonsError || itemsError) {
      seasonsEl.innerHTML = `<p>Nepodařilo se načíst data. Zkuste to prosím později.</p>`
      return
    }

    renderGallery(seasons ?? [], items ?? [])
  } catch {
    seasonsEl.innerHTML = `<p>Nepodařilo se načíst data. Zkuste to prosím později.</p>`
  }
}

function renderGallery(seasons: Season[], items: Item[]) {
  if (seasons.length === 0) {
    seasonsEl.innerHTML = `<p>Zatím žádné ročníky.</p>`
    return
  }

  seasonsEl.innerHTML = seasons
    .map((season) => {
      const seasonItems = items.filter((i) => i.season_id === season.id)
      const itemsHtml =
        seasonItems.length > 0
          ? `<div class="items">${seasonItems
              .map(
                (item) => `
                <article class="item">
                  <img src="${item.image_url ? escapeHtml(item.image_url) : PLACEHOLDER_IMG}" alt="${escapeHtml(item.name)}" loading="lazy" />
                  <p class="name">${escapeHtml(item.name)}</p>
                  <p class="price">${item.price_kc} KČ</p>
                </article>
              `
              )
              .join('')}</div>`
          : `<p class="empty">Merch pro tento ročník brzy přibude.</p>`

      return `
        <section class="season">
          <h2>${season.year}</h2>
          ${itemsHtml}
        </section>
      `
    })
    .join('')
}

// ---- Admin ----

let seasonsCache: Season[] = []

async function refreshSeasonsCache() {
  const { data } = await supabase.from('seasons').select('id, year').order('year', { ascending: false })
  seasonsCache = data ?? []
}

function renderLoginForm() {
  adminPanel.innerHTML = `
    <h3>Přihlášení správce</h3>
    <form id="login-form">
      <label>E-mail
        <input type="email" id="login-email" value="${ADMIN_EMAIL}" required />
      </label>
      <label>Heslo
        <input type="password" id="login-password" required />
      </label>
      <button type="submit">Přihlásit</button>
      <p class="msg" id="login-msg"></p>
    </form>
    <button class="link" id="forgot-password" type="button">Zapomenuté heslo?</button>
  `

  const form = document.querySelector<HTMLFormElement>('#login-form')!
  const msg = document.querySelector<HTMLParagraphElement>('#login-msg')!

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = (document.querySelector<HTMLInputElement>('#login-email')!).value
    const password = (document.querySelector<HTMLInputElement>('#login-password')!).value
    msg.textContent = 'Přihlašuji...'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    msg.textContent = error ? 'Přihlášení se nezdařilo.' : ''
  })

  document.querySelector<HTMLButtonElement>('#forgot-password')!.addEventListener('click', async () => {
    const email = (document.querySelector<HTMLInputElement>('#login-email')!).value || ADMIN_EMAIL
    msg.textContent = 'Odesílám odkaz pro obnovení hesla...'
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    msg.textContent = error ? 'Nepodařilo se odeslat e-mail.' : 'E-mail s odkazem byl odeslán.'
  })
}

async function renderAdminForms() {
  await refreshSeasonsCache()

  adminPanel.innerHTML = `
    <p class="status">Přihlášen jako správce.</p>
    <button class="link" id="logout" type="button">Odhlásit</button>

    <h3>Přidat ročník</h3>
    <form id="season-form">
      <label>Rok
        <input type="number" id="season-year" min="1900" max="2999" required />
      </label>
      <button type="submit">Přidat ročník</button>
      <p class="msg" id="season-msg"></p>
    </form>

    <h3>Přidat kousek merche</h3>
    <form id="item-form">
      <label>Ročník
        <select id="item-season" required>
          ${seasonsCache.map((s) => `<option value="${s.id}">${s.year}</option>`).join('')}
        </select>
      </label>
      <label>Název
        <input type="text" id="item-name" required placeholder="Černé triko" />
      </label>
      <label>Cena (Kč)
        <input type="number" id="item-price" min="0" required placeholder="400" />
      </label>
      <label>Obrázek (volitelně)
        <input type="file" id="item-image" accept="image/*" />
      </label>
      <button type="submit">Přidat kousek</button>
      <p class="msg" id="item-msg"></p>
    </form>
  `

  document.querySelector<HTMLButtonElement>('#logout')!.addEventListener('click', async () => {
    await supabase.auth.signOut()
  })

  document.querySelector<HTMLFormElement>('#season-form')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const msg = document.querySelector<HTMLParagraphElement>('#season-msg')!
    const yearInput = document.querySelector<HTMLInputElement>('#season-year')!
    const year = parseInt(yearInput.value, 10)
    msg.textContent = 'Ukládám...'
    const { error } = await supabase.from('seasons').insert({ year })
    if (error) {
      msg.textContent = 'Nepodařilo se přidat ročník.'
    } else {
      msg.textContent = 'Ročník přidán.'
      yearInput.value = ''
      await renderAdminForms()
      await loadGallery()
    }
  })

  document.querySelector<HTMLFormElement>('#item-form')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const msg = document.querySelector<HTMLParagraphElement>('#item-msg')!
    const seasonId = (document.querySelector<HTMLSelectElement>('#item-season')!).value
    const nameInput = document.querySelector<HTMLInputElement>('#item-name')!
    const priceInput = document.querySelector<HTMLInputElement>('#item-price')!
    const fileInput = document.querySelector<HTMLInputElement>('#item-image')!
    const name = nameInput.value.trim()
    const price = parseInt(priceInput.value, 10)
    const file = fileInput.files?.[0]

    msg.textContent = 'Ukládám...'

    let imageUrl: string | null = null
    if (file) {
      const path = `${seasonId}/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('merch-images').upload(path, file)
      if (uploadError) {
        msg.textContent = 'Nepodařilo se nahrát obrázek.'
        return
      }
      imageUrl = supabase.storage.from('merch-images').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase
      .from('merch_items')
      .insert({ season_id: seasonId, name, price_kc: price, image_url: imageUrl })

    if (error) {
      msg.textContent = 'Nepodařilo se přidat kousek.'
    } else {
      msg.textContent = 'Kousek přidán.'
      nameInput.value = ''
      priceInput.value = ''
      fileInput.value = ''
      await loadGallery()
    }
  })
}

adminToggle.addEventListener('click', () => {
  adminPanel.hidden = !adminPanel.hidden
})

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    renderAdminForms()
  } else {
    renderLoginForm()
  }
})

supabase.auth
  .getSession()
  .then(({ data }) => {
    if (data.session) {
      renderAdminForms()
    } else {
      renderLoginForm()
    }
  })
  .catch(() => renderLoginForm())

loadGallery()
