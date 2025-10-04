import { session } from 'models/session'
import { NextResponse } from 'next/server'

type SessionTokenParams = {
  token: string
  response: NextResponse
}

export function setSessionCookie({ token, response }: SessionTokenParams) {
  response.cookies.set('session_id', token, {
    path: '/',
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })

  return response
}

export function clearSessionCookie({
  response,
}: Pick<SessionTokenParams, 'response'>) {
  response.cookies.set('session_id', 'invalid', {
    path: '/',
    maxAge: -1,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })

  return response
}
