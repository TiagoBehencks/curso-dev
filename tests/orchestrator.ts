import retry from 'async-retry'
import { faker } from '@faker-js/faker'

import { query } from 'infra/database'
import { runPendingMigrations as modelRunPendingMigrations } from 'models/migrator'
import { User, user, UserInputValues } from 'models/user'
import { session } from 'models/session'

export async function waitForAllServices() {
  await waitForWebServer()
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
