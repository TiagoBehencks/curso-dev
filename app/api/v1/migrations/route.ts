import { NextResponse } from 'next/server'

import { AppError, MethodNotAllowedError } from 'infra/errors'
import { canRequest } from 'infra/middleware'
import { Feature } from 'models/features'
import { listPendingMigrations, runPendingMigrations } from 'models/migrator'

export async function GET(request: Request) {
  try {
    await canRequest({
      request,
      feature: Feature.GET_PENDING_MIGRATIONS,
    })

    const { migrations: pendingMigrations } = await listPendingMigrations()

    return NextResponse.json(pendingMigrations, { status: 200 })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error, {
        status: error.statusCode,
      })
    }

    return NextResponse.json(
      { error: 'Migration check failed', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await canRequest({
      request,
      feature: Feature.RUN_MIGRATIONS,
    })

    const { migrations: migratedMigrations } = await runPendingMigrations()

    const hasMigrations = migratedMigrations.length > 0

    return NextResponse.json(migratedMigrations, {
      status: hasMigrations ? 201 : 200,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error, {
        status: error.statusCode,
      })
    }

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
