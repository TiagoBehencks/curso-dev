import { beforeAll, describe, expect, test } from 'vitest'

import {
  activateUser,
  addFeaturesToUser,
  createSession,
  createUser,
  runPendingMigrations,
} from 'tests/orchestrator'

import { webserver } from 'infra/webserver'
import { Feature } from 'models/features'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('POST /api/v1/migrations', () => {
  describe('Anonymous user', () => {
    test('Running pending migrations', async () => {
      const response = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: 'POST',
      })

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'ForbiddenError',
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature run:migrations',
        statusCode: 403,
      })
    })
  })

  describe('Default user', () => {
    test('Running pending migrations', async () => {
      const createdUser = await createUser({})
      const activatedUser = await activateUser({
        id: createdUser.id,
      })
      const userSession = await createSession({
        id: activatedUser.id,
      })
      const response = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: 'POST',
        headers: {
          cookie: `session_id=${userSession.token}`,
        },
      })

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'ForbiddenError',
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature run:migrations',
        statusCode: 403,
      })
    })
  })

  describe('Privileged user', () => {
    test('Running pending migrations', async () => {
      const createdUser = await createUser({})
      const activatedUser = await activateUser({
        id: createdUser.id,
      })
      await addFeaturesToUser({
        id: activatedUser.id,
        features: [Feature.RUN_MIGRATIONS],
      })
      const userSession = await createSession({
        id: activatedUser.id,
      })
      const response = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: 'POST',
        headers: {
          cookie: `session_id=${userSession.token}`,
        },
      })

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(Array.isArray(responseBody)).toBe(true)
    })
  })
})
