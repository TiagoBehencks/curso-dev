import { InternalServerError, MethodNotAllowedError } from 'infra/errors'
import {
  getVersion,
  getMaxConnection,
  getOpenedConnections,
} from 'infra/database'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const updatedAt = new Date().toISOString()
    const version = await getVersion()
    const maxConnections = await getMaxConnection()
    const openedConnections = await getOpenedConnections()

    return NextResponse.json(
      {
        updated_at: updatedAt,
        dependecies: {
          database: {
            potgres_version: version,
            max_connections: maxConnections,
            opened_connections: openedConnections,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const publicErrorObject = new InternalServerError({
      cause: error,
    })

    console.log('\n Erro dentro do catch do controller')
    console.error(publicErrorObject.message)

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
