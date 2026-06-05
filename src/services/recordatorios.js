// src/services/recordatorios.js
// ============================================================
// Envío automático de recordatorios a restaurantes
// ============================================================

const supabase = require('../config/supabase')

function esPrimeraSemanaDelMes(fecha) {
  const dia = fecha.getDate()
  const diaSemana = fecha.getDay() // 0=dom, 1=lun, ..., 4=jue, 5=vie, 6=sab
  // Primer jueves/viernes/sábado del mes
  if (diaSemana >= 4 && diaSemana <= 6) {
    // Si el día es <= 7, es la primera semana
    return dia <= 7
  }
  return false
}

function esFinDeMesOPrincipio(fecha) {
  const dia = fecha.getDate()
  // Día 27-30 del mes actual, o 1-3 del mes siguiente
  return (dia >= 27 && dia <= 31) || (dia >= 1 && dia <= 3)
}

async function yaExisteNotificacionHoy(restauranteId, tipo, fechaHoy) {
  const inicioDia = new Date(fechaHoy)
  inicioDia.setHours(0, 0, 0, 0)
  const finDia = new Date(fechaHoy)
  finDia.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('notificaciones')
    .select('id')
    .eq('restaurante_id', restauranteId)
    .eq('tipo', tipo)
    .gte('creado_at', inicioDia.toISOString())
    .lte('creado_at', finDia.toISOString())
    .limit(1)

  if (error) {
    console.error('Error verificando notificación existente:', error)
    return false
  }

  return data && data.length > 0
}

async function enviarRecordatorios() {
  const hoy = new Date()
  const diaSemana = hoy.getDay() // 0=dom, 1=lun, ..., 4=jue, 5=vie, 6=sab
  const diaMes = hoy.getDate()

  // Obtener todos los restaurantes activos
  const { data: restaurantes, error: restError } = await supabase
    .from('restaurantes')
    .select('id, nombre')
    .eq('activo', true)

  if (restError) {
    console.error('Error obteniendo restaurantes:', restError)
    return { enviados: 0 }
  }

  let enviados = 0
  const notificacionesAInsertar = []

  for (const restaurante of restaurantes) {
    // ── Recordatorio de junta ────────────────────────────────
    // Jueves(4), viernes(5) o sábado(6) de la primera semana del mes
    if (diaSemana >= 4 && diaSemana <= 6 && esPrimeraSemanaDelMes(hoy)) {
      const mes = hoy.getMonth() + 1
      const anio = hoy.getFullYear()

      // Verificar si ya agendó junta para este mes
      const { data: junta, error: juntaError } = await supabase
        .from('juntas_periodo')
        .select('id')
        .eq('restaurante_id', restaurante.id)
        .eq('mes', mes)
        .eq('anio', anio)
        .limit(1)

      if (juntaError) {
        console.error('Error verificando junta:', juntaError)
        continue
      }

      // Si no ha agendado y no se envió hoy, crear recordatorio
      if (!junta || junta.length === 0) {
        const yaExiste = await yaExisteNotificacionHoy(restaurante.id, 'recordatorio_junta', hoy)
        if (!yaExiste) {
          notificacionesAInsertar.push({
            restaurante_id: restaurante.id,
            destinatario_tipo: 'restaurante',
            tipo: 'recordatorio_junta',
            titulo: 'Recordatorio: Agenda tu junta mensual',
            mensaje: `Hola ${restaurante.nombre}, recuerda agendar la junta mensual para ${mes}/${anio}.`,
            leida: false,
          })
        }
      }
    }

    // ── Recordatorio de propinas ─────────────────────────────
    // Día 27-30 o 1-3 del mes
    if (esFinDeMesOPrincipio(hoy)) {
      const mes = hoy.getDate() >= 27 ? hoy.getMonth() + 1 : hoy.getMonth()
      const anio = hoy.getFullYear()
      // Ajustar mes si es 0 (enero anterior)
      const mesReal = mes === 0 ? 12 : mes
      const anioReal = mes === 0 ? anio - 1 : anio

      // Verificar si ya guardó propinas para este mes
      const { data: propina, error: propinaError } = await supabase
        .from('propinas')
        .select('id')
        .eq('restaurante_id', restaurante.id)
        .eq('mes', mesReal)
        .eq('anio', anioReal)
        .eq('guardado', true)
        .limit(1)

      if (propinaError) {
        console.error('Error verificando propinas:', propinaError)
        continue
      }

      // Si no las ha guardado y no se envió hoy, crear recordatorio
      if (!propina || propina.length === 0) {
        const yaExiste = await yaExisteNotificacionHoy(restaurante.id, 'recordatorio_propinas', hoy)
        if (!yaExiste) {
          notificacionesAInsertar.push({
            restaurante_id: restaurante.id,
            destinatario_tipo: 'restaurante',
            tipo: 'recordatorio_propinas',
            titulo: 'Recordatorio: Guarda las propinas del mes',
            mensaje: `Hola ${restaurante.nombre}, recuerda guardar las propinas de ${mesReal}/${anioReal}.`,
            leida: false,
          })
        }
      }
    }
  }

  // Insertar todas las notificaciones en batch
  if (notificacionesAInsertar.length > 0) {
    const { error: insertError } = await supabase
      .from('notificaciones')
      .insert(notificacionesAInsertar)

    if (insertError) {
      console.error('Error insertando notificaciones:', insertError)
    } else {
      enviados = notificacionesAInsertar.length
    }
  }

  return { enviados }
}

module.exports = { enviarRecordatorios }
