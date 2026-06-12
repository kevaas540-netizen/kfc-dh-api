// src/routes/auth.js
const express  = require('express')
const jwt      = require('jsonwebtoken')
const supabase = require('../config/supabase')
const { authClient } = require('../config/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ── POST /api/auth/login ─────────────────────────────────────
// Body: { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password requeridos' })
    }

    // Autenticar con Supabase Auth
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email, password,
    })

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const userId = authData.user.id

    // Detectar rol
    let role    = null
    let profile = null

    // ¿Es admin?
    const { data: admin } = await supabase
      .from('administradores')
      .select('*')
      .eq('auth_user_id', userId)
      .eq('activo', true)
      .maybeSingle()

    if (admin) { role = 'admin'; profile = admin }

    // ¿Es DH?
    if (!role) {
      const { data: dh } = await supabase
        .from('usuarios_dh')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('activo', true)
        .maybeSingle()

      if (dh) { role = 'dh'; profile = dh }
    }

    // ¿Es restaurante?
    if (!role) {
      const { data: restaurante } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('activo', true)
        .maybeSingle()

      if (restaurante) { role = 'restaurante'; profile = restaurante }
    }

    if (!role) {
      return res.status(403).json({ error: 'Usuario no autorizado en esta aplicación' })
    }

    // Generar JWT propio
    const token = jwt.sign(
      {
        sub:     userId,
        role,
        profileId: profile.id,
        email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return res.json({
      token,
      role,
      profile,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })

  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { role, profileId } = req.user
    const tabla = role === 'admin' ? 'administradores'
                : role === 'dh'    ? 'usuarios_dh'
                : 'restaurantes'

    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq('id', profileId)
      .single()

    if (error) return res.status(404).json({ error: 'Perfil no encontrado' })

    res.json({ role, profile: data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  // JWT es stateless — el cliente simplemente elimina el token
  res.json({ ok: true, mensaje: 'Sesión cerrada' })
})

module.exports = router
