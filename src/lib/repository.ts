import { getDatabase } from './db';
import { Booking, CreateBookingInput, Room } from './types';
import {
  BusinessRuleError,
  checkOverlap,
  parseUtcDate,
  validateBookingInputSyntax,
  validateBookingRequest,
  validateRuleR1,
  validateRuleR2,
  validateRuleR3,
  validateRuleR4,
  validateRuleR8,
} from './booking-rules';

// In-process per-room mutex to serialize concurrent booking attempts for the same room
class RoomMutex {
  private queues: Map<number, Promise<void>> = new Map();

  async acquire<T>(roomId: number, action: () => T | Promise<T>): Promise<T> {
    const currentQueue = this.queues.get(roomId) || Promise.resolve();

    let release: () => void = () => {};
    const nextQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.queues.set(roomId, currentQueue.then(() => nextQueue));

    try {
      await currentQueue;
      return await action();
    } finally {
      release();
      if (this.queues.get(roomId) === nextQueue) {
        this.queues.delete(roomId);
      }
    }
  }
}

export const roomMutex = new RoomMutex();

// Helper to map DB row to Room model
function mapRoomRow(row: { id: number; name: string; capacity: number; floor: number; amenities: string }): Room {
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    floor: row.floor,
    amenities: row.amenities,
  };
}

