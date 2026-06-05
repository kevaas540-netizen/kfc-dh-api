// src/routes/restaurantes.js
const express  = require('express')
const supabase = require('../config/supabase')
const { requireAuth, requireDH, requireAdmin } = require('../middleware/auth')

const router = express.Router()

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
    const { auth_user_id, nombre, correo, zona, area_id } = req.body

    if (!auth_user_id || !nombre || !correo) {
      return res.status(400).json({ error: 'auth_user_id, nombre y correo son requeridos' })
    }

    const { data, error } = await supabase
      .from('restaurantes')
      .insert({ auth_user_id, nombre, correo, zona, area_id })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
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

module.exports = router
