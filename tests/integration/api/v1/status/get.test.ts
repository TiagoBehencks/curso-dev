import { describe, expect, test } from 'vitest'

describe('GET /api/v1/status', () => {
  describe('Anonymous user', () => {
    test('Retrieving current system status', async () => {
      const response = await fetch('http://localhost:3000/api/v1/status')

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody.updated_at).toBeDefined()
      expect(responseBody.dependecies.database.potgres_version).toBeDefined()
      expect(responseBody.dependecies.database.max_connections).toBeDefined()
      expect(responseBody.dependecies.database.opened_connections).toBeDefined()

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString()
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt)

      expect(responseBody.dependecies.database.potgres_version).toBe('16.0')
      expect(responseBody.dependecies.database.max_connections).toBe(100)
      expect(responseBody.dependecies.database.opened_connections).toBe(1)
    })
  })
})
