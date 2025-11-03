import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { AppError, ValidationError } from 'infra/errors'
import { clearSessionCookie, setSessionCookie } from 'infra/cookies'
import { authentication, AuthenticationUserData } from 'models/authentication'
import { session } from 'models/session'
import { canRequest } from 'infra/middleware'
import { Feature } from 'models/user'

export async function POST(request: Request) {
  try {
    await canRequest({
      feature: Feature.CREATE_SESSION,
      request,
    })
    const body = await request.json()
    const userInputValues = body as AuthenticationUserData

    if (!userInputValues.email || !userInputValues.password) {
      throw new ValidationError({
        message: 'E-mail and password required',
        action: 'Enter with e-mail and password',
        cause: 'NULL_USER_INPUT_VALUES',
      })
    }

    const autehnticatedUser = await authentication.getAuthenticatedUser({
      email: userInputValues.email,
      password: userInputValues.password,
    })

    const newSession = await session.create(autehnticatedUser.id)

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
      return NextResponse.json(error, {
        status: error.statusCode,
      })
    }

    return NextResponse.json(error, {
      status: 500,
    })
  }
}
