import { AppError } from './AppError'

export class ServiceError extends AppError {
  constructor({
    cause,
    statusCode,
  }: { cause?: unknown; statusCode?: number } = {}) {
    super({
      message: 'Service Unavailable',
      action: 'Check if the service is available.',
      statusCode: statusCode ?? 503,
      cause,
    })
  }
}
