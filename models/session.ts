import crypto from 'node:crypto'

import { query } from 'infra/database'
import { UnauthorizedError } from 'infra/errors'

type QueryValues = {
  token: string
  userId: string
  expiresAt: Date
}

export type Session = {
  id: string
  token: string
  user_id: string
  expires_at: Date
  created_at: Date
  updated_at: Date
}

type UpdateQueryValues = {
  sessionId: string
  expiresAt: Date
}

const EXPIRATION_IN_MILLISECONDS = 60 * 60 * 24 * 30 * 1000 // 30 days

async function create(userId: string): Promise<Session> {
  const token = generateToken()
  const expiresAt = generateExpiresAt()
  const newSession = await runInsertQuery({ token, userId, expiresAt })

  return newSession

  function generateToken() {
    return crypto.randomBytes(48).toString('hex')
  }

  function generateExpiresAt() {
    return new Date(Date.now() + EXPIRATION_IN_MILLISECONDS)
  }

  async function runInsertQuery({
    token,
    userId,
    expiresAt,
  }: QueryValues): Promise<Session> {
    const session = await query({
      text: `
        INSERT INTO
          sessions (token, user_id, expires_at)
        VALUES
          ($1, $2, $3)
        RETURNING
          *
        ;`,
      values: [token, userId, expiresAt],
    })

    return session.rows[0] as Session
  }
}

async function findOneValidByToken({
  token,
}: Pick<Session, 'token'>): Promise<Session> {
  const sessionFound = await runSelectQuery(token)

  return sessionFound

  async function runSelectQuery(sessionToken: string) {
    const session = await query({
      text: `
        SELECT
          *
        FROM
          sessions
        WHERE
          token = $1
          AND expires_at > NOW()
        LIMIT
          1
        ;`,
      values: [sessionToken],
    })

    if (session.rowCount === 0) {
      throw new UnauthorizedError({
        message: "User doesn't have an active session",
        action: 'Check if the user is logged in and try again.',
      })
    }

    return session.rows[0] as Session
  }
}

async function renewed({ id }: Pick<Session, 'id'>): Promise<Session> {
  const expiresAt = generateExpiresAt()
  const renewedSessionObject = await runUpdateQuery({
    sessionId: id,
    expiresAt,
  })

  return renewedSessionObject as Session

  function generateExpiresAt() {
    return new Date(Date.now() + EXPIRATION_IN_MILLISECONDS)
  }

  async function runUpdateQuery({ sessionId, expiresAt }: UpdateQueryValues) {
    const session = await query({
      text: `
        UPDATE
          sessions
        SET
          expires_at = $2,
          updated_at = NOW()
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [sessionId, expiresAt],
    })

    return session.rows[0] as Session
  }
}

async function expireById({ id }: Pick<Session, 'id'>) {
  const expiredToken = await runUpdateQuery({
    sessionId: id,
  })

  return expiredToken

  async function runUpdateQuery({ sessionId }: Partial<UpdateQueryValues>) {
    const session = await query({
      text: `
        UPDATE
          sessions
        SET
          expires_at = expires_at - interval '1 year',
          updated_at = NOW()
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [sessionId],
    })

    return session.rows[0] as Session
  }
}

export const session = {
  create,
  findOneValidByToken,
  renewed,
  expireById,
  EXPIRATION_IN_MILLISECONDS,
}
