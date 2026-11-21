import { NextResponse } from 'next/server';
import { repository } from '@/lib/repository';
import { handleApiError } from '@/lib/api-response';

export async function GET() {
  try {
    const rooms = repository.getRooms();
    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
