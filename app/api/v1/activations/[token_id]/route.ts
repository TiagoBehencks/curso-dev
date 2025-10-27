import { activation } from 'models/activation'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token_id: string }> }
) {
  try {
    const { token_id } = await params
    const activationObject = await activation.findOneValidById({
      id: token_id,
    })
    const usedActivationToken = await activation.markTokenAsUsed({
      id: token_id,
    })

    await activation.activeUserByUserId({
      id: activationObject.user_id,
    })
    return NextResponse.json(usedActivationToken, {
      status: 200,
    })
  } catch (error) {
    return NextResponse.json(error, {
      status: 500,
    })
  }
}
