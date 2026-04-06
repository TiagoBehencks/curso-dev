import { beforeAll, describe, expect, test } from 'vitest'
import setCookieParser from 'set-cookie-parser'
import { version as uuidVersion } from 'uuid'

import { createUser, runPendingMigrations } from 'tests/orchestrator'

import { webserver } from 'infra/webserver'

import { session } from 'models/session'
import { Feature } from 'models/features'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('POST /api/v1/sessions', () => {
  describe('Anonymous user', () => {
    test('with incorrect `email` but correct `password`', async () => {
      const correctPassword = 'correct-password'
      await createUser({
        password: correctPassword,
        features: [Feature.CREATE_SESSION],
      })

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.1.1',
        },
        body: JSON.stringify({
          email: 'wrongemail@email.com',
          password: correctPassword,
        }),
      })

      expect(response.status).toBe(401)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'UnauthorizedError',
        message: 'Wrong values',
        action: 'Try again',
        statusCode: 401,
      })
    })

    test('with incorrect `password` but correct `email`', async () => {
      const correctEmail = 'correctemail@email.com'
      await createUser({
        email: 'correctemail@email.com',
      })

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.1.2',
        },
        body: JSON.stringify({
          email: correctEmail,
          password: 'wrong-password',
        }),
      })

      expect(response.status).toBe(401)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'UnauthorizedError',
        message: 'Wrong password',
        action: 'Try again',
        statusCode: 401,
      })
    })

    test('with incorrect `email` and `password`', async () => {
      await createUser({
        email: 'email@email.com',
        password: 'password',
      })

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.1.3',
        },
        body: JSON.stringify({
          email: 'wrong@email.com',
          password: 'wrong-password',
        }),
      })

      expect(response.status).toBe(401)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'UnauthorizedError',
        message: 'Wrong values',
        action: 'Try again',
        statusCode: 401,
      })
    })

    test('with correct `email` and `password`', async () => {
      const createdUser = await createUser({
        email: 'correct@email.com',
        password: 'password',
        features: [Feature.CREATE_SESSION],
      })

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.1.4',
        },
        body: JSON.stringify({
          email: 'correct@email.com',
          password: 'password',
        }),
      })

      expect(response.status).toBe(201)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: createdUser.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })
      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN()
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()

      const expiresAt = new Date(responseBody.expires_at)
      const createdAt = new Date(responseBody.created_at)

      expiresAt.setMilliseconds(0)
      createdAt.setMilliseconds(0)

      expect(expiresAt.getTime() - createdAt.getTime()).toBe(
        session.EXPIRATION_IN_MILLISECONDS
      )

      const parsedSetCookie = setCookieParser.parse(response, {
        map: true,
      })

      expect(parsedSetCookie.session_id).toMatchObject({
        name: 'session_id',
        value: responseBody.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: '/',
        sameSite: 'strict',
        httpOnly: true,
      })
    })

    test('given empty credentials, when creating a session, then returns 400', async () => {
      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.1.5',
        },
        body: JSON.stringify({
          email: '',
          password: '',
        }),
      })

      expect(response.status).toBe(400)
    })

    test('without `body`', async () => {
      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.1.6',
        },
      })

      expect(response.status).toBe(500)
    })

    test('exceeds rate limit, then returns 429', async () => {
      const testIp = '192.168.1.100'
      const maxAttempts = 5

      for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp,
          },
          body: JSON.stringify({
            email: 'nonexistent@email.com',
            password: 'wrong-password',
          }),
        })
        expect(response.status).toBe(401)
      }

      const rateLimitedResponse = await fetch(
        `${webserver.origin}/api/v1/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp,
          },
          body: JSON.stringify({
            email: 'nonexistent@email.com',
            password: 'wrong-password',
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
      const ip1 = '192.168.1.101'
      const ip2 = '192.168.1.102'

      for (let i = 0; i < 5; i++) {
        await fetch(`${webserver.origin}/api/v1/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ip1,
          },
          body: JSON.stringify({
            email: 'nonexistent1@email.com',
            password: 'wrong-password',
          }),
        })
      }

      const responseFromDifferentIp = await fetch(
        `${webserver.origin}/api/v1/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ip2,
          },
          body: JSON.stringify({
            email: 'nonexistent2@email.com',
            password: 'wrong-password',
          }),
        }
      )

      expect(responseFromDifferentIp.status).toBe(401)
    })
  })
})
