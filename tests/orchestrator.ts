import retry from 'async-retry'
import { faker } from '@faker-js/faker'

import { env } from 'env'
import { query } from 'infra/database'
import { runPendingMigrations as modelRunPendingMigrations } from 'models/migrator'
import { User, user, UserInputValues } from 'models/user'
import { session } from 'models/session'

const emailHttpUrl = `http://${env.EMAIL_HTTP_HOST}:${env.EMAIL_HTTP_PORT}`

export async function waitForAllServices() {
  await waitForWebServer()
  await waitForEmailServer()
}

async function waitForWebServer() {
  return retry(fetchStatusPage, {
    retries: 100,
    maxTimeout: 1000,
  })
}

async function fetchStatusPage() {
  const response = await fetch('http://localhost:3000/api/v1/status')
  if (response.status !== 200) {
    throw Error()
  }
}

async function waitForEmailServer() {
  return retry(fetchEmailPage, {
    retries: 100,
    maxTimeout: 1000,
  })
}

async function fetchEmailPage() {
  const response = await fetch(`${emailHttpUrl}`)
  if (response.status !== 200) {
    throw Error()
  }
}

export async function cleanDatabase() {
  await query('drop schema public cascade; create schema public;')
}

export async function runPendingMigrations() {
  await modelRunPendingMigrations()
}

export async function createUser({
  username,
  email,
  password,
}: Partial<UserInputValues>): Promise<User> {
  return await user.create({
    username: username || faker.internet.username().replace(/[_.-]/g, ''),
    email: email || faker.internet.email(),
    password: password || faker.internet.password(),
  })
}

export async function createSession({ id }: Pick<User, 'id'>) {
  return await session.create(id)
}

export async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: 'DELETE',
  })
}

type Mail = {
  id: number
  sender: string
  recipients: string
  subject: string
  size: string
  created_at: string
  text: string
}

export async function getLastEmail(): Promise<Mail | undefined> {
  try {
    const response = await fetch(`${emailHttpUrl}/messages`)
    const emails = (await response.json()) as Mail[]
    const lastEmail = emails.at(-1)

    if (!lastEmail) return null

    const emailTextResponse = await fetch(
      `${emailHttpUrl}/messages/${lastEmail.id}.plain`
    )
    const emailTextBody = await emailTextResponse.text()

    return {
      ...lastEmail,
      text: emailTextBody,
    }
  } catch (error) {
    throw new Error(`Erro em getLastEmail: ${(error as Error).message}`)
  }
}

export function extractUUIDFromText(text: string): string | null {
  const uuidV4Regex =
    /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  const match = text.match(uuidV4Regex)
  return match ? match[0] : null
}
