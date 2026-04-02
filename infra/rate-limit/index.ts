import { query } from 'infra/database'
import { TooManyRequestsError } from 'infra/errors'

export const RATE_LIMITS = {
  sessions: { maxAttempts: 5, windowMinutes: 15 },
  users: { maxAttempts: 3, windowMinutes: 60 },
} as const

type RateLimitEndpoint = keyof typeof RATE_LIMITS

type CheckRateLimitParams = {
  ip: string
  endpoint: RateLimitEndpoint
  maxAttempts: number
  windowMinutes: number
}

async function checkRateLimit({
  ip,
  endpoint,
  maxAttempts,
  windowMinutes,
}: CheckRateLimitParams): Promise<void> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  const result = await query({
    text: `
      INSERT INTO rate_limits (ip_address, endpoint, attempts, window_start)
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT (ip_address, endpoint)
      DO UPDATE SET
        attempts = CASE
          WHEN rate_limits.window_start < $3::timestamptz
          THEN 1
          ELSE rate_limits.attempts + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start < $3::timestamptz
          THEN NOW()
          ELSE rate_limits.window_start
        END
      RETURNING attempts, window_start
    ;`,
    values: [ip, endpoint, windowStart.toISOString()],
  })

  const { attempts, window_start } = result.rows[0] as {
    attempts: number
    window_start: Date
  }

  if (attempts > maxAttempts) {
    const retryAfterSeconds = Math.ceil(
      (window_start.getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000
    )
    throw new TooManyRequestsError({ retryAfter: retryAfterSeconds })
  }
}

async function cleanupExpired(windowMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000)

  await query({
    text: `DELETE FROM rate_limits WHERE window_start < $1;`,
    values: [cutoff.toISOString()],
  })
}

export const rateLimit = {
  checkRateLimit,
  cleanupExpired,
  RATE_LIMITS,
}
