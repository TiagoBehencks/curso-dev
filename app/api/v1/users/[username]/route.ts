import { NextResponse } from 'next/server'

import { AppError, ForbiddenError, NotFoundError } from 'infra/errors'
import { canRequest } from 'infra/middleware'

import { authorization } from 'models/authorization'
import { Feature } from 'models/features'
import { User, user, UserInputValues } from 'models/user'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    // await canRequest({
    //   request,
    //   feature: Feature.READ_USER,
    // })

    const userTryingToGet = JSON.parse(
      request.headers.get('x-user') || '{}'
    ) as User
    const { username } = await params

    const userFound = await user.findOneByUsername(username)

    const secureOutputValues = authorization.filterOutput({
      user: userTryingToGet,
      feature: Feature.READ_USER,
      resource: userFound,
    })

    return NextResponse.json(secureOutputValues, {
      status: 200,
    })
  } catch (error) {
    if (error instanceof NotFoundError) {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await canRequest({
      request,
      feature: Feature.UPDATE_USER,
    })

    const { username } = await params
    const body = await request.json()
    const userInputValues = body as UserInputValues

    const userTryingToBeUpdated = JSON.parse(
      request.headers.get('x-user') || '{}'
    ) as User
    const targetUser = await user.findOneByUsername(username)

    if (
      !authorization.can({
        user: userTryingToBeUpdated,
        feature: Feature.UPDATE_USER,
        resource: targetUser,
      })
    ) {
      throw new ForbiddenError({
        message: 'You do not have permission to perform this action',
        action: 'Check if your user has the feature update:user',
      })
    }

    const updatedUser = await user.update(username, userInputValues)
    const secureOutputValues = authorization.filterOutput({
      user: userTryingToBeUpdated,
      feature: Feature.UPDATE_USER,
      resource: updatedUser,
    })

    return NextResponse.json(secureOutputValues, {
      status: 200,
    })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
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
      status: 500,
    })
  }
}
