import { beforeAll, describe, expect, test } from 'vitest'
import { version as uuidVersion } from 'uuid'

import { user } from 'models/user'
import { password } from 'models/password'
import { runPendingMigrations } from 'tests/orchestrator'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('POST /api/v1/users', () => {
  describe('Anonymous user', () => {
    test('With unique and valid data', async () => {
      const response = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'tiago',
          email: 'tiago@tiago.com',
          password: 'password123',
        }),
      })

      expect(response.status).toBe(201)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: 'tiago',
        email: 'tiago@tiago.com',
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()

      const userInDatabase = await user.findOneByUsername('tiago')

      const correctPasswordMatch = await password.compare(
        'password123',
        userInDatabase.password
      )

      expect(correctPasswordMatch).toBe(true)

      const incorrectPasswordMatch = await password.compare(
        'wrongpassword',
        userInDatabase.password
      )

      expect(incorrectPasswordMatch).toBe(false)
    })

    test('With duplicate email', async () => {
      const response1 = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'email duplicate1',
          email: 'x@tiago.com',
          password: 'password123',
        }),
      })

      expect(response1.status).toBe(201)

      const response2 = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'email duplicate2',
          email: 'x@tiago.com',
          password: 'password123',
        }),
      })

      expect(response2.status).toBe(400)

      const responseBody2 = await response2.json()

      expect(responseBody2).toEqual({
        name: 'ValidationError',
        message: 'The email has been taken.',
        action: 'Try another email',
        status_code: 400,
      })
    })

    test('With duplicate username', async () => {
      const response1 = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'usernameduplicate',
          email: 'abc@tiago.com',
          password: 'password123',
        }),
      })

      expect(response1.status).toBe(201)

      const response2 = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'usernameduplicate',
          email: 'bca@tiago.com',
          password: 'password123',
        }),
      })

      expect(response2.status).toBe(400)

      const responseBody2 = await response2.json()

      expect(responseBody2).toEqual({
        name: 'ValidationError',
        message: 'The username has been taken.',
        action: 'Try another username',
        status_code: 400,
      })
    })
  })
})
