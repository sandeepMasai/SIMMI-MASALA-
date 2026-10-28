import type { ApiErrorCode } from '@simmi/shared';

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertFound<T>(
  value: T | null | undefined,
  message = 'Resource not found',
): asserts value is T {
  if (value == null) throw new AppError('NOT_FOUND', message, 404);
}
