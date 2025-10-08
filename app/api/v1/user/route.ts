import { NextRequest, NextResponse } from 'next/server'

import { UnauthorizedError } from 'infra/errors'
import { session } from 'models/session'
import { user } from 'models/user'
import { clearSessionCookie, setSessionCookie } from 'infra/cookies'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_id').value

    const sessionObject = await session.findOneValidByToken({
      token: sessionToken,
    })
    const userFound = await user.findOneById(sessionObject.user_id)
    const renewedSessionObject = await session.renewed({
      id: sessionObject.id,
    })

    const response = NextResponse.json(userFound, { status: 200 })

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
      const response = NextResponse.json(error, {
        status: error.statusCode,
      })
      clearSessionCookie({ response })
      return response
    }

    return NextResponse.json(error, {
      status: 500,
    })
  }
}
