// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js')

function normalizeSupabaseUrl(url = '') {
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY || serviceRoleKey

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, clientOptions)
const supabaseAuth = createClient(supabaseUrl, anonKey, clientOptions)

module.exports = supabaseAdmin
module.exports.authClient = supabaseAuth
module.exports.supabaseAdmin = supabaseAdmin
module.exports.supabaseUrl = supabaseUrl
