import { NextResponse } from 'next/server'

import { AppError } from 'infra/errors'
import { canRequest } from 'infra/middleware'

import { activation } from 'models/activation'
import { Feature } from 'models/features'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token_id: string }> }
) {
  try {
    await canRequest({
      request,
      feature: Feature.READ_ACTIVATION_TOKEN,
    })

    const { token_id } = await params

    const activationObject = await activation.findOneValidById({
      id: token_id,
    })

    await activation.activeUserByUserId({
      id: activationObject.user_id,
    })

    const usedActivationToken = await activation.markTokenAsUsed({
      id: token_id,
    })

    return NextResponse.json(usedActivationToken, {
      status: 200,
    })
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
