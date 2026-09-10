import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zvvjuhqxaefkfdawnhkt.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_9YcEPsNGssC2taZAvnQiKA_6oIESO7T'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const ADMIN_EMAIL = 'kunc.maxik@gmail.com'
