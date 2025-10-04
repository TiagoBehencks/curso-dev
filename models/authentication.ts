import { NotFoundError, UnauthorizedError } from 'infra/errors'

import { user, User } from './user'
import { password as passwordModel } from './password'

export type AuthenticationUserData = {
  email: string
  password: string
}

type Password = {
  providedPassword: string
  storedPassword: string
}

async function getAuthenticatedUser({
  email,
  password,
}: AuthenticationUserData): Promise<User> {
  try {
    const storedUser = await findUserByEmail(email)
    await validatePassword({
      providedPassword: password,
      storedPassword: storedUser.password,
    })

    return storedUser
  } catch (error) {
    throw error
  }

  async function findUserByEmail(email: string) {
    try {
      return await user.findOneByEmail(email)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError({
          message: 'Wrong values',
          action: 'Try again',
        })
      }

      throw error
    }
  }

  async function validatePassword({
    providedPassword,
    storedPassword,
  }: Password) {
    const correctPasswordMatch = await passwordModel.compare(
      providedPassword,
      storedPassword
    )

    if (!correctPasswordMatch) {
      throw new UnauthorizedError({
        message: 'Wrong password',
        action: 'Try again',
      })
    }
  }
}

export const authentication = {
  getAuthenticatedUser,
}
