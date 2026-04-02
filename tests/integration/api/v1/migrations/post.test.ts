import exp from 'constants'
import { describe, expect, test } from 'vitest'

describe('POST /api/v1/migrations', () => {
  describe('Anonymous user', () => {
    describe('Running pending migrations', () => {
      test('For the fist time', async () => {
        const response1 = await fetch(
          'http://localhost:3000/api/v1/migrations',
          {
            method: 'POST',
          }
        )

        expect(response1.status).toBe(403)

        const responseBody = await response1.json()

        expect(responseBody).toEqual({
          name: 'ForbiddenError',
          message: 'You do not have permission to perform this action',
          action: 'Check if your user has the feature run:migrations',
          statusCode: 403,
        })
      })

      test('For the second time', async () => {
        const response2 = await fetch(
          'http://localhost:3000/api/v1/migrations',
          {
            method: 'POST',
          }
        )

        expect(response2.status).toBe(403)

        const response2Body = await response2.json()

        expect(response2Body).toEqual({
          name: 'ForbiddenError',
          message: 'You do not have permission to perform this action',
          action: 'Check if your user has the feature run:migrations',
          statusCode: 403,
        })
      })
    })
  })
})
