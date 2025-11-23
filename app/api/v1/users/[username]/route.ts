import { NextResponse } from 'next/server'

import { NotFoundError } from 'infra/errors'
import { AppError } from 'infra/errors'

import { user, UserInputValues } from 'models/user'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    const userFound = await user.findOneByUsername(username)

    return NextResponse.json(userFound, {
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
    const { username } = await params
    const body = await request.json()
    const userInputValues = body as UserInputValues

    const updatedUser = await user.update(username, userInputValues)

    return NextResponse.json(updatedUser, {
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
