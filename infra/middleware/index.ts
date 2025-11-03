import { ForbiddenError } from 'infra/errors'
import { session } from 'models/session'
import { Feature, User, user } from 'models/user'
import { NextRequest, NextResponse } from 'next/server'

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

const VALID_FEATURES = new Set<string>(Object.values(Feature))

function isFeatureString(s: string): s is Feature {
  return VALID_FEATURES.has(s)
}

type CanRequestParams = {
  feature: Feature
  request: Request | NextRequest
}

export async function canRequest({ feature, request }: CanRequestParams) {
  const raw = request.headers.get('x-user-features') || ''

  const userFeatures = raw
    .split(',')
    .map((s) => s.trim())
    .filter(isFeatureString)

  if (userFeatures.includes(feature)) {
    return NextResponse.next()
  }

  throw new ForbiddenError({
    message: 'you do not have permission to perform this action',
    action: `check if your user has the feature ${feature}`,
  })
}
