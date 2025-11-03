import { AppError } from './AppError'

export class UnauthorizedError extends AppError {
  constructor({ action, message }: { action: string; message: string }) {
    super({
      message: message || 'Unauthorized Error',
      action: action || 'Authentication is required to access this resource',
      statusCode: 401,
    })
  }
}
