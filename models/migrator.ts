import { resolve } from 'node:path'
import migrationRunner from 'node-pg-migrate'
import { RunnerOptionConfig } from 'node-pg-migrate/dist/types'
import { RunMigration } from 'node-pg-migrate/dist/migration'

import { getNewClient } from 'infra/database'
import { ServiceError } from 'infra/errors'

const defaultMigratioOptions: RunnerOptionConfig = {
  dryRun: true,
  dir: resolve('infra', 'migrations'),
  direction: 'up',
  log: () => {},
  migrationsTable: 'pgmigrations',
}

export async function listPendingMigrations(): Promise<{
  migrations: RunMigration[]
}> {
  let dbClient

  try {
    dbClient = await getNewClient()

    const migrations = await migrationRunner({
      ...defaultMigratioOptions,
      dbClient,
    })

    return { migrations }
  } catch (error) {
    const serviceErrorObject = new ServiceError({
      message: 'Error in database or query connection.',
      cause: error,
    })
    throw serviceErrorObject
  } finally {
    if (dbClient) {
      await dbClient.end()
    }
  }
}

export async function runPendingMigrations(): Promise<{
  migrations: RunMigration[]
}> {
  let dbClient

  try {
    dbClient = await getNewClient()

    const migrations = await migrationRunner({
      ...defaultMigratioOptions,
      dryRun: false,
      dbClient,
    })

    return { migrations }
  } catch (error) {
    const serviceErrorObject = new ServiceError({
      message: 'Error in database or query connection.',
      cause: error,
    })
    throw serviceErrorObject
  } finally {
    if (dbClient) {
      await dbClient.end()
    }
  }
}
