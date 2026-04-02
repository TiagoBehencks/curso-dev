import { AppError } from './AppError'

export class TooManyRequestsError extends AppError {
  constructor({ retryAfter }: { retryAfter: number }) {
    super({
      message: 'Too many requests',
      action: `Please try again in ${retryAfter} seconds`,
      statusCode: 429,
    })
    this.retryAfter = retryAfter
  }

  public readonly retryAfter: number

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    }
  }
}
