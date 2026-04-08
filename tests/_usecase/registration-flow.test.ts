import { activation } from 'models/activation'
import { Session } from 'models/session'
import {
  deleteAllEmails,
  extractUUIDFromText,
  getLastEmail,
  runPendingMigrations,
} from 'tests/orchestrator'
import { version as uuidVersion } from 'uuid'
import { beforeAll, describe, expect, test } from 'vitest'

import { webserver } from 'infra/webserver'
import { Feature } from 'models/features'
import { user, User } from 'models/user'

beforeAll(async () => {
  await Promise.all([runPendingMigrations(), deleteAllEmails()])
})

describe('Use case: Registration Flow (all successful)', () => {
  let createUserResponseBody: User
  let activationTokenId: string
  let createSessionResponseBody: Session

  test('Create user account', async () => {
    const createUserResponse = await fetch(`${webserver.origin}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'RegistrationFlow',
        email: 'registrationflow@test.com',
        password: 'registrtionflowpassword',
      }),
    })

    expect(createUserResponse.status).toBe(201)

    createUserResponseBody = await createUserResponse.json()

    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: 'RegistrationFlow',
      features: ['read:activation_token'],
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    })
  })

  test('Receive activation email', async () => {
    const lastEmail = await getLastEmail()

    expect(lastEmail.sender).toBe('<contato@behenck.dev.br>')
    expect(lastEmail.recipients[0]).toEqual('<registrationflow@test.com>')
    expect(lastEmail.subject).toBe('Activate your registration')
    expect(lastEmail.text).toContain('RegistrationFlow')

    activationTokenId = extractUUIDFromText(lastEmail.text)
    const activationObject = await activation.findOneValidById({
      id: activationTokenId,
    })

    expect(lastEmail.text).toContain(
      `${webserver.origin}/register/activate/${activationTokenId}`
    )
    expect(uuidVersion(createUserResponseBody.id)).toBe(4)
    expect(uuidVersion(activationObject.user_id)).toBe(4)
    expect(createUserResponseBody.id).toBe(activationObject.user_id)
    expect(activationObject.used_at).toBe(null)
  })

  test('Activate account', async () => {
    const activationResponse = await fetch(
      `${webserver.origin}/api/v1/activations/${activationTokenId}`,
      {
        method: 'PATCH',
      }
    )

    const activationResponseBody = await activationResponse.json()
    expect(Date.parse(activationResponseBody.used_at)).not.toBeNaN()

    const activatedUser = await user.findOneByUsername('RegistrationFlow')
    expect(activatedUser.features).toEqual([
      Feature.CREATE_SESSION,
      Feature.READ_SESSION,
      Feature.UPDATE_USER,
    ])
  })

  test('Login', async () => {
    const createSession = await fetch(`${webserver.origin}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'registrationflow@test.com',
        password: 'registrtionflowpassword',
      }),
    })

    expect(createSession.status).toBe(201)

    createSessionResponseBody = await createSession.json()

    expect(createSessionResponseBody.user_id).toBe(createUserResponseBody.id)
  })

  test('Get user information', async () => {
    const userResponse = await fetch(`${webserver.origin}/api/v1/user`, {
      headers: {
        Cookie: `session_id=${createSessionResponseBody.token}`,
      },
    })

    expect(userResponse.status).toBe(200)

    const userResponseBody = await userResponse.json()

    expect(userResponseBody.id).toEqual(createUserResponseBody.id)
  })
})
