// src/routes/tareas.js
// ============================================================
// CRUD de tareas_semanales + fotos
// ============================================================

const express  = require('express')
const supabase = require('../config/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ── GET /api/tareas ──────────────────────────────────────────
// Filtros: restaurante_id, tipo, fecha_semana
router.get('/', requireAuth, async (req, res) => {
  try {
    const { restaurante_id, tipo, fecha_semana } = req.query

    let query = supabase
      .from('tareas_semanales')
      .select('*, restaurantes(nombre)')
      .order('fecha_semana', { ascending: false })

    if (restaurante_id)  query = query.eq('restaurante_id', restaurante_id)
    if (tipo)            query = query.eq('tipo', tipo)
    if (fecha_semana)    query = query.eq('fecha_semana', fecha_semana)

    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── POST /api/tareas ─────────────────────────────────────────
// Crear o actualizar (upsert) con onConflict en restaurante_id,tipo,fecha_semana
router.post('/', requireAuth, async (req, res) => {
  try {
    const { restaurante_id, tipo, fecha_semana, completada } = req.body

    if (!restaurante_id || !tipo || !fecha_semana) {
      return res.status(400).json({ error: 'restaurante_id, tipo y fecha_semana son requeridos' })
    }

    const { data, error } = await supabase
      .from('tareas_semanales')
      .upsert({
        restaurante_id,
        tipo,
        fecha_semana,
        completada: completada || false,
      }, { onConflict: 'restaurante_id,tipo,fecha_semana' })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── PATCH /api/tareas/:id/completar ──────────────────────────
// Marcar completada = true
router.patch('/:id/completar', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tareas_semanales')
      .update({ completada: true })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    if (!data)  return res.status(404).json({ error: 'Tarea no encontrada' })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── GET /api/tareas/:id/fotos ─────────────────────────────────
// Obtener fotos de la tabla tareas_fotos
router.get('/:id/fotos', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tareas_fotos')
      .select('*')
      .eq('tarea_id', req.params.id)
      .order('creado_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── POST /api/tareas/:id/fotos ─────────────────────────────────
// Insertar una foto en tareas_fotos
router.post('/:id/fotos', requireAuth, async (req, res) => {
  try {
    const { foto_url, restaurante_id } = req.body
    if (!foto_url || !restaurante_id) {
      return res.status(400).json({ error: 'foto_url y restaurante_id son requeridos' })
    }

    const { data, error } = await supabase
      .from('tareas_fotos')
      .insert({
        tarea_id: req.params.id,
        foto_url,
        restaurante_id,
      })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── DELETE /api/tareas/:tareaId/fotos/:fotoId ─────────────────
// Borrar una foto de tareas_fotos
router.delete('/:tareaId/fotos/:fotoId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('tareas_fotos')
      .delete()
      .eq('id', req.params.fotoId)
      .eq('tarea_id', req.params.tareaId)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, mensaje: 'Foto eliminada correctamente' })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

module.exports = router
