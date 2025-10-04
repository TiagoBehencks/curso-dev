import bcrypt from 'bcryptjs'

async function hash(password: string): Promise<string> {
  const rounds = getNumberOfSaltRounds()
  const hash = await bcrypt.hash(password, rounds)

  return hash
}

function getNumberOfSaltRounds() {
  return process.env.NODE_ENV === 'production' ? 14 : 1
}

async function compare(
  providedPassword: string,
  storedPassword: string
): Promise<boolean> {
  const isMatch = await bcrypt.compare(providedPassword, storedPassword)

  return isMatch
}

export const password = {
  hash,
  compare,
}
