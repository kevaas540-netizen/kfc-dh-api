const express = require('express')
const multer = require('multer')
const supabase = require('../config/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' })
    }

    // Definimos el bucket según la carpeta que viene en la query
    // Si la folder es 'juntas', usamos el bucket 'juntas'. Si es 'tareas', usamos 'tareas-evidencia'
    const folder = req.query.folder || 'general'
    const bucketName = folder === 'juntas' ? 'juntas' : 'tareas-evidencia'
    
    const ext = req.file.originalname.split('.').pop()
    const timestamp = Date.now()
    const path = `${folder}/${req.user.sub}_${timestamp}.${ext}`

    // 1. Subir a Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (error) {
      console.error('Storage error:', error)
      return res.status(500).json({ error: 'Error al subir a ' + bucketName + ': ' + error.message })
    }

    // 2. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(bucketName)
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