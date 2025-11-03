import { AppError } from './AppError'

export class NotFoundError extends AppError {
  constructor({
    cause,
    action,
    message,
  }: {
    cause: Error | undefined | unknown
    action: string
    message: string
  }) {
    super({
      message: message || 'Not Found Error',
      action: action || 'The requested resource was not found',
      statusCode: 404,
      cause,
    })
  }
}
