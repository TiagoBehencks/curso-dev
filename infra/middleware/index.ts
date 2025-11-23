import { NextRequest, NextResponse } from 'next/server'

import { authorization } from 'models/authorization'
import { session } from 'models/session'
import { User, user } from 'models/user'
import { Feature } from 'models/features'

import { ForbiddenError } from 'infra/errors'

async function injectAuthenticatedUser(request: NextRequest) {
  const sessionToken = request.cookies.get('session_id')?.value

  const found = await session.findOneValidByToken({ token: sessionToken })

  const userObject = await user.findOneById(found.user_id)

  const headers = new Headers(request.headers)
  headers.set('x-user-features', userObject.features.join(','))

  return NextResponse.next({ request: { headers } })
}

function injectAnonymousUser(request: NextRequest) {
  const anonymousUser: Partial<User> = {
    features: [
      Feature.CREATE_USER,
      Feature.CREATE_SESSION,
      Feature.READ_ACTIVATION_TOKEN,
    ],
  }
  const headers = new Headers(request.headers)
  headers.set('x-user-features', anonymousUser.features!.join(','))

  return NextResponse.next({ request: { headers } })
}

export function injectAnonymousOrUser(request: NextRequest) {
  const hasSessionId = request.cookies.has('session_id')

  if (hasSessionId) {
    return injectAuthenticatedUser(request)
  }

  return injectAnonymousUser(request)
}

type CanRequestParams = {
  feature: Feature
  request: Request | NextRequest
}

export async function canRequest({ feature, request }: CanRequestParams) {
  const raw = request.headers.get('x-user-features') || ''
  const features = raw
    .split(',')
    .map((f) => f.trim())
    .filter((f): f is Feature => Object.values(Feature).includes(f as Feature))

  const user = {
    features,
  } as User

  if (authorization.can({ user, feature })) {
    return NextResponse.next()
  }

  throw new ForbiddenError({
    message: 'You do not have permission to perform this action',
    action: `Check if your user has the feature ${feature}`,
  })
}
