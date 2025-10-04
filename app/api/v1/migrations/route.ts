import { NextResponse } from 'next/server'

import { MethodNotAllowedError } from 'infra/errors'
import { listPendingMigrations, runPendingMigrations } from 'models/migrator'

export async function GET() {
  try {
    const { migrations: pendingMigrations } = await listPendingMigrations()

    return NextResponse.json(pendingMigrations, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration check failed', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const { migrations: migratedMigrations } = await runPendingMigrations()

    const hasMigrations = migratedMigrations.length > 0

    return NextResponse.json(migratedMigrations, {
      status: hasMigrations ? 201 : 200,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration execution failed', details: error.message },
      { status: 500 }
    )
  }
}

export function PUT() {
  return methodNotAllowedResponse()
}

export function DELETE() {
  return methodNotAllowedResponse()
}

export function PATCH() {
  return methodNotAllowedResponse()
}

function methodNotAllowedResponse() {
  const publicErrorObject = new MethodNotAllowedError()

  return NextResponse.json(publicErrorObject, { status: 405 })
}
