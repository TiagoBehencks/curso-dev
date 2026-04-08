import { version as uuidVersion } from 'uuid'
import { beforeAll, describe, expect, test } from 'vitest'

import { webserver } from 'infra/webserver'

import {
  activateUser,
  addFeaturesToUser,
  createSession,
  createUser,
  runPendingMigrations,
} from 'tests/orchestrator'

import { Feature } from 'models/features'
import { password } from 'models/password'
import { user } from 'models/user'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('PATCH /api/v1/users/[username]', () => {
  describe('Anonymous user', () => {
    test('With unique "username"', async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/users/uniqueUser1`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            username: 'uniqueUser2',
          }),
        }
      )
      expect(response.status).toBe(403)
      const responseBody = await response.json()

      expect(responseBody).toEqual({
        action: 'Check if your user has the feature update:user',
        message: 'You do not have permission to perform this action',
        name: 'ForbiddenError',
        statusCode: 403,
      })
    })
  })

  describe('Default user', () => {
    test('With nonexistent "username"', async () => {
      const createdUser = await createUser({})
      const activatedUser = await activateUser({ id: createdUser.id })
      const sessionObject = await createSession({ id: activatedUser.id })

      const response = await fetch(
        `${webserver.origin}/api/v1/users/nonexistent`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: 'newUsername',
          }),
        }
      )

      expect(response.status).toBe(404)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        message: 'User not found',
        action: 'Try another username',
        name: 'NotFoundError',
        statusCode: 404,
      })
    })

    test('Without data at request body', async () => {
      const createdUser = await createUser({})
      const activatedUser = await activateUser({ id: createdUser.id })
      const sessionObject = await createSession({ id: activatedUser.id })

      const response = await fetch(
        `${webserver.origin}/api/v1/users/nonexistent`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        }
      )

      expect(response.status).toBe(400)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        error: 'Invalid JSON in request body',
      })
    })

    test('With duplicated "username"', async () => {
      await createUser({
        username: 'user1',
      })

      const createdUser2 = await createUser({
        username: 'user2',
      })
      const activatedUser2 = await activateUser({ id: createdUser2.id })
      const sessionObject2 = await createSession({ id: activatedUser2.id })

      const response = await fetch(`${webserver.origin}/api/v1/users/user2`, {
        method: 'PATCH',
        headers: {
          Cookie: `session_id=${sessionObject2.token}`,
        },
        body: JSON.stringify({
          username: 'user1',
        }),
      })

      expect(response.status).toBe(400)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'ValidationError',
        message: 'The username has been taken.',
        action: 'Try another username',
        statusCode: 400,
      })
    })

    test('With `userTwo` targeting `userOne`', async () => {
      await createUser({
        username: 'userOne',
      })

      const createdUser2 = await createUser({
        username: 'userTwo',
      })
      const activatedUser2 = await activateUser({ id: createdUser2.id })
      const sessionObject2 = await createSession({ id: activatedUser2.id })

      const response = await fetch(`${webserver.origin}/api/v1/users/userOne`, {
        method: 'PATCH',
        headers: {
          Cookie: `session_id=${sessionObject2.token}`,
        },
        body: JSON.stringify({
          username: 'user3',
        }),
      })

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        action: 'Check if your user has the feature update:user',
        message: 'You do not have permission to perform this action',
        name: 'ForbiddenError',
        statusCode: 403,
      })
    })

    test('With duplicated "email"', async () => {
      await createUser({
        email: 'email@tiago.com',
      })
      const createdUser2 = await createUser({
        password: 'password123',
      })
      const activatedUser2 = await activateUser({ id: createdUser2.id })
      const sessionObject2 = await createSession({ id: activatedUser2.id })

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${createdUser2.username}`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${sessionObject2.token}`,
          },
          body: JSON.stringify({
            email: 'email@tiago.com',
          }),
        }
      )
      expect(response.status).toBe(400)
    })

    test('With unique "username"', async () => {
      const createdUser = await createUser({
        username: 'uniqueUser1',
      })
      const activatedUser = await activateUser({ id: createdUser.id })
      const sessionObject = await createSession({ id: activatedUser.id })

      const response = await fetch(
        `${webserver.origin}/api/v1/users/uniqueUser1`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: 'uniqueUser2',
          }),
        }
      )
      expect(response.status).toBe(200)
      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: responseBody.username,
        email: createdUser.email,
        features: [
          Feature.CREATE_SESSION,
          Feature.READ_SESSION,
          Feature.UPDATE_USER,
        ],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()
      expect(responseBody.updated_at > responseBody.created_at).toBe(true)
    })

    test('With unique "email"', async () => {
      const user = await createUser({
        email: 'uniqueEmail1@tiago.com',
      })
      const activatedUser = await activateUser({ id: user.id })
      const sessionObject = await createSession({ id: activatedUser.id })

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${user.username}`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: 'uniqueEmail2@tiago.com',
          }),
        }
      )
      expect(response.status).toBe(200)
      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        email: responseBody.email,
        features: responseBody.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()
      expect(responseBody.updated_at > responseBody.created_at).toBe(true)
    })

    test('With new "password"', async () => {
      const userCreated = await createUser({
        password: 'password123',
      })
      const activatedUser = await activateUser({ id: userCreated.id })
      const sessionObject2 = await createSession({ id: activatedUser.id })

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${userCreated.username}`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${sessionObject2.token}`,
          },
          body: JSON.stringify({
            password: 'newPassword',
          }),
        }
      )
      expect(response.status).toBe(200)
      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: userCreated.username,
        email: userCreated.email,
        features: responseBody.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()
      expect(responseBody.updated_at > responseBody.created_at).toBe(true)

      const userInDatabase = await user.findOneByUsername(userCreated.username)

      const correctPasswordMatch = await password.compare(
        'newPassword',
        userInDatabase.password
      )

      expect(correctPasswordMatch).toBe(true)

      const incorrectPasswordMatch = await password.compare(
        'password123',
        userInDatabase.password
      )

      expect(incorrectPasswordMatch).toBe(false)
    })
  })

  describe('Privileged user', () => {
    test('With `update:user:others` targeting `defaultUser`', async () => {
      const privilegedUser = await createUser({})
      const activatedPrivilegedUser = await activateUser({
        id: privilegedUser.id,
      })

      await addFeaturesToUser({
        id: activatedPrivilegedUser.id,
        features: [Feature.UPDATE_USER_OTHERS],
      })

      const privilegedUserSession = await createSession({
        id: activatedPrivilegedUser.id,
      })

      const defaultUser = await createUser({})

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${defaultUser.username}`,
        {
          method: 'PATCH',
          headers: {
            Cookie: `session_id=${privilegedUserSession.token}`,
          },
          body: JSON.stringify({
            username: 'alteredByPrivilegedUser',
          }),
        }
      )

      expect(response.status).toBe(200)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: defaultUser.id,
        username: 'alteredByPrivilegedUser',
        features: defaultUser.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()
      expect(responseBody.updated_at > responseBody.created_at).toBe(true)
    })
  })
})
