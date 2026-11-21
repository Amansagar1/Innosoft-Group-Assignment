import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/repository';
import { createErrorResponse, handleApiError } from '@/lib/api-response';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (isNaN(id) || id <= 0) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Booking id in URL must be a positive integer.',
        400
      );
    }

    const result = repository.cancelBooking(id);
    return NextResponse.json(
      {
        message: result.wasCancelled
          ? 'Booking cancelled successfully.'
          : 'Booking was already cancelled (no-op).',
        booking: result.booking,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
