// src/routes/upload.js
// ============================================================
// Subida de archivos a Supabase Storage
// ============================================================

const express  = require('express')
const multer = require('multer')
const supabase = require('../config/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB max

// POST /api/upload — subir archivo genérico
// Body: multipart/form-data con campo 'file'
// Query: ?folder=juntas|tareas (opcional, para organizar en buckets)
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' })
    }

    const folder = req.query.folder || 'general'
    const ext = req.file.originalname.split('.').pop()
    const timestamp = Date.now()
    const path = `${folder}/${req.user.sub}_${timestamp}.${ext}`

    const { data, error } = await supabase.storage
      .from('kfc-dh-fotos')
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (error) {
      console.error('Storage error:', error)
      return res.status(500).json({ error: 'Error al subir archivo: ' + error.message })
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('kfc-dh-fotos')
      .getPublicUrl(path)

    res.json({
      url: urlData.publicUrl,
      path: data.path,
      size: req.file.size,
      type: req.file.mimetype,
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Error interno al subir archivo' })
  }
})

module.exports = router
