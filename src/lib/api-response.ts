import { NextResponse } from 'next/server';
import { BusinessRuleCode, APIErrorResponse } from './types';
import { BusinessRuleError } from './booking-rules';

export function createErrorResponse(
  code: BusinessRuleCode,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<APIErrorResponse> {
  const body: APIErrorResponse = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

export function handleApiError(error: unknown): NextResponse<APIErrorResponse> {
  if (error instanceof BusinessRuleError) {
    return createErrorResponse(error.code, error.message, error.status, error.details);
  }

  const errMessage = error instanceof Error ? error.message : 'An unexpected internal error occurred';
  console.error('Unhandled API Error:', error);
  return createErrorResponse('INVALID_INPUT', errMessage, 500);
}
