export class NotFoundError extends Error { }
export class AccessDeniedError extends Error { }
export class ErrorMessage extends Error { }

export class BaseException { }
export class RedirectPageException extends BaseException {
  constructor (url) {
    super()
    this.url = url
  }
}
