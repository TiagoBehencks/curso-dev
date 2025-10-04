import { describe, expect, test } from 'vitest'

describe('GET /api/v1/migrations', () => {
  describe('Anonymous user', () => {
    test('Retrieving pending migrations', async () => {
      const response = await fetch('http://localhost:3000/api/v1/migrations')

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(Array.isArray(responseBody)).toBe(true)
      expect(responseBody.length).toBeGreaterThan(0)

      const migration = responseBody[0]

      expect(migration).toHaveProperty('path')
      expect(migration).toHaveProperty('name')
      expect(migration).toHaveProperty('timestamp')

      expect(typeof migration.path).toBe('string')
      expect(typeof migration.name).toBe('string')
      expect(typeof migration.timestamp).toBe('number')
    })
  })
})
