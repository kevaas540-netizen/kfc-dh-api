// src/routes/juntas.js
const express  = require('express')
const supabase = require('../config/supabase')
const { requireAuth, requireDH } = require('../middleware/auth')
const router = express.Router()

// GET /api/juntas?restaurante_id=xxx&mes=6&anio=2026
router.get('/', requireAuth, async (req, res) => {
  try {
    const { restaurante_id, mes, anio } = req.query
    let query = supabase
      .from('juntas_periodo')
      .select('*, restaurantes(nombre, zona)')
      .order('fecha', { ascending: false })

    if (restaurante_id) query = query.eq('restaurante_id', restaurante_id)
    if (mes)           query = query.eq('mes', mes)
    if (anio)          query = query.eq('anio', anio)

    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// POST /api/juntas — crear junta
router.post('/', requireAuth, async (req, res) => {
  try {
    const { restaurante_id, fecha, hora, lugar } = req.body
    if (!restaurante_id || !fecha || !hora || !lugar) {
      return res.status(400).json({ error: 'restaurante_id, fecha, hora y lugar son requeridos' })
    }

    const fechaObj = new Date(`${fecha}T00:00:00`)
    const mes  = fechaObj.getMonth() + 1
    const anio = fechaObj.getFullYear()

    const { data, error } = await supabase
      .from('juntas_periodo')
      .insert({ restaurante_id, fecha, hora, lugar, mes, anio, estado: 'pendiente' })
      .select().single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// PATCH /api/juntas/:id/foto — subir foto de evidencia
router.patch('/:id/foto', requireAuth, async (req, res) => {
  try {
    const { foto_url } = req.body
    const { data, error } = await supabase
      .from('juntas_periodo')
      .update({ foto_evidencia: foto_url, foto_subida_at: new Date().toISOString(), estado: 'realizada' })
      .eq('id', req.params.id)
      .select().single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// DELETE /api/juntas/:id/foto — borrar foto de evidencia
router.delete('/:id/foto', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('juntas_periodo')
      .update({ foto_evidencia: null, foto_subida_at: null })
      .eq('id', req.params.id)
      .select().single()

    if (error) return res.status(400).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Junta no encontrada' })
    res.json({ data, mensaje: 'Foto eliminada correctamente' })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// GET /api/juntas/:id/fotos — listar fotos de una junta
router.get('/:id/fotos', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('juntas_fotos')
      .select('*')
      .eq('junta_id', req.params.id)
      .order('creado_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// POST /api/juntas/:id/fotos — agregar foto a junta
router.post('/:id/fotos', requireAuth, async (req, res) => {
  try {
    const { foto_url, restaurante_id } = req.body
    if (!foto_url || !restaurante_id) {
      return res.status(400).json({ error: 'foto_url y restaurante_id son requeridos' })
    }

    const { data, error } = await supabase
      .from('juntas_fotos')
      .insert({ junta_id: req.params.id, foto_url, restaurante_id })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    // Marcar junta como realizada si no lo estaba
    await supabase
      .from('juntas_periodo')
      .update({ estado: 'realizada', foto_subida_at: new Date().toISOString() })
      .eq('id', req.params.id)

    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// DELETE /api/juntas/:juntaId/fotos/:fotoId — borrar una foto
router.delete('/:juntaId/fotos/:fotoId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('juntas_fotos')
      .delete()
      .eq('id', req.params.fotoId)
      .eq('junta_id', req.params.juntaId)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, mensaje: 'Foto eliminada correctamente' })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

module.exports = router

// ============================================================

// src/routes/propinas.js — en el mismo archivo por simplicidad
