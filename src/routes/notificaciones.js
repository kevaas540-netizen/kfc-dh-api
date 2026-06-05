// src/routes/notificaciones.js
// ============================================================
// Gestión de notificaciones
// ============================================================

const express  = require('express')
const supabase = require('../config/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ── GET /api/notificaciones ────────────────────────────────────
// Filtros: destinatario_tipo, leida, restaurante_id, usuario_dh_id
router.get('/', requireAuth, async (req, res) => {
  try {
    const { destinatario_tipo, leida, restaurante_id, usuario_dh_id } = req.query

    let query = supabase
      .from('notificaciones')
      .select('*')
      .order('creado_at', { ascending: false })

    if (destinatario_tipo) query = query.eq('destinatario_tipo', destinatario_tipo)
    if (leida !== undefined) query = query.eq('leida', leida === 'true')
    if (restaurante_id)    query = query.eq('restaurante_id', restaurante_id)
    if (usuario_dh_id)     query = query.eq('usuario_dh_id', usuario_dh_id)

    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── PATCH /api/notificaciones/:id/leer ───────────────────────
// Marcar una notificación como leída
router.patch('/:id/leer', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    if (!data)  return res.status(404).json({ error: 'Notificación no encontrada' })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── PATCH /api/notificaciones/leer-todas ─────────────────────
// Marcar todas las notificaciones del usuario actual como leídas
router.patch('/leer-todas', requireAuth, async (req, res) => {
  try {
    const { role, profileId } = req.user

    let query = supabase
      .from('notificaciones')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('leida', false)

    if (role === 'restaurante') {
      query = query.eq('restaurante_id', profileId).eq('destinatario_tipo', 'restaurante')
    } else if (role === 'dh') {
      query = query.eq('usuario_dh_id', profileId).eq('destinatario_tipo', 'dh')
    } else if (role === 'admin') {
      query = query.eq('destinatario_tipo', 'admin')
    }

    const { data, error } = await query

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data: data || [], mensaje: 'Notificaciones marcadas como leídas' })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

module.exports = router
