import { beforeAll, describe, expect, test } from 'vitest'

import { webserver } from 'infra/webserver'

import {
  runPendingMigrations,
  createUser,
  createSession,
  addFeaturesToUser,
  activateUser,
} from 'tests/orchestrator'
import { Feature } from 'models/features'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('GET /api/v1/status', () => {
  describe('Default user', () => {
    test('Retrieving current system status', async () => {
      const createdUser = await createUser({})
      const activatedUser = await activateUser(createdUser)
      const sessionObject = await createSession(activatedUser)

      const response = await fetch(`${webserver.origin}/api/v1/status`, {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      })
      expect(response.status).toBe(200)

      const responseBody = await response.json()

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString()
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt)

      expect(responseBody.dependencies.database.max_connections).toEqual(100)
      expect(responseBody.dependencies.database.opened_connections).toEqual(1)
      expect(responseBody.dependencies.database).not.toHaveProperty('version')
    })
  })

  describe('Anonymous user', () => {
    test('Retrieving current system status, returns only updated_at', async () => {
      const response = await fetch(`${webserver.origin}/api/v1/status`)

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody.updated_at).toBeDefined()

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString()
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt)

      expect(responseBody.dependencies.database.max_connections).toBeDefined()
      expect(
        responseBody.dependencies.database.opened_connections
      ).toBeDefined()
    })
  })

  describe('Authenticated user', () => {
    test('Without read:status feature, returns only updated_at', async () => {
      const createdUser = await createUser({})
      const sessionObject = await createSession({ id: createdUser.id })

      const response = await fetch(`${webserver.origin}/api/v1/status`, {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      })

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody.updated_at).toBeDefined()
      expect(responseBody.dependencies.database.max_connections).toBeDefined()
      expect(
        responseBody.dependencies.database.opened_connections
      ).toBeDefined()
    })

    test('With read:status feature, returns full status', async () => {
      const createdUser = await createUser({})
      await addFeaturesToUser({
        id: createdUser.id,
        features: [Feature.READ_STATUS],
      })
      const sessionObject = await createSession({ id: createdUser.id })

      const response = await fetch(`${webserver.origin}/api/v1/status`, {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      })

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody.updated_at).toBeDefined()
      expect(responseBody.dependencies).toBeDefined()
      expect(responseBody.dependencies.database.postgres_version).toBeDefined()
      expect(responseBody.dependencies.database.max_connections).toBeDefined()
      expect(
        responseBody.dependencies.database.opened_connections
      ).toBeDefined()

      expect(responseBody.dependencies.database.postgres_version).toBe('16.0')
      expect(responseBody.dependencies.database.max_connections).toBe(100)
      expect(responseBody.dependencies.database.opened_connections).toBe(1)
    })
  })
})
