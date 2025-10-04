import { beforeAll } from 'vitest'
import { waitForAllServices, cleanDatabase } from './orchestrator'

beforeAll(async () => {
  await waitForAllServices()
  await cleanDatabase()
})
