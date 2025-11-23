import { NextResponse } from 'next/server'

import { AppError } from 'infra/errors'
import { canRequest } from 'infra/middleware'

import { UserInputValues, user } from 'models/user'
import { activation } from 'models/activation'
import { Feature } from 'models/features'

export async function POST(request: Request) {
  try {
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

    return NextResponse.json(newUser, {
      status: 201,
    })
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
      status: error?.statusCode || 500,
    })
  }
}
