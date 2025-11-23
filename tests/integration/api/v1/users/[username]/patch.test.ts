import { beforeAll, describe, expect, test } from 'vitest'
import { version as uuidVersion } from 'uuid'

import { user } from 'models/user'
import { password } from 'models/password'
import { createUser, runPendingMigrations } from 'tests/orchestrator'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('PATCH /api/v1/users/[username]', () => {
  describe('Anonymous user', () => {
    test('With nonexistent "username"', async () => {
      const response = await fetch(
        'http://localhost:3000/api/v1/users/nonexistent',
        {
          method: 'PATCH',
          body: JSON.stringify({
            username: 'tiago',
            email: 'tiago@tiago.com',
            password: 'password123',
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
      const response = await fetch(
        'http://localhost:3000/api/v1/users/nonexistent',
        {
          method: 'PATCH',
        }
      )

      expect(response.status).toBe(400)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        error: 'Invalid JSON in request body',
      })
    })

    test('With duplicate "username"', async () => {
      await createUser({
        username: 'user1',
      })

      await createUser({
        username: 'user2',
      })

      const response = await fetch('http://localhost:3000/api/v1/users/user2', {
        method: 'PATCH',
        body: JSON.stringify({
          username: 'user1',
        }),
      })
      expect(response.status).toBe(400)
    })

    test('With duplicate "email"', async () => {
      await createUser({
        email: 'email@tiago.com',
      })
      const createdUser2 = await createUser({
        password: 'password123',
      })

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser2.username}`,
        {
          method: 'PATCH',
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

      const response = await fetch(
        'http://localhost:3000/api/v1/users/uniqueUser1',
        {
          method: 'PATCH',
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
        password: responseBody.password,
        features: responseBody.features,
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

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${user.username}`,
        {
          method: 'PATCH',
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
        email: 'uniqueEmail2@tiago.com',
        password: responseBody.password,
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

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${userCreated.username}`,
        {
          method: 'PATCH',
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
        password: responseBody.password,
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
})
