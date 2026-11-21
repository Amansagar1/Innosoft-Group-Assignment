import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getRooms } from '@/app/api/rooms/route';
import { GET as getBookings, POST as postBooking } from '@/app/api/bookings/route';
import { DELETE as deleteBooking } from '@/app/api/bookings/[id]/route';
import { GET as getAvailability } from '@/app/api/availability/route';
import { getDatabase } from '@/lib/db';

describe('Integration Tests - HTTP API End to End', () => {
  const db = getDatabase();

  beforeEach(() => {
    // Clean bookings before each integration test
    db.exec('DELETE FROM bookings');
  });

  it('GET /api/rooms lists all seeded rooms', async () => {
    const res = await getRooms();
    expect(res.status).toBe(200);

    const rooms = await res.json();
    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBe(5);
    expect(rooms.map((r: { name: string }) => r.name)).toEqual([
      'Atlas',
      'Borealis',
      'Cascade',
      'Delta',
      'Ember',
    ]);
  });

  it('POST /api/bookings creates a booking with 201 and GET /api/bookings retrieves it', async () => {
    const bookingPayload = {
      roomId: 1,
      title: 'Sprint Kickoff',
      organizerEmail: 'team@company.org',
      attendees: 3,
      start: '2030-06-15T10:00:00.000Z',
      end: '2030-06-15T11:00:00.000Z',
    };

    const postReq = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingPayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const postRes = await postBooking(postReq);
    expect(postRes.status).toBe(201);

    const created = await postRes.json();
    expect(created.id).toBeDefined();
    expect(created.roomId).toBe(1);
    expect(created.title).toBe('Sprint Kickoff');
    expect(created.status).toBe('confirmed');

    // Retrieve via GET /api/bookings
    const getReq = new NextRequest('http://localhost:3000/api/bookings?date=2030-06-15&roomId=1');
    const getRes = await getBookings(getReq);
    expect(getRes.status).toBe(200);

    const bookings = await getRes.json();
    expect(bookings.length).toBe(1);
    expect(bookings[0].id).toBe(created.id);
  });

  it('POST /api/bookings returns 409 conflict on overlapping booking (R7)', async () => {
    // 1st booking: 10:00 to 11:00
    const firstReq = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        roomId: 1,
        title: 'Initial Booking',
        organizerEmail: 'organizer1@company.org',
        attendees: 2,
        start: '2030-06-15T10:00:00.000Z',
        end: '2030-06-15T11:00:00.000Z',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const firstRes = await postBooking(firstReq);
    expect(firstRes.status).toBe(201);
    const initialBooking = await firstRes.json();

    // 2nd conflicting booking: 10:30 to 11:30 in same room
    const conflictReq = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        roomId: 1,
        title: 'Conflicting Booking',
        organizerEmail: 'organizer2@company.org',
        attendees: 2,
        start: '2030-06-15T10:30:00.000Z',
        end: '2030-06-15T11:30:00.000Z',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const conflictRes = await postBooking(conflictReq);
    expect(conflictRes.status).toBe(409);

    const errorBody = await conflictRes.json();
    expect(errorBody.error).toBeDefined();
    expect(errorBody.error.code).toBe('BOOKING_CONFLICT');
    expect(errorBody.error.message).toContain('Room Atlas is already booked');
    expect(errorBody.error.details.conflictingBookingId).toBe(initialBooking.id);
  });

  it('POST /api/bookings returns 400 when business rules are violated', async () => {
    // Exceeds room capacity (Atlas capacity is 4)
    const overCapacityReq = new NextRequest('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        roomId: 1,
        title: 'Big Crowd',
        organizerEmail: 'host@company.org',
        attendees: 10,
        start: '2030-06-15T10:00:00.000Z',
        end: '2030-06-15T11:00:00.000Z',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(overCapacityReq);
    expect(res.status).toBe(400);

    const errorBody = await res.json();
    expect(errorBody.error.code).toBe('RULE_R6_CAPACITY_EXCEEDED');
  });

  it('GET /api/availability lists free rooms ordered by smallest capacity first', async () => {
    // Book Atlas (capacity 4) and Borealis (capacity 8) for 14:00 to 15:00
    await postBooking(
      new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 1,
          title: 'Atlas Occupied',
          organizerEmail: 'user1@company.org',
          attendees: 2,
          start: '2030-06-15T14:00:00.000Z',
          end: '2030-06-15T15:00:00.000Z',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Search for window 14:00 to 15:00 with minCapacity 2
    // Atlas (4) is booked.
    // Ember (2) is free.
    // Cascade (12) is free.
    // Delta (20) is free.
    // Borealis (8) is free (not booked here).
    const availReq = new NextRequest(
      'http://localhost:3000/api/availability?date=2030-06-15&start=14:00&end=15:00&minCapacity=2'
    );
    const availRes = await getAvailability(availReq);
    expect(availRes.status).toBe(200);

    const available = await availRes.json();
    const names = available.map((r: { name: string }) => r.name);
    // Atlas should NOT be in the results
    expect(names).not.toContain('Atlas');
    // Ember (2) should be first because it is smallest sufficient capacity!
    expect(names[0]).toBe('Ember');
    // Verify capacities are ordered ascending
    const capacities = available.map((r: { capacity: number }) => r.capacity);
    for (let i = 1; i < capacities.length; i++) {
      expect(capacities[i]).toBeGreaterThanOrEqual(capacities[i - 1]);
    }
  });

  it('DELETE /api/bookings/:id cancels a booking and allows no-op repeat cancel', async () => {
    // Create booking
    const postRes = await postBooking(
      new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 1,
          title: 'To Cancel',
          organizerEmail: 'cancel@company.org',
          attendees: 2,
          start: '2030-06-15T16:00:00.000Z',
          end: '2030-06-15T17:00:00.000Z',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const created = await postRes.json();

    // Cancel booking
    const deleteReq = new NextRequest(`http://localhost:3000/api/bookings/${created.id}`, {
      method: 'DELETE',
    });
    const deleteRes = await deleteBooking(deleteReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(deleteRes.status).toBe(200);

    const cancelledBody = await deleteRes.json();
    expect(cancelledBody.booking.status).toBe('cancelled');

    // Repeat cancel should be a success no-op
    const repeatRes = await deleteBooking(deleteReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(repeatRes.status).toBe(200);
    const repeatBody = await repeatRes.json();
    expect(repeatBody.message).toContain('already cancelled (no-op)');

    // Slot is now freed up for a new booking
    const newBookingRes = await postBooking(
      new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 1,
          title: 'Takes Freed Slot',
          organizerEmail: 'newuser@company.org',
          attendees: 2,
          start: '2030-06-15T16:00:00.000Z',
          end: '2030-06-15T17:00:00.000Z',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(newBookingRes.status).toBe(201);
  });
});
