// src/middleware/auth.js
const jwt      = require('jsonwebtoken')
const supabase = require('../config/supabase')

// ── Verificar token JWT ──────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' })
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

// ── Solo admins ──────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado — se requiere rol admin' })
  }
  next()
}

// ── Solo DH ─────────────────────────────────────────────────
function requireDH(req, res, next) {
  if (!['admin', 'dh'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso denegado — se requiere rol DH' })
  }
  next()
}

// ── Solo restaurante (o admin/dh) ────────────────────────────
function requireRestaurante(req, res, next) {
  if (!['admin', 'dh', 'restaurante'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  next()
}

module.exports = { requireAuth, requireAdmin, requireDH, requireRestaurante }
