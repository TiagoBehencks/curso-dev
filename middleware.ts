import { NextResponse, type NextRequest } from 'next/server'

import { injectAnonymousOrUser } from 'infra/middleware'
import { AppError, UnauthorizedError } from 'infra/errors'
import { clearSessionCookie } from 'infra/cookies'

export default async function middleware(request: NextRequest) {
  try {
    return await injectAnonymousOrUser(request)
  } catch (err: unknown) {
    const error = normalizeError(err)

    if (error instanceof UnauthorizedError) {
      const response = jsonErrorResponse(error)
      clearSessionCookie({ response })

      return response
    }

    if (error instanceof AppError) {
      return jsonErrorResponse(error)
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof AppError) return error

  return new Error(String(error))
}

function jsonErrorResponse(error: AppError | UnauthorizedError): NextResponse {
  return NextResponse.json(
    {
      name: error.name,
      message: error.message,
      action: error.action ?? null,
      status_code: error.statusCode ?? 500,
    },
    { status: error.statusCode ?? 500 }
  )
}

export const config = {
  matcher: ['/api/:path*'],
  runtime: 'nodejs',
}
