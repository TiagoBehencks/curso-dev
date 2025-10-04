import { describe, expect, test } from 'vitest'

describe('DELETE /api/v1/status', () => {
  describe('Anonymous user', () => {
    test('Retrieving current system status', async () => {
      const response = await fetch('http://localhost:3000/api/v1/status', {
        method: 'DELETE',
      })

      expect(response.status).toBe(405)
      expect(response.headers.get('content-type')).toBe('application/json')

      const responseBody = await response.json()

      expect(responseBody.name).toBe('MethodNotAllowedError')
      expect(responseBody.message).toBe('Method Not Allowed')
      expect(responseBody.action).toBe('Try again later')
      expect(responseBody.status_code).toBe(405)
    })
  })
})
