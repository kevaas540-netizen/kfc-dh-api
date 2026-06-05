// src/routes/propinas.js
const express  = require('express')
const supabase = require('../config/supabase')
const { requireAuth, requireDH } = require('../middleware/auth')

const router = express.Router()

// GET /api/propinas?restaurante_id=xxx&mes=6&anio=2026
router.get('/', requireAuth, async (req, res) => {
  try {
    const { restaurante_id, mes, anio, guardado } = req.query

    let query = supabase
      .from('propinas_vista')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (restaurante_id) query = query.eq('restaurante_id', restaurante_id)
    if (mes)            query = query.eq('mes', mes)
    if (anio)           query = query.eq('anio', anio)
    if (guardado !== undefined) query = query.eq('guardado', guardado === 'true')

    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// GET /api/propinas/estadisticas — para gráficas DH
router.get('/estadisticas', requireAuth, requireDH, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('propinas_vista')
      .select('mes, anio, total_pesos, por_colaborador, restaurante_nombre, restaurante_id')
      .eq('guardado', true)
      .order('anio', { ascending: true })
      .order('mes', { ascending: true })

    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// POST /api/propinas — crear o actualizar borrador
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      restaurante_id, mes, anio, num_colaboradores,
      centavos_50, pesos_1, pesos_2, pesos_5, pesos_10,
      pesos_20, pesos_50, pesos_100, pesos_200, pesos_500,
    } = req.body

    if (!restaurante_id || !mes || !anio) {
      return res.status(400).json({ error: 'restaurante_id, mes y anio son requeridos' })
    }

    // Verificar que no esté ya guardada
    const { data: existente } = await supabase
      .from('propinas')
      .select('id, guardado')
      .eq('restaurante_id', restaurante_id)
      .eq('mes', mes)
      .eq('anio', anio)
      .maybeSingle()

    if (existente?.guardado) {
      return res.status(400).json({ error: 'Las propinas de este mes ya fueron enviadas y no se pueden editar' })
    }

    const { data, error } = await supabase
      .from('propinas')
      .upsert({
        restaurante_id, mes, anio,
        num_colaboradores: Number(num_colaboradores) || 1,
        centavos_50: Number(centavos_50) || 0,
        pesos_1:     Number(pesos_1)     || 0,
        pesos_2:     Number(pesos_2)     || 0,
        pesos_5:     Number(pesos_5)     || 0,
        pesos_10:    Number(pesos_10)    || 0,
        pesos_20:    Number(pesos_20)    || 0,
        pesos_50:    Number(pesos_50)    || 0,
        pesos_100:   Number(pesos_100)   || 0,
        pesos_200:   Number(pesos_200)   || 0,
        pesos_500:   Number(pesos_500)   || 0,
      }, { onConflict: 'restaurante_id,mes,anio' })
      .select().single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

// PATCH /api/propinas/:id/guardar — marcar como enviadas
router.patch('/:id/guardar', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('propinas')
      .update({ guardado: true, guardado_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('guardado', false)
      .select().single()

    if (error) return res.status(400).json({ error: error.message })
    if (!data)  return res.status(404).json({ error: 'Propinas no encontradas o ya guardadas' })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Error interno' })
  }
})

module.exports = router
