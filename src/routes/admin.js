// src/routes/admin.js
// ============================================================
// Rutas exclusivas para administradores
// ============================================================

const express  = require('express')
const supabase = require('../config/supabase')
const { requireAuth, requireAdmin } = require('../middleware/auth')

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

// ── GET /api/admin/resumen ───────────────────────────────────
// Totales de áreas activas, DH activos, restaurantes activos
router.get('/resumen', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      { count: areasCount, error: areasError },
      { count: dhCount, error: dhError },
      { count: restaurantesCount, error: restaurantesError },
    ] = await Promise.all([
      supabase.from('areas').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('usuarios_dh').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('restaurantes').select('*', { count: 'exact', head: true }).eq('activo', true),
    ])

    if (areasError || dhError || restaurantesError) {
      return res.status(400).json({ error: (areasError || dhError || restaurantesError).message })
    }

    res.json({
      data: {
        areas_activas: areasCount || 0,
        dh_activos: dhCount || 0,
        restaurantes_activos: restaurantesCount || 0,
      },
    })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Error interno' })
  }
})

// ── GET /api/admin/areas ─────────────────────────────────────
router.get('/metros', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('metros')
      .select('*')
      .order('nombre')

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

router.post('/metros', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })

    const { data, error } = await supabase
      .from('metros')
      .insert({ nombre, descripcion: descripcion || null })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

router.put('/metros/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, activo } = req.body
    const { data, error } = await supabase
      .from('metros')
      .update({ nombre, descripcion, activo })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/areas', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('nombre')

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Error interno' })
  }
})

// ── POST /api/admin/areas ────────────────────────────────────
router.post('/areas', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, metro_id } = req.body
    if (!nombre) {
      return res.status(400).json({ error: 'nombre es requerido' })
    }

    const { data, error } = await supabase
      .from('areas')
      .insert({ nombre, descripcion: descripcion || null, metro_id: metro_id || null })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Error interno' })
  }
})

router.put('/areas/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, metro_id, activo } = req.body
    const { data, error } = await supabase
      .from('areas')
      .update({ nombre, descripcion, metro_id: metro_id || null, activo })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── GET /api/admin/dh ────────────────────────────────────────
router.get('/dh', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios_dh')
      .select('*, dh_areas(areas(*)), dh_restaurantes_individuales(restaurantes(*))')
      .order('nombre')

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── POST /api/admin/dh ─────────────────────────────────────────
router.post('/dh', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { auth_user_id, nombre, correo, password } = req.body
    if (!nombre || !correo) {
      return res.status(400).json({ error: 'nombre y correo son requeridos' })
    }

    const authUserId = auth_user_id || await createAuthUser(correo, password)

    const { data, error } = await supabase
      .from('usuarios_dh')
      .insert({ auth_user_id: authUserId, nombre, correo })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Error interno' })
  }
})

// ── POST /api/admin/dh/:id/areas ─────────────────────────────
// Asignar área a un DH (insertar en dh_areas)
router.post('/dh/:id/areas', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { area_id } = req.body
    if (!area_id) {
      return res.status(400).json({ error: 'area_id es requerido' })
    }

    const { data, error } = await supabase
      .from('dh_areas')
      .insert({ usuario_dh_id: req.params.id, area_id })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── DELETE /api/admin/dh/:dhId/areas/:areaId ─────────────────
// Quitar área a un DH
router.delete('/dh/:dhId/areas/:areaId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('dh_areas')
      .delete()
      .eq('usuario_dh_id', req.params.dhId)
      .eq('area_id', req.params.areaId)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, mensaje: 'Área desasignada correctamente' })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── POST /api/admin/dh/:id/restaurantes ──────────────────────
// Asignar restaurante individual (insertar en dh_restaurantes_individuales)
router.post('/dh/:id/restaurantes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { restaurante_id } = req.body
    if (!restaurante_id) {
      return res.status(400).json({ error: 'restaurante_id es requerido' })
    }

    const { data, error } = await supabase
      .from('dh_restaurantes_individuales')
      .insert({ usuario_dh_id: req.params.id, restaurante_id })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// ── DELETE /api/admin/dh/:dhId/restaurantes/:restId ──────────
// Quitar asignación individual de restaurante
router.delete('/dh/:dhId/restaurantes/:restId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('dh_restaurantes_individuales')
      .delete()
      .eq('usuario_dh_id', req.params.dhId)
      .eq('restaurante_id', req.params.restId)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, mensaje: 'Restaurante desasignado correctamente' })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

module.exports = router
