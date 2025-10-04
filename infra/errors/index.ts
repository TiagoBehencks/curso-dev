/* eslint-disable @typescript-eslint/no-explicit-any */
export class InternalServerError extends Error {
  action: string
  statusCode: number

  constructor({
    cause,
    statusCode,
  }: {
    cause: Error | undefined | any
    statusCode?: number
  }) {
    super('Internal Server Error', { cause })

    this.name = 'InternalServerError'
    this.action = 'Try again later'
    this.statusCode = statusCode || 500
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    }
  }
}

export class ServiceError extends Error {
  action: string
  statusCode: number

  constructor({ cause, message }) {
    super(message || 'Service unavailable', {
      cause,
    })

    this.name = 'ServiceError'
    this.action = 'Verifique se o serviço está disponível.'
    this.statusCode = 503
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    }
  }
}

export class MethodNotAllowedError extends Error {
  action: string
  statusCode: number

  constructor() {
    super('Method Not Allowed')

    this.name = 'MethodNotAllowedError'
    this.action = 'Try again later'
    this.statusCode = 405
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    }
  }
}

export class ValidationError extends Error {
  action: string
  statusCode: number

  constructor({
    cause,
    action,
    message,
  }: {
    cause: Error | undefined | any
    action: string
    message: string
  }) {
    super(message || 'Validation Error', {
      cause,
    })

    this.name = 'ValidationError'
    this.action = action || 'Validation error'
    this.statusCode = 400
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    }
  }
}

export class NotFoundError extends Error {
  action: string
  statusCode: number

  constructor({
    cause,
    action,
    message,
  }: {
    cause: Error | undefined | any
    action: string
    message: string
  }) {
    super(message || 'Not Found', {
      cause,
    })

    this.name = 'NotFoundError'
    this.action = action || 'Resource not found'
    this.statusCode = 404
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    }
  }
}

export class UnauthorizedError extends Error {
  action: string
  statusCode: number

  constructor({ action, message }: { action: string; message: string }) {
    super(message || 'UnauthorizedEror')

    this.name = 'UnauthorizedError'
    this.action = action || 'Resource not found'
    this.statusCode = 401
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    }
  }
}
