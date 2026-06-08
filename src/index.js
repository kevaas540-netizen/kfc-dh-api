// src/index.js
// ============================================================
// KFC DH App — Servidor principal
// ============================================================

require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const morgan     = require('morgan')
const rateLimit  = require('express-rate-limit')
const cron       = require('node-cron')

const authRoutes        = require('./routes/auth')
const restaurantesRoutes = require('./routes/restaurantes')
const juntasRoutes      = require('./routes/juntas')
const propinasRoutes    = require('./routes/propinas')
const tareasRoutes      = require('./routes/tareas')
const notifRoutes       = require('./routes/notificaciones')
const adminRoutes       = require('./routes/admin')
const uploadRoutes      = require('./routes/upload')
const { enviarRecordatorios } = require('./services/recordatorios')

const app  = express()
const PORT = process.env.PORT || 3000

// ── Seguridad ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || '*'],
    },
  },
}))

const allowedOrigins = [
  'https://kfc-dh-app.vercel.app',
  'https://kfc-dh-app-1.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

// ── HTTPS redirect en producción ─────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url)
    }
    next()
  })
}

// ── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})
app.use('/api/', limiter)

// ── Parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Logs ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/restaurantes', restaurantesRoutes)
app.use('/api/juntas',       juntasRoutes)
app.use('/api/propinas',     propinasRoutes)
app.use('/api/tareas',       tareasRoutes)
app.use('/api/notificaciones', notifRoutes)
app.use('/api/admin',        adminRoutes)
app.use('/api/upload',       uploadRoutes)

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', env: process.env.NODE_ENV })
})

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  })
})

// ── Cron: recordatorios diarios a las 9am México ─────────────
cron.schedule('0 15 * * *', async () => {
  console.log('[CRON] Enviando recordatorios...')
  const result = await enviarRecordatorios()
  console.log('[CRON] Resultado:', result)
}, { timezone: 'America/Mexico_City' })

// ── Arrancar servidor ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🍗 KFC DH API corriendo en http://localhost:${PORT}`)
  console.log(`   Entorno: ${process.env.NODE_ENV}`)
})
