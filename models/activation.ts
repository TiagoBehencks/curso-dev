import { send } from 'infra/email'
import { query } from 'infra/database'
import { webserver } from 'infra/webserver'
import { Feature, user, User } from './user'
import { NotFoundError } from 'infra/errors'

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000 // 15 minutes

type Activation = {
  id: string
  used_at?: Date
  user_id: string
  expires_at: Date
  created_at: Date
  updated_at: Date
}

type UserActivationTokenInsertData = {
  expiresAt: Date
} & Pick<User, 'id'>

async function create({ id }: Pick<User, 'id'>): Promise<Activation> {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS)

  const newToken = await runInsertQuery({
    id,
    expiresAt,
  })

  return newToken

  async function runInsertQuery({
    id: userId,
    expiresAt,
  }: UserActivationTokenInsertData) {
    const results = await query({
      text: `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING
          *
      ;`,
      values: [userId, expiresAt],
    })

    return results.rows[0] as Activation
  }
}

type SendEmailToUserParams = {
  activationToken: string
} & Pick<User, 'email' | 'username'>

async function sendEmailToUser({
  email,
  username,
  activationToken,
}: SendEmailToUserParams) {
  await send({
    from: 'Test <test@test.com.br>',
    to: email,
    subject: 'Activate your registration',
    text: `${username}, click on the link below to activate your registration:

${webserver.origin}/register/activate/${activationToken}

:)
`,
  })
}

async function findOneByUserId({ id }: Pick<User, 'id'>): Promise<Activation> {
  const token = await runSelectQuery({ id })

  return token

  async function runSelectQuery({ id }: Pick<User, 'id'>) {
    const result = await query({
      text: ` 
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          user_id = $1
        LIMIT
          1
        ;`,
      values: [id],
    })

    return result.rows[0] as Activation
  }
}

async function findOneValidById({
  id,
}: Pick<Activation, 'id'>): Promise<Activation> {
  const activation = await runSelectQuery({ id })

  return activation

  async function runSelectQuery({ id }: Pick<Activation, 'id'>) {
    const result = await query({
      text: ` 
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT
          1
        ;`,
      values: [id],
    })

    if (result.rowCount === 0) {
      throw new NotFoundError({
        cause: 'TOKEN_NOT_FOUND',
        message:
          'The activation token was not found in the system or has expired',
        action: 'Make a new registration',
      })
    }

    return result.rows[0] as Activation
  }
}

async function markTokenAsUsed({
  id,
}: Pick<Activation, 'id'>): Promise<Activation> {
  const activation = await runInsertQuery({
    id,
  })

  return activation

  async function runInsertQuery({ id }: Pick<Activation, 'id'>) {
    const result = await query({
      text: `
        UPDATE
          user_activation_tokens
        SET
          used_at = timezone('utc', now()),
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [id],
    })

    return result.rows[0] as Activation
  }
}

async function activeUserByUserId({ id }: Pick<User, 'id'>) {
  const activatedUser = await user.setFeatures({
    id,
    features: [Feature.CREATE_SESSION],
  })

  return activatedUser
}

export const activation = {
  create,
  sendEmailToUser,
  findOneByUserId,
  findOneValidById,
  markTokenAsUsed,
  activeUserByUserId,
}
