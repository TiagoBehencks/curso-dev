import { AppError } from './AppError'

export class ForbiddenError extends AppError {
  constructor({ action, message }: { action: string; message: string }) {
    super({
      message: message || 'Forbidden Error',
      action: action || 'You do not have permission to access this resource',
      statusCode: 403,
    })
  }
}
