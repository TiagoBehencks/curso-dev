import { NextRequest, NextResponse } from 'next/server'

import {
  ForbiddenError,
  InternalServerError,
  MethodNotAllowedError,
} from 'infra/errors'
import { Feature } from 'models/features'
import {
  getVersion,
  getMaxConnection,
  getOpenedConnections,
} from 'infra/database'
import { canRequest } from 'infra/middleware'

export async function GET(request: NextRequest) {
  let maxConnections: number
  let openedConnections: number

  try {
    const sessionToken = request.cookies.get('session_id')?.value
    const hasSession = !!sessionToken
    maxConnections = await getMaxConnection()
    openedConnections = await getOpenedConnections()

    let hasReadStatusFeature = false

    if (hasSession) {
      await canRequest({ request, feature: Feature.READ_STATUS })
      hasReadStatusFeature = true
    }

    const updatedAt = new Date().toISOString()

    if (!hasReadStatusFeature) {
      return NextResponse.json(
        {
          updated_at: updatedAt,
          dependecies: {
            database: {
              max_connections: maxConnections,
              opened_connections: openedConnections,
            },
          },
        },
        { status: 200 }
      )
    }

    const version = await getVersion()

    return NextResponse.json(
      {
        updated_at: updatedAt,
        dependecies: {
          database: {
            postgres_version: version,
            max_connections: maxConnections,
            opened_connections: openedConnections,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof ForbiddenError) {
      const updatedAt = new Date().toISOString()
      return NextResponse.json(
        {
          updated_at: updatedAt,
          dependecies: {
            database: {
              max_connections: maxConnections,
              opened_connections: openedConnections,
            },
          },
        },
        { status: 200 }
      )
    }

    const publicErrorObject = new InternalServerError({
      cause: error,
    })

    return NextResponse.json(
      { error: 'Failed to get status', details: publicErrorObject },
      { status: 500 }
    )
  }
}

export function POST() {
  return methodNotAllowedResponse()
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
