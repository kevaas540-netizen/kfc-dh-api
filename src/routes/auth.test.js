// src/routes/auth.test.js
// ============================================================
// Tests de autenticación
// ============================================================

const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')

// Mock de Supabase
jest.mock('../config/supabase', () => ({
  auth: {
    signInWithPassword: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  })),
}))

const supabase = require('../config/supabase')
const authRouter = require('./auth')

const app = express()
app.use(express.json())
app.use('/api/auth', authRouter)

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-key-32-chars-long!!!'
    process.env.JWT_EXPIRES_IN = '7d'
  })

  it('debe rechazar credenciales vacías', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Email y password/)
  })

  it('debe rechazar credenciales incorrectas', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Credenciales incorrectas/)
  })

  it('debe rechazar usuario sin rol asignado', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'uuid-123', email: 'test@test.com' } },
      error: null,
    })

    // Ningún rol encontrado — mock correcto para cadena de métodos
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    }
    supabase.from.mockReturnValue(mockChain)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/no autorizado/)
  })
})

describe('GET /api/auth/me', () => {
  it('debe rechazar sin token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('debe rechazar token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')

    expect(res.status).toBe(401)
  })
})