// Helper to map DB row to Booking model
function mapBookingRow(row: {
  id: number;
  room_id: number;
  title: string;
  organizer_email: string;
  attendees: number;
  start: string;
  end: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
}): Booking {
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    organizerEmail: row.organizer_email,
    attendees: row.attendees,
    start: row.start,
    end: row.end,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class BookingRepository {
  private db = getDatabase();

  /**
   * List all rooms
   */
  getRooms(): Room[] {
    const rows = this.db.prepare('SELECT * FROM rooms ORDER BY id ASC').all() as Parameters<typeof mapRoomRow>[0][];
    return rows.map(mapRoomRow);
  }

  /**
   * Get room by id
   */
  getRoomById(id: number): Room | null {
    const row = this.db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Parameters<typeof mapRoomRow>[0] | undefined;
    return row ? mapRoomRow(row) : null;
  }

  /**
   * List confirmed bookings for a UTC day, optionally for one room
   * date: YYYY-MM-DD
   */
  getBookingsForDay(date: string, roomId?: number): Booking[] {
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BusinessRuleError('INVALID_INPUT', 'date parameter must be in YYYY-MM-DD format', 400);
    }

    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    let query = `
      SELECT * FROM bookings
      WHERE status = 'confirmed'
        AND start >= ?
        AND start <= ?
    `;
    const params: unknown[] = [startOfDay, endOfDay];

    if (roomId !== undefined && !isNaN(roomId)) {
      query += ' AND room_id = ?';
      params.push(roomId);
    }

    query += ' ORDER BY start ASC';

    const rows = this.db.prepare(query).all(...params) as Parameters<typeof mapBookingRow>[0][];
    return rows.map(mapBookingRow);
  }

  /**
   * Get booking by id
   */
  getBookingById(id: number): Booking | null {
    const row = this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Parameters<typeof mapBookingRow>[0] | undefined;
    return row ? mapBookingRow(row) : null;
  }

  /**
   * Create a booking with strict concurrency protection
   */
  async createBooking(rawInput: unknown, now: Date = new Date()): Promise<Booking> {
    const validated = validateBookingInputSyntax(rawInput as Parameters<typeof validateBookingInputSyntax>[0]);

    // Protect via per-room mutex and immediate database transaction
    return await roomMutex.acquire(validated.roomId, () => {
      const runTransaction = this.db.transaction(() => {
        const room = this.getRoomById(validated.roomId);
        if (!room) {
          throw new BusinessRuleError('ROOM_NOT_FOUND', `Room with id ${validated.roomId} does not exist.`, 404);
        }

        // Fetch existing confirmed bookings for this room
        const roomBookingsRows = this.db.prepare(`
          SELECT * FROM bookings
          WHERE room_id = ? AND status = 'confirmed'
        `).all(validated.roomId) as Parameters<typeof mapBookingRow>[0][];
        const roomBookings = roomBookingsRows.map(mapBookingRow);

        // Fetch existing confirmed bookings for this organizer
        const organizerRows = this.db.prepare(`
          SELECT * FROM bookings
          WHERE organizer_email = ? AND status = 'confirmed'
        `).all(validated.organizerEmail.trim().toLowerCase()) as Parameters<typeof mapBookingRow>[0][];
        const organizerBookings = organizerRows.map(mapBookingRow);

        // Combined existing bookings to check both R7 and R9
        const combinedBookings = [...roomBookings, ...organizerBookings];

        // Execute pure business rules validation (R1-R9)
        const { startDate, endDate } = validateBookingRequest(
          {
            roomId: validated.roomId,
            title: validated.title,
            organizerEmail: validated.organizerEmail,
            attendees: validated.attendees,
            start: validated.startStr,
            end: validated.endStr,
          },
          room,
          combinedBookings,
          now
        );

        const createdAt = now.toISOString();
        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();

        const insertStmt = this.db.prepare(`
          INSERT INTO bookings (room_id, title, organizer_email, attendees, start, end, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
        `);

        const result = insertStmt.run(
          room.id,
          validated.title,
          validated.organizerEmail,
          validated.attendees,
          startIso,
          endIso,
          createdAt
        );

        const newId = Number(result.lastInsertRowid);
        const createdRow = this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(newId) as Parameters<typeof mapBookingRow>[0];
        return mapBookingRow(createdRow);
      });

      // Use immediate transaction mode for exclusive write acquisition
      return runTransaction.immediate();
    });
  }

  /**
   * Cancel booking by id
   */
  cancelBooking(id: number, now: Date = new Date()): { booking: Booking; wasCancelled: boolean } {
    const runTransaction = this.db.transaction(() => {
      const booking = this.getBookingById(id);
      if (!booking) {
        throw new BusinessRuleError('BOOKING_NOT_FOUND', `Booking with id ${id} not found.`, 404);
      }

      // Check R8
      const shouldCancel = validateRuleR8(booking, now);
      if (!shouldCancel) {
        // No-op if already cancelled, returns success
        return { booking, wasCancelled: false };
      }

      this.db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
      const updated = this.getBookingById(id)!;
      return { booking: updated, wasCancelled: true };
    });

    return runTransaction.immediate();
  }

  /**
   * Find available rooms for date and time window with at least minCapacity.
   * Ordered by smallest sufficient capacity first.
   */
  getAvailableRooms(
    date: string,
    startHourMin: string,
    endHourMin: string,
    minCapacity: number
  ): Room[] {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BusinessRuleError('INVALID_INPUT', 'date must be in YYYY-MM-DD format', 400);
    }
    if (!/^\d{2}:\d{2}$/.test(startHourMin) || !/^\d{2}:\d{2}$/.test(endHourMin)) {
      throw new BusinessRuleError('INVALID_INPUT', 'start and end times must be in HH:mm format', 400);
    }
    if (!Number.isInteger(minCapacity) || minCapacity < 1) {
      throw new BusinessRuleError('INVALID_INPUT', 'minCapacity must be an integer of at least 1', 400);
    }

    const startIso = `${date}T${startHourMin}:00.000Z`;
    const endIso = `${date}T${endHourMin}:00.000Z`;

    const startDate = parseUtcDate(startIso);
    const endDate = parseUtcDate(endIso);

    // Validate R1 to R4 on the search window
    validateRuleR1(startDate, endDate);
    validateRuleR2(startDate, 'start');
    validateRuleR2(endDate, 'end');
    validateRuleR3(startDate, endDate);
    validateRuleR4(startDate, endDate);

    // Query candidate rooms having capacity >= minCapacity
    // Ordered by capacity ASC, name ASC (smallest sufficient capacity first)
    const candidateRows = this.db.prepare(`
      SELECT * FROM rooms
      WHERE capacity >= ?
      ORDER BY capacity ASC, name ASC
    `).all(minCapacity) as Parameters<typeof mapRoomRow>[0][];

    const candidateRooms = candidateRows.map(mapRoomRow);

    // Filter out rooms that have overlapping confirmed bookings
    const availableRooms: Room[] = [];
    for (const room of candidateRooms) {
      const bookingsRows = this.db.prepare(`
        SELECT * FROM bookings
        WHERE room_id = ? AND status = 'confirmed'
      `).all(room.id) as Parameters<typeof mapBookingRow>[0][];

      const roomBookings = bookingsRows.map(mapBookingRow);
      let isConflict = false;

      for (const b of roomBookings) {
        if (checkOverlap(startDate, endDate, new Date(b.start), new Date(b.end))) {
          isConflict = true;
          break;
        }
      }

      if (!isConflict) {
        availableRooms.push(room);
      }
    }

    return availableRooms;
  }
}

export const repository = new BookingRepository();
