import { beforeAll, describe, expect, test } from 'vitest'
import { version as uuidVersion } from 'uuid'

import { createUser, runPendingMigrations } from 'tests/orchestrator'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('GET /api/v1/users/[username]', () => {
  describe('Anonymous user', () => {
    test('With exact case match', async () => {
      const createdUser = await createUser({
        username: 'Tiago',
      })

      const response = await fetch('http://localhost:3000/api/v1/users/Tiago')

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: 'Tiago',
        email: createdUser.email,
        features: createdUser.features,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()
    })

    test('With exact case missmatch', async () => {
      const createdUser = await createUser({
        username: 'Missmatch',
      })

      const response = await fetch(
        'http://localhost:3000/api/v1/users/missmatch'
      )

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: 'Missmatch',
        email: createdUser.email,
        password: responseBody.password,
        features: responseBody.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()
    })

    test('With nonexistent username', async () => {
      const response = await fetch(
        'http://localhost:3000/api/v1/users/nonexistent'
      )

      expect(response.status).toBe(404)

      const response2Body = await response.json()

      expect(response2Body).toEqual({
        name: 'NotFoundError',
        message: 'User not found',
        action: 'Try another username',
        status_code: 404,
      })
    })
  })
})
