import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postBooking } from '@/app/api/bookings/route';
import { getDatabase } from '@/lib/db';

describe('Concurrency Tests - Race Condition Protection', () => {
  const db = getDatabase();

  beforeEach(() => {
    db.exec('DELETE FROM bookings');
  });

  it('ensures only one booking succeeds when multiple requests race for the same slot', async () => {
    const concurrentRequestsCount = 8;
    const targetRoomId = 1;
    const slotStart = '2030-07-20T10:00:00.000Z';
    const slotEnd = '2030-07-20T11:00:00.000Z';

    // Dispatch 8 simultaneous requests at the exact same instant
    const promises = Array.from({ length: concurrentRequestsCount }, (_, i) => {
      const req = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: targetRoomId,
          title: `Concurrent Attempt #${i + 1}`,
          organizerEmail: `user${i + 1}@company.org`,
          attendees: 2,
          start: slotStart,
          end: slotEnd,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      return postBooking(req);
    });

    const responses = await Promise.all(promises);

    let successCount = 0;
    let conflictCount = 0;
    const errorCodes: string[] = [];

    for (const res of responses) {
      if (res.status === 201) {
        successCount++;
      } else if (res.status === 409) {
        conflictCount++;
        const body = await res.json();
        errorCodes.push(body.error.code);
      }
    }

    // EXACTLY 1 request must succeed
    expect(successCount).toBe(1);

    // EXACTLY N-1 requests must fail with 409 BOOKING_CONFLICT
    expect(conflictCount).toBe(concurrentRequestsCount - 1);
    expect(errorCodes.every((code) => code === 'BOOKING_CONFLICT')).toBe(true);

    // Verify in database: exactly 1 booking exists
    const row = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE room_id = ? AND status = 'confirmed'").get(targetRoomId) as { count: number };
    expect(row.count).toBe(1);
  });
});
