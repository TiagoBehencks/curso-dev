import { send } from 'infra/email'
import { query } from 'infra/database'
import { webserver } from 'infra/webserver'
import { User } from './user'

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

export const activation = {
  create,
  sendEmailToUser,
  findOneByUserId,
}
