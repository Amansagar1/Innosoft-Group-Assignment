import { describe, it, expect } from 'vitest';
import {
  checkOverlap,
  parseUtcDate,
  validateRuleR1,
  validateRuleR2,
  validateRuleR3,
  validateRuleR4,
  validateRuleR5,
  validateRuleR6,
  validateRuleR7,
  validateRuleR8,
  validateRuleR9,
  validateBookingRequest,
  BusinessRuleError,
} from '@/lib/booking-rules';
import { Booking, Room } from '@/lib/types';

describe('Booking Rules - Pure Unit Tests', () => {
  const atlasRoom: Room = {
    id: 1,
    name: 'Atlas',
    capacity: 4,
    floor: 1,
    amenities: 'monitor',
  };

  const borealisRoom: Room = {
    id: 2,
    name: 'Borealis',
    capacity: 8,
    floor: 1,
    amenities: 'projector, whiteboard',
  };

  const existingAtlasBooking: Booking = {
    id: 17,
    roomId: 1,
    title: 'Existing Atlas Meeting',
    organizerEmail: 'existing@example.com',
    attendees: 3,
    start: '2030-05-14T10:00:00.000Z',
    end: '2030-05-14T11:00:00.000Z',
    status: 'confirmed',
    createdAt: '2030-05-10T08:00:00.000Z',
  };

  const existingBookings = [existingAtlasBooking];

  describe('Rule R7 - Overlap Reference Cases (Exact Specification)', () => {
    // 1. 09:00 to 10:00: Allowed (Ends exactly when the existing one starts)
    it('allows 09:00 to 10:00 (ends exactly when existing starts)', () => {
      const start = parseUtcDate('2030-05-14T09:00:00Z');
      const end = parseUtcDate('2030-05-14T10:00:00Z');
      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      }).not.toThrow();
    });

    // 2. 11:00 to 12:00: Allowed (Starts exactly when the existing one ends)
    it('allows 11:00 to 12:00 (starts exactly when existing ends)', () => {
      const start = parseUtcDate('2030-05-14T11:00:00Z');
      const end = parseUtcDate('2030-05-14T12:00:00Z');
      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      }).not.toThrow();
    });

    // 3. 09:30 to 10:30: Rejected (Overlaps the start)
    it('rejects 09:30 to 10:30 (overlaps the start)', () => {
      const start = parseUtcDate('2030-05-14T09:30:00Z');
      const end = parseUtcDate('2030-05-14T10:30:00Z');
      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      }).toThrowError(BusinessRuleError);

      try {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      } catch (err) {
        const bre = err as BusinessRuleError;
        expect(bre.code).toBe('BOOKING_CONFLICT');
        expect(bre.status).toBe(409);
        expect(bre.details?.conflictingBookingId).toBe(17);
      }
    });

    // 4. 10:30 to 11:30: Rejected (Overlaps the end)
    it('rejects 10:30 to 11:30 (overlaps the end)', () => {
      const start = parseUtcDate('2030-05-14T10:30:00Z');
      const end = parseUtcDate('2030-05-14T11:30:00Z');
      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      }).toThrowError(BusinessRuleError);
    });

    // 5. 10:15 to 10:45: Rejected (Fully inside)
    it('rejects 10:15 to 10:45 (fully inside existing)', () => {
      const start = parseUtcDate('2030-05-14T10:15:00Z');
      const end = parseUtcDate('2030-05-14T10:45:00Z');
      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      }).toThrowError(BusinessRuleError);
    });

    // 6. 09:00 to 12:00: Rejected (Fully contains)
    it('rejects 09:00 to 12:00 (fully contains existing)', () => {
      const start = parseUtcDate('2030-05-14T09:00:00Z');
      const end = parseUtcDate('2030-05-14T12:00:00Z');
      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      }).toThrowError(BusinessRuleError);
    });

    // 7. 10:00 to 11:00: Rejected (Identical)
    it('rejects 10:00 to 11:00 (identical slot in same room)', () => {
      const start = parseUtcDate('2030-05-14T10:00:00Z');
      const end = parseUtcDate('2030-05-14T11:00:00Z');
      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, existingBookings);
      }).toThrowError(BusinessRuleError);
    });

    // 8. 10:00 to 11:00 in Borealis: Allowed (Different room)
    it('allows 10:00 to 11:00 in Borealis (different room)', () => {
      const start = parseUtcDate('2030-05-14T10:00:00Z');
      const end = parseUtcDate('2030-05-14T11:00:00Z');
      expect(() => {
        validateRuleR7(borealisRoom.id, borealisRoom.name, start, end, existingBookings);
      }).not.toThrow();
    });

    // Cancelled bookings do not block a slot
    it('ignores cancelled bookings during conflict check', () => {
      const cancelledBooking: Booking = {
        id: 99,
        roomId: 1,
        title: 'Cancelled Meeting',
        organizerEmail: 'cancelled@example.com',
        attendees: 2,
        start: '2030-05-14T14:00:00.000Z',
        end: '2030-05-14T15:00:00.000Z',
        status: 'cancelled',
        createdAt: '2030-05-10T08:00:00.000Z',
      };
      const start = parseUtcDate('2030-05-14T14:00:00Z');
      const end = parseUtcDate('2030-05-14T15:00:00Z');

      expect(() => {
        validateRuleR7(atlasRoom.id, atlasRoom.name, start, end, [cancelledBooking]);
      }).not.toThrow();
    });
  });

  describe('Rule R1 - Interval Ordering', () => {
    it('rejects when end is before or equal to start', () => {
      const start = parseUtcDate('2030-05-14T10:00:00Z');
      const endEarlier = parseUtcDate('2030-05-14T09:45:00Z');
      const endSame = parseUtcDate('2030-05-14T10:00:00Z');

      expect(() => validateRuleR1(start, endEarlier)).toThrowError(BusinessRuleError);
      expect(() => validateRuleR1(start, endSame)).toThrowError(BusinessRuleError);
    });
  });

  describe('Rule R2 - 15-Minute Boundaries', () => {
    it('accepts valid 15-minute boundary times (00, 15, 30, 45 mins with 0 secs)', () => {
      ['08:00:00Z', '08:15:00Z', '08:30:00Z', '08:45:00Z'].forEach((t) => {
        const d = parseUtcDate(`2030-05-14T${t}`);
        expect(() => validateRuleR2(d, 'start')).not.toThrow();
      });
    });

    it('rejects invalid minutes (e.g. 10, 22, 59)', () => {
      const d = parseUtcDate('2030-05-14T08:10:00Z');
      expect(() => validateRuleR2(d, 'start')).toThrowError(BusinessRuleError);
    });

    it('rejects non-zero seconds', () => {
      const d = new Date('2030-05-14T08:15:30.000Z');
      expect(() => validateRuleR2(d, 'start')).toThrowError(BusinessRuleError);
    });
  });

  describe('Rule R3 - Duration Limits (15 mins to 4 hours)', () => {
    it('accepts durations between 15 minutes and 240 minutes', () => {
      const start = parseUtcDate('2030-05-14T10:00:00Z');
      const end15m = parseUtcDate('2030-05-14T10:15:00Z');
      const end4h = parseUtcDate('2030-05-14T14:00:00Z');

      expect(() => validateRuleR3(start, end15m)).not.toThrow();
      expect(() => validateRuleR3(start, end4h)).not.toThrow();
    });

    it('rejects duration shorter than 15 minutes', () => {
      const start = parseUtcDate('2030-05-14T10:00:00Z');
      const end5m = parseUtcDate('2030-05-14T10:05:00Z');
      expect(() => validateRuleR3(start, end5m)).toThrowError(BusinessRuleError);
    });

    it('rejects duration longer than 4 hours', () => {
      const start = parseUtcDate('2030-05-14T10:00:00Z');
      const end4h15m = parseUtcDate('2030-05-14T14:15:00Z');
      expect(() => validateRuleR3(start, end4h15m)).toThrowError(BusinessRuleError);
    });
  });

  describe('Rule R4 - Business Hours (08:00 to 20:00 UTC, same day)', () => {
    it('accepts bookings within 08:00 to 20:00 UTC on the same day', () => {
      const start = parseUtcDate('2030-05-14T08:00:00Z');
      const end = parseUtcDate('2030-05-14T20:00:00Z');
      expect(() => validateRuleR4(start, end)).not.toThrow();
    });

    it('rejects bookings starting before 08:00 UTC', () => {
      const start = parseUtcDate('2030-05-14T07:45:00Z');
      const end = parseUtcDate('2030-05-14T09:00:00Z');
      expect(() => validateRuleR4(start, end)).toThrowError(BusinessRuleError);
    });

    it('rejects bookings ending after 20:00 UTC', () => {
      const start = parseUtcDate('2030-05-14T19:00:00Z');
      const end = parseUtcDate('2030-05-14T20:15:00Z');
      expect(() => validateRuleR4(start, end)).toThrowError(BusinessRuleError);
    });

    it('rejects bookings spanning across UTC days', () => {
      const start = parseUtcDate('2030-05-14T19:00:00Z');
      const end = parseUtcDate('2030-05-15T09:00:00Z');
      expect(() => validateRuleR4(start, end)).toThrowError(BusinessRuleError);
    });
  });

  describe('Rule R5 - Past Start Date', () => {
    it('rejects bookings starting in the past relative to now', () => {
      const now = new Date('2030-05-14T10:00:00.000Z');
      const pastStart = new Date('2030-05-14T09:45:00.000Z');
      expect(() => validateRuleR5(pastStart, now)).toThrowError(BusinessRuleError);
    });

    it('allows bookings in the future', () => {
      const now = new Date('2030-05-14T10:00:00.000Z');
      const futureStart = new Date('2030-05-14T10:15:00.000Z');
      expect(() => validateRuleR5(futureStart, now)).not.toThrow();
    });
  });

  describe('Rule R6 - Attendees & Room Capacity', () => {
    it('allows attendees up to room capacity', () => {
      expect(() => validateRuleR6(1, 4)).not.toThrow();
      expect(() => validateRuleR6(4, 4)).not.toThrow();
    });

    it('rejects 0 or negative attendees', () => {
      expect(() => validateRuleR6(0, 4)).toThrowError(BusinessRuleError);
      expect(() => validateRuleR6(-2, 4)).toThrowError(BusinessRuleError);
    });

    it('rejects attendees exceeding room capacity', () => {
      expect(() => validateRuleR6(5, 4)).toThrowError(BusinessRuleError);
    });
  });

  describe('Rule R8 - Cancellation Rules', () => {
    const booking: Booking = {
      id: 5,
      roomId: 1,
      title: 'Retro',
      organizerEmail: 'alice@example.com',
      attendees: 2,
      start: '2030-05-14T14:00:00.000Z',
      end: '2030-05-14T15:00:00.000Z',
      status: 'confirmed',
      createdAt: '2030-05-10T10:00:00.000Z',
    };

    it('allows cancellation before booking start', () => {
      const nowBefore = new Date('2030-05-14T13:45:00.000Z');
      const result = validateRuleR8(booking, nowBefore);
      expect(result).toBe(true);
    });

    it('rejects cancellation after booking has already started', () => {
      const nowAfter = new Date('2030-05-14T14:05:00.000Z');
      expect(() => validateRuleR8(booking, nowAfter)).toThrowError(BusinessRuleError);
    });

    it('treats cancelling an already cancelled booking as a no-op returning false (success)', () => {
      const cancelledBooking: Booking = { ...booking, status: 'cancelled' };
      const now = new Date('2030-05-14T12:00:00.000Z');
      const result = validateRuleR8(cancelledBooking, now);
      expect(result).toBe(false);
    });
  });

  describe('Rule R9 - Daily Organizer Booking Limit (Max 3)', () => {
    const email = 'sam@example.com';
    const targetDate = parseUtcDate('2030-05-14T08:00:00Z');

    it('allows up to 3 confirmed bookings starting on the same day', () => {
      const existing: Booking[] = [
        {
          id: 1,
          roomId: 1,
          title: 'Meeting 1',
          organizerEmail: email,
          attendees: 2,
          start: '2030-05-14T09:00:00.000Z',
          end: '2030-05-14T10:00:00.000Z',
          status: 'confirmed',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
        {
          id: 2,
          roomId: 2,
          title: 'Meeting 2',
          organizerEmail: email,
          attendees: 3,
          start: '2030-05-14T11:00:00.000Z',
          end: '2030-05-14T12:00:00.000Z',
          status: 'confirmed',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
      ];

      expect(() => validateRuleR9(email, targetDate, existing)).not.toThrow();
    });

    it('rejects a 4th booking when organizer already has 3 confirmed bookings on that day', () => {
      const existing: Booking[] = [
        {
          id: 1,
          roomId: 1,
          title: 'Meeting 1',
          organizerEmail: email,
          attendees: 2,
          start: '2030-05-14T09:00:00.000Z',
          end: '2030-05-14T10:00:00.000Z',
          status: 'confirmed',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
        {
          id: 2,
          roomId: 2,
          title: 'Meeting 2',
          organizerEmail: email,
          attendees: 3,
          start: '2030-05-14T11:00:00.000Z',
          end: '2030-05-14T12:00:00.000Z',
          status: 'confirmed',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
        {
          id: 3,
          roomId: 3,
          title: 'Meeting 3',
          organizerEmail: email,
          attendees: 4,
          start: '2030-05-14T13:00:00.000Z',
          end: '2030-05-14T14:00:00.000Z',
          status: 'confirmed',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
      ];

      expect(() => validateRuleR9(email, targetDate, existing)).toThrowError(BusinessRuleError);
    });

    it('does not count cancelled bookings towards the daily limit', () => {
      const existing: Booking[] = [
        {
          id: 1,
          roomId: 1,
          title: 'Meeting 1',
          organizerEmail: email,
          attendees: 2,
          start: '2030-05-14T09:00:00.000Z',
          end: '2030-05-14T10:00:00.000Z',
          status: 'confirmed',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
        {
          id: 2,
          roomId: 2,
          title: 'Meeting 2',
          organizerEmail: email,
          attendees: 3,
          start: '2030-05-14T11:00:00.000Z',
          end: '2030-05-14T12:00:00.000Z',
          status: 'confirmed',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
        {
          id: 3,
          roomId: 3,
          title: 'Meeting 3 (Cancelled)',
          organizerEmail: email,
          attendees: 4,
          start: '2030-05-14T13:00:00.000Z',
          end: '2030-05-14T14:00:00.000Z',
          status: 'cancelled',
          createdAt: '2030-05-10T08:00:00.000Z',
        },
      ];

      expect(() => validateRuleR9(email, targetDate, existing)).not.toThrow();
    });
  });
});
