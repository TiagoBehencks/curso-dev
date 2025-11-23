import { beforeAll, describe, expect, test, vitest } from 'vitest'
import setCookieParser from 'set-cookie-parser'
import { version as uuidVersion } from 'uuid'

import {
  runPendingMigrations,
  createUser,
  createSession,
} from 'tests/orchestrator'
import { session } from 'models/session'
import { Feature } from 'models/features'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('GET /api/v1/user', () => {
  describe('Anonymous user', () => {
    test('Retrieving the endpoint', async () => {
      const response = await fetch('http://localhost:3000/api/v1/user')

      expect(response.status).toBe(403)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        message: 'You do not have permission to perform this action',
        action: `Check if your user has the feature read:session`,
        name: 'ForbiddenError',
        statusCode: 403,
      })
    })
  })
  describe('Default user', () => {
    test('with valid session', async () => {
      const {
        id: userId,
        email,
        password,
      } = await createUser({
        username: 'UserWithValidSession',
        features: [Feature.CREATE_SESSION, Feature.READ_SESSION],
      })

      const sessionObject = await createSession({ id: userId })

      const response = await fetch('http://localhost:3000/api/v1/user', {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      })

      expect(response.status).toBe(200)

      const cacheControl = response.headers.get('Cache-Control')

      expect(cacheControl).toBe(
        'no-store, no-cache, max-age=0, must-revalidate'
      )

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        id: userId,
        username: 'UserWithValidSession',
        email,
        password,
        features: responseBody.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })

      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()
      const renewedSessionObject = await session.findOneValidByToken({
        token: sessionObject.token,
      })

      expect(
        renewedSessionObject.expires_at > sessionObject.expires_at
      ).toEqual(true)
      expect(
        renewedSessionObject.updated_at > sessionObject.updated_at
      ).toEqual(true)

      const parsedSetCookie = setCookieParser.parse(response, {
        map: true,
      })

      expect(parsedSetCookie.session_id).toMatchObject({
        name: 'session_id',
        value: renewedSessionObject.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: '/',
        sameSite: 'strict',
        httpOnly: true,
      })
    })

    test('with nonexistent session', async () => {
      const nonexistentToken = 'invalid-session-token'

      const response = await fetch('http://localhost:3000/api/v1/user', {
        headers: {
          Cookie: `session_id=${nonexistentToken}`,
        },
      })

      expect(response.status).toBe(401)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'UnauthorizedError',
        message: "User doesn't have an active session",
        action: 'Check if the user is logged in and try again.',
        statusCode: 401,
      })

      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      })

      expect(parsedSetCookie.session_id).toMatchObject({
        name: 'session_id',
        value: 'invalid',
        maxAge: -1,
        path: '/',
        httpOnly: true,
      })
    })

    test('with expired session', async () => {
      vitest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      })

      const { id: userId } = await createUser({
        username: 'UserWithExpiredSession',
        features: [Feature.CREATE_SESSION],
      })

      const sessionObject = await createSession({ id: userId })

      vitest.useRealTimers()

      const response = await fetch('http://localhost:3000/api/v1/user', {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      })

      expect(response.status).toBe(401)

      const responseBody = await response.json()

      expect(responseBody).toEqual({
        name: 'UnauthorizedError',
        message: "User doesn't have an active session",
        action: 'Check if the user is logged in and try again.',
        statusCode: 401,
      })

      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      })

      expect(parsedSetCookie.session_id).toMatchObject({
        name: 'session_id',
        value: 'invalid',
        maxAge: -1,
        path: '/',
        httpOnly: true,
      })
    })

    test('With 5 minutes left in session', async () => {
      vitest.useFakeTimers({
        now: new Date(
          Date.now() - session.EXPIRATION_IN_MILLISECONDS + 5 * 60 * 1000
        ), // 5 minutes left in session
      })

      const createdUser = await createUser({
        username: 'UserWith5MinutesLeftInSession',
        features: [Feature.CREATE_SESSION, Feature.READ_SESSION],
      })

      const sessionObject = await createSession({ id: createdUser.id })

      vitest.useRealTimers() // Restore time

      const response = await fetch('http://localhost:3000/api/v1/user', {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      })

      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        id: createdUser.id,
        username: 'UserWith5MinutesLeftInSession',
        email: createdUser.email,
        password: createdUser.password,
        features: responseBody.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      })
      expect(uuidVersion(responseBody.id)).toBe(4)
      expect(Date.parse(responseBody.created_at)).not.toBeNaN()
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN()

      const renewedSessionObject = await session.findOneValidByToken({
        token: sessionObject.token,
      })

      expect(renewedSessionObject.expires_at > sessionObject.expires_at).toBe(
        true
      )
      expect(renewedSessionObject.updated_at > sessionObject.updated_at).toBe(
        true
      )

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      })

      expect(parsedSetCookie.session_id).toMatchObject({
        name: 'session_id',
        value: renewedSessionObject.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: '/',
        sameSite: 'strict',
        httpOnly: true,
      })
    })
  })
})
