import { NextResponse } from 'next/server'
import { UserInputValues, user } from 'models/user'
import { ValidationError } from 'infra/errors'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userInputValues = body as UserInputValues
    const newUser = await user.create(userInputValues)

    return NextResponse.json(newUser, {
      status: 201,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(error, {
        status: error.statusCode,
      })
    }

    return NextResponse.json(error, {
      status: error?.statusCode || 500,
    })
  }
}
