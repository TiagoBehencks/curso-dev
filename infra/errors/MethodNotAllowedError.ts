import { AppError } from './AppError'

export class MethodNotAllowedError extends AppError {
  constructor({
    cause,
    statusCode,
  }: { cause?: unknown; statusCode?: number } = {}) {
    super({
      message: 'Method Not Allowed',
      action: 'Try again later',
      statusCode: statusCode ?? 405,
      cause,
    })
  }
}
