import { beforeAll, describe, expect, test } from 'vitest'
import {
  deleteAllEmails,
  getLastEmail,
  runPendingMigrations,
} from 'tests/orchestrator'
import { activation } from 'models/activation'
import { User } from 'models/user'

beforeAll(async () => {
  await Promise.all([runPendingMigrations(), deleteAllEmails()])
})

describe('Use case: Registration Flow (all successful)', () => {
  let createUserResponseBody: User
  test('Create user account', async () => {
    const createUserResponse = await fetch(
      'http://localhost:3000/api/v1/users',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'RegistrationFlow',
          email: 'registrationflow@test.com',
          password: 'registrtionflowpassword',
        }),
      }
    )

    expect(createUserResponse.status).toBe(201)

    createUserResponseBody = await createUserResponse.json()

    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: 'RegistrationFlow',
      email: 'registrationflow@test.com',
      password: createUserResponseBody.password,
      features: ['read:activation_token'],
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    })
  })

  test('Receive activation email', async () => {
    const lastEmail = await getLastEmail()

    const activationToken = await activation.findOneByUserId({
      id: createUserResponseBody.id,
    })

    console.log(activationToken)

    expect(lastEmail.sender).toBe('<test@test.com.br>')
    expect(lastEmail.recipients[0]).toEqual('<registrationflow@test.com>')
    expect(lastEmail.subject).toBe('Activate your registration')
    expect(lastEmail.text).toContain('RegistrationFlow')
    expect(lastEmail.text).toContain(activationToken.id)
  })
})
