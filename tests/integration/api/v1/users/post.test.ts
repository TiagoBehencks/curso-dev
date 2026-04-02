import { beforeAll, describe, expect, test } from 'vitest'
import { version as uuidVersion } from 'uuid'

import { user } from 'models/user'
import { password } from 'models/password'

import {
  runPendingMigrations,
  createUser,
  createSession,
} from 'tests/orchestrator'
import { Feature } from 'models/features'

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
          'X-Forwarded-For': '10.0.2.1',
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
        features: responseBody.features,
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
          'X-Forwarded-For': '10.0.2.2',
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
          'X-Forwarded-For': '10.0.2.2',
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
        statusCode: 400,
      })
    })

    test('With duplicate username', async () => {
      const response1 = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.2.3',
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
          'X-Forwarded-For': '10.0.2.3',
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
        statusCode: 400,
      })
    })

    test('exceeds rate limit, then returns 429', async () => {
      const testIp = '192.168.2.100'
      const maxAttempts = 3

      for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch('http://localhost:3000/api/v1/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp,
          },
          body: JSON.stringify({
            username: `ratelimituser${Date.now()}_${i}`,
            email: `ratelimit${Date.now()}_${i}@email.com`,
            password: 'password123',
          }),
        })
        expect(response.status).toBe(201)
      }

      const rateLimitedResponse = await fetch(
        'http://localhost:3000/api/v1/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp,
          },
          body: JSON.stringify({
            username: `ratelimituser${Date.now()}_final`,
            email: `ratelimit${Date.now()}_final@email.com`,
            password: 'password123',
          }),
        }
      )

      expect(rateLimitedResponse.status).toBe(429)

      const responseBody = await rateLimitedResponse.json()

      expect(responseBody).toMatchObject({
        name: 'TooManyRequestsError',
        message: 'Too many requests',
        statusCode: 429,
      })
      expect(responseBody.action).toMatch(/Please try again in \d+ seconds/)
      expect(responseBody.retryAfter).toBeGreaterThan(0)
    })

    test('different IPs have independent rate limits', async () => {
      const ip1 = '192.168.2.101'
      const ip2 = '192.168.2.102'

      for (let i = 0; i < 3; i++) {
        await fetch('http://localhost:3000/api/v1/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ip1,
          },
          body: JSON.stringify({
            username: `ip1user${Date.now()}_${i}`,
            email: `ip1_${Date.now()}_${i}@email.com`,
            password: 'password123',
          }),
        })
      }

      const responseFromDifferentIp = await fetch(
        'http://localhost:3000/api/v1/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ip2,
          },
          body: JSON.stringify({
            username: `ip2user${Date.now()}`,
            email: `ip2_${Date.now()}@email.com`,
            password: 'password123',
          }),
        }
      )

      expect(responseFromDifferentIp.status).toBe(201)
    })
  })

  describe('Default user', () => {
    test('With unique and valid data', async () => {
      const createdUser = await createUser({
        features: [Feature.CREATE_SESSION],
      })
      const sessionObject = await createSession({ id: createdUser.id })

      const response = await fetch('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.2.4',
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          username: 'anotheruser',
          email: 'user@suser.com',
        }),
      })

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'ForbiddenError',
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature create:user',
        statusCode: 403,
      })
    })
  })
})
