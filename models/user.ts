import { query } from 'infra/database'
import { password as modelPassword } from 'models/password'
import { NotFoundError, ValidationError } from 'infra/errors'
import { Feature } from './features'

export type User = {
  id: string
  username: string
  email: string
  password: string
  features: Feature[]
  created_at: Date
  updated_at: Date
}

export type UserInputValues = Pick<User, 'username' | 'email' | 'password'>

type UserToInsert = UserInputValues & Pick<User, 'features'>

async function create({ username, email, password }: UserInputValues) {
  await validateUniqueUsername(username)
  await validateUniqueEmail(email)
  const defaultFeatures = await getDefatultFeatures()
  const hashPassword = await hashPasswordInObject(password)

  const newUser = await runInsertQuery({
    username,
    email,
    password: hashPassword,
    features: defaultFeatures,
  })

  return newUser

  async function runInsertQuery({
    username,
    email,
    password,
    features,
  }: UserToInsert) {
    const newUser = await query({
      text: `
        INSERT INTO 
          users (username, email, password, features)
        VALUES 
          ($1, $2, $3, $4)
        RETURNING
          *
        ;`,
      values: [username, email, password, features],
    })

    return newUser.rows[0] as User
  }

  async function getDefatultFeatures() {
    return [Feature.READ_ACTIVATION_TOKEN]
  }
}

async function update(username: string, userInputValues: UserInputValues) {
  const currentUser = await findOneByUsername(username)
  let password = currentUser.password
  const sameUsername =
    currentUser.username.toLocaleLowerCase() ===
    userInputValues?.username?.toLocaleLowerCase()

  if (userInputValues.username && !sameUsername) {
    await validateUniqueUsername(userInputValues.username)
  }

  if (userInputValues.email) {
    await validateUniqueEmail(userInputValues.email)
  }

  if (userInputValues.password) {
    password = await hashPasswordInObject(userInputValues.password)
  }

  const userWithNewValues = {
    ...currentUser,
    ...userInputValues,
    password,
  }

  const updatedUser = await runUpdateQuery(userWithNewValues)

  return updatedUser

  async function runUpdateQuery({
    id,
    username,
    email,
    password,
  }: Partial<User>) {
    const result = await query({
      text: `
        UPDATE
         users
        SET
          username = $2,
          email = $3,
          password = $4,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
        ;`,
      values: [`${id}`, `${username}`, `${email}`, `${password}`],
    })

    return result.rows[0] as User
  }
}

async function findOneByUsername(username: string): Promise<User> {
  const user = await query({
    text: `
      SELECT
        *
      FROM
        users
      WHERE
        LOWER(TRIM(username)) = LOWER(TRIM($1))
      LIMIT
        1
      ;`,
    values: [username],
  })

  if (user.rowCount === 0) {
    throw new NotFoundError({
      message: 'User not found',
      action: 'Try another username',
      cause: 'USER_NOT_FOUND',
    })
  }

  return user.rows[0] as User
}

async function validateUniqueEmail(email: string) {
  const results = await query({
    text: `
        SELECT
          email
        FROM
          users
        WHERE
          LOWER(TRIM(email)) = LOWER(TRIM($1))
        LIMIT
          1
        ;`,
    values: [email],
  })

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: 'The email has been taken.',
      action: 'Try another email',
      cause: 'EMAIL_TAKEN',
    })
  }
}

async function validateUniqueUsername(username: string) {
  const results = await query({
    text: `
        SELECT
          username
        FROM
          users
        WHERE
          LOWER(TRIM(username)) = LOWER(TRIM($1))
        LIMIT
          1
        ;`,
    values: [username],
  })

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: 'The username has been taken.',
      action: 'Try another username',
      cause: results,
    })
  }
}

async function hashPasswordInObject(password: string) {
  return await modelPassword.hash(password)
}

async function findOneByEmail(email: string) {
  const user = await query({
    text: `
      SELECT
        *
      FROM
        users
      WHERE
        LOWER(TRIM(email)) = LOWER(TRIM($1))
      LIMIT
        1
      ;`,
    values: [email],
  })

  if (user.rowCount === 0) {
    throw new NotFoundError({
      message: 'E-mail not found',
      action: 'Try another e-mail',
      cause: 'USER_NOT_FOUND',
    })
  }

  return user.rows[0] as User
}

async function findOneById(id: string) {
  const user = await query({
    text: `
      SELECT
        *
      FROM
        users
      WHERE
        id = $1
      LIMIT
        1
      ;`,
    values: [id],
  })

  if (user.rowCount === 0) {
    throw new NotFoundError({
      message: 'ID not found',
      action: 'Try another ID',
      cause: 'USER_NOT_FOUND',
    })
  }

  return user.rows[0] as User
}

async function setFeatures({
  id,
  features,
}: Pick<User, 'id' | 'features'>): Promise<User> {
  const updatedUser = await runInserQuery({
    id,
    features,
  })

  return updatedUser

  async function runInserQuery({
    id,
    features,
  }: Pick<User, 'id' | 'features'>) {
    const results = await query({
      text: `
        UPDATE
          users
        SET
          features = $2,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          1
      ;`,
      values: [id, features],
    })

    return results.rows[0] as User
  }
}

export const user = {
  create,
  update,
  findOneByUsername,
  findOneByEmail,
  findOneById,
  setFeatures,
}
