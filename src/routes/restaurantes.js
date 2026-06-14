// src/routes/restaurantes.js
const express  = require('express')
const supabase = require('../config/supabase')
const { requireAuth, requireDH, requireAdmin } = require('../middleware/auth')

const router = express.Router()

async function createAuthUser(email, password) {
  const tempPassword = password || process.env.DEFAULT_TEMP_PASSWORD || 'Kfc123456!'
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (error) {
    error.statusCode = 400
    throw error
  }
  return data.user.id
}

// ── GET /api/restaurantes ────────────────────────────────────
// DH ve los de sus áreas, Admin ve todos
router.get('/', requireAuth, requireDH, async (req, res) => {
  try {
    const { role, profileId } = req.user

    let data, error

    if (role === 'admin') {
      // Admin ve todos
      ;({ data, error } = await supabase
        .from('restaurantes')
        .select('*, areas(nombre)')
        .eq('activo', true)
        .order('nombre'))
    } else {
      // DH ve los de sus áreas + individuales
      ;({ data, error } = await supabase
        .from('dh_restaurantes_vista')
        .select('*')
        .eq('usuario_dh_id', profileId)
        .order('restaurante_nombre'))
    }

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── GET /api/restaurantes/:id ────────────────────────────────
router.get('/:id', requireAuth, requireDH, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('restaurantes')
      .select('*, areas(nombre)')
      .eq('id', req.params.id)
      .single()

    if (error) return res.status(404).json({ error: 'Restaurante no encontrado' })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── POST /api/restaurantes ───────────────────────────────────
// Solo admin puede crear
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { auth_user_id, nombre, correo, zona, area_id, password } = req.body

    if (!nombre || !correo) {
      return res.status(400).json({ error: 'nombre y correo son requeridos' })
    }

    const authUserId = auth_user_id || await createAuthUser(correo, password)

    const { data, error } = await supabase
      .from('restaurantes')
      .insert({ auth_user_id: authUserId, nombre, correo, zona, area_id: area_id || null })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Error interno' })
  }
})

// ── PUT /api/restaurantes/:id ────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, zona, area_id, activo } = req.body

    const { data, error } = await supabase
      .from('restaurantes')
      .update({ nombre, zona, area_id, activo })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── DELETE /api/restaurantes/:id ──────────────────────────────
// Borrado lógico para conservar historial de juntas, propinas y tareas.
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('restaurantes')
      .update({ activo: false })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Restaurante no encontrado' })
    res.json({ data, mensaje: 'Restaurante eliminado correctamente' })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

module.exports = router
