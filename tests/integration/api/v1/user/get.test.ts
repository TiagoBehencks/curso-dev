import { beforeAll, describe, expect, test, vitest } from 'vitest'
import setCookieParser from 'set-cookie-parser'
import { version as uuidVersion } from 'uuid'

import {
  runPendingMigrations,
  createUser,
  createSession,
} from 'tests/orchestrator'
import { session } from 'models/session'

beforeAll(async () => {
  await runPendingMigrations()
})

describe('GET /api/v1/user', () => {
  describe('Default user', () => {
    test('with valid session', async () => {
      const {
        id: userId,
        email,
        password,
        features,
        created_at,
        updated_at,
      } = await createUser({
        username: 'UserWithValidSession',
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
        features,
        created_at: created_at.toISOString(),
        updated_at: updated_at.toISOString(),
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
        status_code: 401,
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
        status_code: 401,
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
        features: createdUser.features,
        created_at: createdUser.created_at.toISOString(),
        updated_at: createdUser.updated_at.toISOString(),
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
