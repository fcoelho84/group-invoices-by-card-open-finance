import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ErrorCode,
  type ApiErrorResponse,
} from '../../application/errors/error-code';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(JSON.stringify(exception));
    }

    const response = host.switchToHttp().getResponse<Response>();
    const { status, code } = resolveError(exception);
    const body: ApiErrorResponse = { code };
    response.status(status).json(body);
  }
}

function resolveError(exception: unknown): {
  status: number;
  code: ErrorCode;
} {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = codeFromHttpException(exception);
    return { status, code };
  }

  if (isMissingConfig(exception)) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.MISSING_CONFIG,
    };
  }

  if (isOpenFinanceError(exception)) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      code: ErrorCode.OPEN_FINANCE_ERROR,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode.INTERNAL_ERROR,
  };
}

function codeFromHttpException(exception: HttpException): ErrorCode {
  const payload = exception.getResponse();
  if (typeof payload === 'object' && payload !== null && 'code' in payload) {
    const code = (payload as { code: unknown }).code;
    if (isErrorCode(code)) return code;
  }

  if (exception.getStatus() === HttpStatus.UNAUTHORIZED) {
    return ErrorCode.UNAUTHORIZED;
  }

  if (exception.getStatus() === HttpStatus.NOT_FOUND) {
    return ErrorCode.ITEM_NOT_FOUND;
  }

  return ErrorCode.INTERNAL_ERROR;
}

function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    Object.values(ErrorCode).includes(value as ErrorCode)
  );
}

function isMissingConfig(exception: unknown): boolean {
  if (!(exception instanceof Error)) return false;
  return (
    exception.message.includes('PLUGGY_CLIENT_ID') ||
    exception.message.includes('JWT_SECRET')
  );
}

function isOpenFinanceError(exception: unknown): boolean {
  if (!exception || typeof exception !== 'object') return false;
  if ('pluggy' in exception) return true;
  if ('codeDescription' in exception) return true;

  const message =
    exception instanceof Error
      ? exception.message
      : typeof (exception as { message?: unknown }).message === 'string'
        ? (exception as { message: string }).message
        : '';

  return (
    message.includes('pluggy') ||
    message.includes('ENDPOINT_DEPRECATED') ||
    message.includes('listTransactions')
  );
}
