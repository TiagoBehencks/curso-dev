import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { AppError, ForbiddenError, ValidationError } from 'infra/errors'
import { clearSessionCookie, setSessionCookie } from 'infra/cookies'
import { authentication, AuthenticationUserData } from 'models/authentication'
import { session } from 'models/session'
import { authorization } from 'models/authorization'
import { Feature } from 'models/features'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userInputValues = body as AuthenticationUserData

    if (!userInputValues.email || !userInputValues.password) {
      throw new ValidationError({
        message: 'E-mail and password required',
        action: 'Enter with e-mail and password',
        cause: 'NULL_USER_INPUT_VALUES',
      })
    }

    const authenticatedUser = await authentication.getAuthenticatedUser({
      email: userInputValues.email,
      password: userInputValues.password,
    })

    const canCreateSession = authorization.can({
      user: authenticatedUser,
      feature: Feature.CREATE_SESSION,
    })

    if (!canCreateSession) {
      throw new ForbiddenError({
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature',
      })
    }

    const newSession = await session.create(authenticatedUser.id)

    const response = NextResponse.json(newSession, { status: 201 })

    const responseWithCookies = setSessionCookie({
      token: newSession.token,
      response,
    })

    return responseWithCookies
  } catch (error) {
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

export async function DELETE() {
  try {
    const sessionToken = (await cookies()).get('session_id').value
    const sessionObject = await session.findOneValidByToken({
      token: sessionToken,
    })

    const expiredSession = await session.expireById({
      id: sessionObject.id,
    })

    const response = NextResponse.json(expiredSession, {
      status: 200,
    })

    const responseWithExpieredCookie = clearSessionCookie({
      response,
    })

    return responseWithExpieredCookie
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
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
    }

    return NextResponse.json(error, {
      status: 500,
    })
  }
}
