import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/repository';
import { createErrorResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const roomIdStr = searchParams.get('roomId');

    if (!date) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Query parameter "date" (YYYY-MM-DD) is required.',
        400
      );
    }

    const roomId = roomIdStr ? parseInt(roomIdStr, 10) : undefined;
    if (roomIdStr !== null && roomIdStr !== '' && (isNaN(roomId!) || roomId! <= 0)) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Query parameter "roomId" must be a positive integer if provided.',
        400
      );
    }

    const bookings = repository.getBookingsForDay(date, roomId);
    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_INPUT',
        'Invalid JSON payload in request body.',
        400
      );
    }

    const booking = await repository.createBooking(body);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
