import { AppError } from './AppError'

export class ValidationError extends AppError {
  constructor({
    cause,
    action,
    message,
  }: {
    cause: unknown
    action: string
    message: string
  }) {
    super({
      message: message || 'Validation Error',
      action: action || 'Invalid data provided',
      statusCode: 422,
      cause,
    })
  }
}
