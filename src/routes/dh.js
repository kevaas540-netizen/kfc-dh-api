const express = require('express')
const supabase = require('../config/supabase')
const { requireAuth } = require('../middleware/auth')
const router = express.Router()

/**
 * Helper: Obtener IDs de tiendas asignadas al DH logueado
 */
async function getDhRestaurantes(dh_id) {
  const { data, error } = await supabase
    .from('dh_restaurantes_individuales')
    .select(`
      restaurante_id, 
      restaurantes ( nombre )
    `)
    .eq('usuario_dh_id', dh_id)
  
  if (error) throw error
  return data
}

// ── GET /api/dh/reporte/juntas ──────────────────────────────
router.get('/reporte/juntas', requireAuth, async (req, res) => {
  try {
    const { mes, anio } = req.query
    const dh_id = req.user.profileId

    const asignaciones = await getDhRestaurantes(dh_id)
    const ids = asignaciones.map(a => a.restaurante_id)

    const { data: juntas, error } = await supabase
      .from('juntas_periodo')
      .select('restaurante_id, fecha, foto_evidencia')
      .in('restaurante_id', ids)
      .eq('mes', parseInt(mes))
      .eq('anio', parseInt(anio))

    if (error) throw error

    const reporte = asignaciones.map(a => {
      const j = juntas.find(item => item.restaurante_id === a.restaurante_id)
      return {
        id: a.restaurante_id,
        nombre: a.restaurantes?.nombre || 'Tienda sin nombre',
        agendada: !!j,
        fecha: j?.fecha || null,
        tieneFoto: !!j?.foto_evidencia,
        fotoUrl: j?.foto_evidencia || null
      }
    })

    res.json({ data: reporte })
  } catch (err) {
    console.error("Error juntas:", err)
    res.status(500).json({ error: 'Error al generar reporte de juntas' })
  }
})

// ── GET /api/dh/reporte/tareas ──────────────────────────────
router.get('/reporte/tareas', requireAuth, async (req, res) => {
  try {
    const { fecha_semana } = req.query
    const dh_id = req.user.profileId

    const asignaciones = await getDhRestaurantes(dh_id)
    const ids = asignaciones.map(a => a.restaurante_id)

    const { data: tareas, error } = await supabase
      .from('tareas_semanales')
      .select('restaurante_id, completada') // Simplificado según tu esquema
      .in('restaurante_id', ids)
      .eq('fecha_semana', fecha_semana)

    if (error) throw error

    const reporte = asignaciones.map(a => {
      const t = tareas.find(item => item.restaurante_id === a.restaurante_id)
      return {
        id: a.restaurante_id,
        nombre: a.restaurantes?.nombre || 'Tienda sin nombre',
        completada: t?.completada || false
      }
    })

    res.json({ data: reporte })
  } catch (err) {
    console.error("Error tareas:", err)
    res.status(500).json({ error: 'Error al generar reporte de tareas' })
  }
})

module.exports = router