import { beforeAll, describe, expect, test } from 'vitest'

import { Feature } from 'models/features'

import {
  activateUser,
  addFeaturesToUser,
  createSession,
  createUser,
  runPendingMigrations,
} from 'tests/orchestrator'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('GET /api/v1/migrations', () => {
  describe('Anonymous user', () => {
    test('Retrieving pending migrations', async () => {
      const response = await fetch('http://localhost:3000/api/v1/migrations')

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'ForbiddenError',
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature get:pending_migrations',
        statusCode: 403,
      })
    })
  })

  describe('Default user', () => {
    test('With `run:migrations`', async () => {
      const defautlUser = await createUser({})
      const activateddefautlUser = await activateUser({
        id: defautlUser.id,
      })

      const defautlUserSession = await createSession({
        id: activateddefautlUser.id,
      })

      const response = await fetch('http://localhost:3000/api/v1/migrations', {
        headers: {
          cookie: `session_id=${defautlUserSession.token}`,
        },
      })

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'ForbiddenError',
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature get:pending_migrations',
        statusCode: 403,
      })
    })
  })

  describe('Privileged user', () => {
    test('With `run:migrations`', async () => {
      const privilegedUser = await createUser({})
      const activatedPrivilegedUser = await activateUser({
        id: privilegedUser.id,
      })

      await addFeaturesToUser({
        id: activatedPrivilegedUser.id,
        features: [Feature.GET_PENDING_MIGRATIONS],
      })

      const privilegedUserSession = await createSession({
        id: activatedPrivilegedUser.id,
      })

      const response = await fetch('http://localhost:3000/api/v1/migrations', {
        headers: {
          cookie: `session_id=${privilegedUserSession.token}`,
        },
      })

      const responseBody = await response.json()
      expect(response.status).toBe(200)

      expect(Array.isArray(responseBody)).toBe(true)
    })
  })
})
