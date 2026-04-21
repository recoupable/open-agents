export class SandboxCreateRequestError extends Error {
  readonly reason?: string;
  readonly actionUrl?: string;
  readonly status: number;
  readonly responseBody?: string;

  constructor(
    message: string,
    options: {
      status: number;
      reason?: string;
      actionUrl?: string;
      responseBody?: string;
    },
  ) {
    super(message);
    this.name = "SandboxCreateRequestError";
    this.reason = options.reason;
    this.actionUrl = options.actionUrl;
    this.status = options.status;
    this.responseBody = options.responseBody;
  }
}
