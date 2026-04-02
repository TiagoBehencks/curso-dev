import { describe, test, expect, beforeAll, vitest } from 'vitest'
import { version as uuidVersion } from 'uuid'

import {
  runPendingMigrations,
  createUser,
  createSession,
  activateUser,
} from 'tests/orchestrator'

import { webserver } from 'infra/webserver'

import { activation } from 'models/activation'
import { user } from 'models/user'
import { Feature } from 'models/features'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('PATH /api/v1/activation/[token_id]', () => {
  describe('Anonymous user', () => {
    test('With nonexistent token', async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/activations/3fcfc2fd-bdc3-405a-a163-3d11a541593c`,
        {
          method: 'PATCH',
        }
      )

      expect(response.status).toBe(404)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        message:
          'The activation token was not found in the system or has expired',
        action: 'Make a new registration',
        cause: 'TOKEN_NOT_FOUND',
        name: 'NotFoundError',
        statusCode: 404,
      })
    })

    test('With expired token', async () => {
      vitest.useFakeTimers({
        now: new Date(Date.now() - activation.EXPIRATION_IN_MILLISECONDS),
      })

      const createdUser = await createUser({})
      const expiredActivationToken = await activation.create({
        id: createdUser.id,
      })

      vitest.useRealTimers()

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${expiredActivationToken.id}`,
        {
          method: 'PATCH',
        }
      )

      expect(response.status).toBe(404)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        message:
          'The activation token was not found in the system or has expired',
        action: 'Make a new registration',
        cause: 'TOKEN_NOT_FOUND',
        name: 'NotFoundError',
        statusCode: 404,
      })
    })

    test('With already used token', async () => {
      const createdUser = await createUser({})
      const activationToken = await activation.create({
        id: createdUser.id,
      })

      const responseFirstUse = await fetch(
        `${webserver.origin}/api/v1/activations/${activationToken.id}`,
        {
          method: 'PATCH',
        }
      )

      expect(responseFirstUse.status).toBe(200)

      const responseSecondUse = await fetch(
        `${webserver.origin}/api/v1/activations/${activationToken.id}`,
        {
          method: 'PATCH',
        }
      )

      expect(responseSecondUse.status).toBe(404)

      const responseBody = await responseSecondUse.json()

      expect(responseBody).toEqual({
        message:
          'The activation token was not found in the system or has expired',
        action: 'Make a new registration',
        cause: 'TOKEN_NOT_FOUND',
        name: 'NotFoundError',
        statusCode: 404,
      })
    })

    test('With valid token', async () => {
      const createdUser = await createUser({})
      const activationToken = await activation.create({
        id: createdUser.id,
      })

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${activationToken.id}`,
        {
          method: 'PATCH',
        }
      )

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: activationToken.id,
        used_at: responseBody.used_at,
        user_id: createdUser.id,
        expires_at: activationToken.expires_at.toISOString(),
        created_at: activationToken.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(uuidVersion(responseBody.user_id)).toBe(4)

      expect(Date.parse(responseBody.expires_at)).not.toBeNaN()
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()

      expect(Date.parse(responseBody.used_at)).toBeLessThanOrEqual(Date.now())

      expect(responseBody.updated_at > responseBody.created_at).toBe(true)

      const expiresAt = new Date(responseBody.expires_at)
      const createdAt = new Date(responseBody.created_at)

      expiresAt.setMilliseconds(0)
      createdAt.setMilliseconds(0)

      expect(expiresAt.getTime() - createdAt.getTime()).toBe(
        activation.EXPIRATION_IN_MILLISECONDS
      )

      const activatedUser = await user.findOneById(createdUser.id)

      expect(activatedUser.features).toEqual([
        Feature.CREATE_SESSION,
        Feature.READ_SESSION,
        Feature.UPDATE_USER,
      ])
    })

    test('With valid token but already activated user', async () => {
      const createdUser = await createUser({})
      await activateUser({ id: createdUser.id })
      const activationToken = await activation.create({
        id: createdUser.id,
      })

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${activationToken.id}`,
        {
          method: 'PATCH',
        }
      )

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        message: 'User is already activated',
        action: 'Contact support if you think this is a mistake',
        name: 'ForbiddenError',
        statusCode: 403,
      })
    })
  })

  describe('Default user', () => {
    test('With valid token, but already logged in user', async () => {
      const user1 = await createUser({})
      await activateUser({ id: user1.id })
      const user1SessionObject = await createSession({ id: user1.id })

      const user2 = await createUser({})
      const activationTokenUser2 = await activation.create({
        id: user2.id,
      })

      const response = await fetch(
        `${webserver.origin}/api/v1/activations/${activationTokenUser2.id}`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${user1SessionObject.token}`,
          },
        }
      )

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature read:activation_token',
        name: 'ForbiddenError',
        statusCode: 403,
      })
    })
  })
})
