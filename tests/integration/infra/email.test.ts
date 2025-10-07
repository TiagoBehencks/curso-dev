import { describe, expect, test } from 'vitest'
import { send } from 'infra/email'
import { deleteAllEmails, getLastEmail } from 'tests/orchestrator'

describe('infra/email', () => {
  test('send', async () => {
    await deleteAllEmails()

    await send({
      from: 'Test <test@test.com.br>',
      to: 'test@test.dev',
      subject: 'Test subject',
      text: 'Test text',
    })

    await send({
      from: 'Test <test@test.com.br>',
      to: 'test@test.dev',
      subject: 'The last',
      text: 'The last email body',
    })

    const lastEmail = await getLastEmail()
    expect(lastEmail).toBeDefined()
    expect(lastEmail.sender).toBe('<test@test.com.br>')
    expect(lastEmail.recipients).toEqual(['<test@test.dev>'])
    expect(lastEmail.subject).toBe('The last')
    expect(lastEmail.text).toBe('The last email body\n')
  })
})
