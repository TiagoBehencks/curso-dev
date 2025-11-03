import { AppError } from './AppError'

export class InternalServerError extends AppError {
  constructor({
    cause,
    statusCode,
  }: {
    cause?: unknown
    statusCode?: number
  } = {}) {
    super({
      message: 'Internal Server Error',
      action: 'Try again later',
      statusCode: statusCode ?? 500,
      cause,
    })
  }
}
