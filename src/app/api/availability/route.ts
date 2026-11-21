import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/repository';
import { createErrorResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const minCapacityStr = searchParams.get('minCapacity');

    if (!date || !start || !end || !minCapacityStr) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Query parameters "date" (YYYY-MM-DD), "start" (HH:mm), "end" (HH:mm), and "minCapacity" (integer) are all required.',
        400
      );
    }

    const minCapacity = parseInt(minCapacityStr, 10);
    if (isNaN(minCapacity) || minCapacity < 1) {
      return createErrorResponse(
        'INVALID_INPUT',
        'minCapacity must be an integer of at least 1.',
        400
      );
    }

    const availableRooms = repository.getAvailableRooms(date, start, end, minCapacity);
    return NextResponse.json(availableRooms, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
