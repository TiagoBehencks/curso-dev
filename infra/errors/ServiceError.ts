import { AppError } from './AppError'

export class ServiceError extends AppError {
  constructor({
    message,
    cause,
    statusCode,
  }: { cause?: unknown; statusCode?: number; message?: string } = {}) {
    super({
      message: message ?? 'Service Unavailable',
      action: 'Check if the service is available.',
      statusCode: statusCode ?? 503,
      cause,
    })
  }
}
