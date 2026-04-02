import { NextResponse } from 'next/server'

import { AppError, TooManyRequestsError } from 'infra/errors'
import { canRequest } from 'infra/middleware'
import { rateLimit, RATE_LIMITS } from 'infra/rate-limit'

import { activation } from 'models/activation'
import { authorization } from 'models/authorization'
import { Feature } from 'models/features'
import { UserInputValues, user } from 'models/user'

export async function POST(request: Request) {
  try {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    await rateLimit.checkRateLimit({
      ip: clientIp,
      endpoint: 'users',
      ...RATE_LIMITS.users,
    })

    await canRequest({ request, feature: Feature.CREATE_USER })
    const body = await request.json()
    const userInputValues = body as UserInputValues
    const newUser = await user.create(userInputValues)

    const { id } = await activation.create({ id: newUser.id })
    await activation.sendEmailToUser({
      email: newUser.email,
      username: newUser.username,
      activationToken: id,
    })

    const secureOutputValues = authorization.filterOutput({
      user: newUser,
      feature: Feature.CREATE_USER,
      resource: newUser,
    })

    return NextResponse.json(secureOutputValues, {
      status: 201,
    })
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      return NextResponse.json(error.toJSON(), {
        status: error.statusCode,
      })
    }

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
      status: error?.statusCode || 500,
    })
  }
}
