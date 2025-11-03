export interface AppErrorOptions {
  message: string
  action?: string
  statusCode?: number
  cause?: unknown
}

export class AppError extends Error {
  public readonly action?: string
  public readonly statusCode: number
  public readonly cause?: Error | undefined | unknown

  constructor({ message, action, statusCode = 500, cause }: AppErrorOptions) {
    super(message)

    this.name = new.target.name
    this.action = action
    this.statusCode = statusCode
    this.cause = cause

    Object.setPrototypeOf(this, new.target.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      ...(this.action && { action: this.action }),
      status_code: this.statusCode,
      ...(this.cause && { cause: this.serializeCause(this.cause) }),
    }
  }

  private serializeCause(cause: unknown) {
    if (cause instanceof Error) {
      return {
        name: cause.name,
        message: cause.message,
        stack: cause.stack,
      }
    }
    return cause
  }
}
