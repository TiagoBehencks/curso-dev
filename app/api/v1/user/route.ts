import { NextRequest, NextResponse } from 'next/server'

import { AppError, ForbiddenError, UnauthorizedError } from 'infra/errors'
import { Feature } from 'models/features'
import { session } from 'models/session'
import { user } from 'models/user'

import { clearSessionCookie, setSessionCookie } from 'infra/cookies'
import { canRequest } from 'infra/middleware'
import { authorization } from 'models/authorization'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_id')?.value

    if (!sessionToken) {
      throw new ForbiddenError({
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature read:session',
      })
    }

    const sessionObject = await session.findOneValidByToken({
      token: sessionToken,
    })

    await canRequest({
      request,
      feature: Feature.READ_SESSION,
    })

    const userFound = await user.findOneById(sessionObject.user_id)

    const renewedSessionObject = await session.renewed({
      id: sessionObject.id,
    })
    const secureOutputValues = authorization.filterOutput({
      user: userFound,
      feature: Feature.READ_SESSION,
      resource: userFound,
    })

    const response = NextResponse.json(secureOutputValues, { status: 200 })

    const responseWithCookies = setSessionCookie({
      token: renewedSessionObject.token,
      response,
    })

    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, max-age=0, must-revalidate'
    )

    return responseWithCookies
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const response = NextResponse.json(
        {
          message: error.message,
          action: error.action,
          name: error.name,
          statusCode: error.statusCode,
        },
        {
          status: error.statusCode,
        }
      )
      clearSessionCookie({ response })
      return response
    }

    if (error instanceof AppError) {
      return NextResponse.json(error, {
        status: error.statusCode,
      })
    }

    return NextResponse.json(error, {
      status: 500,
    })
  }
}
