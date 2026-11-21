import { Booking, BusinessRuleCode, Room } from './types';

export class BusinessRuleError extends Error {
  public readonly code: BusinessRuleCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: BusinessRuleCode, message: string, status: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BusinessRuleError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Checks if two time intervals overlap.
 * Half-open interval convention: [startA, endA) and [startB, endB).
 * Overlap exists iff startA < endB && endA > startB.
 * Back-to-back intervals (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
export function checkOverlap(
  startA: Date | number,
  endA: Date | number,
  startB: Date | number,
  endB: Date | number
): boolean {
  const sA = typeof startA === 'number' ? startA : startA.getTime();
  const eA = typeof endA === 'number' ? endA : endA.getTime();
  const sB = typeof startB === 'number' ? startB : startB.getTime();
  const eB = typeof endB === 'number' ? endB : endB.getTime();

  return sA < eB && eA > sB;
}

/**
 * Parses and verifies an ISO 8601 UTC date string.
 */
export function parseUtcDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new BusinessRuleError('INVALID_INPUT', 'Timestamp must be a valid string', 400);
  }

  // Ensure UTC indicator (Z or +00:00)
  const isUtcExplicit = dateStr.endsWith('Z') || dateStr.endsWith('+00:00') || dateStr.endsWith('-00:00');
  if (!isUtcExplicit) {
    throw new BusinessRuleError('INVALID_INPUT', `Timestamps must be explicitly in UTC format (e.g. ending in 'Z'). Received: ${dateStr}`, 400);
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new BusinessRuleError('INVALID_INPUT', `Invalid ISO 8601 timestamp: ${dateStr}`, 400);
  }

  return date;
}

/**
 * Rule R1: end must be after start
 */
export function validateRuleR1(start: Date, end: Date): void {
  if (end.getTime() <= start.getTime()) {
    throw new BusinessRuleError(
      'RULE_R1_INVALID_INTERVAL',
      'End time must be strictly after start time.',
      400
    );
  }
}

/**
 * Rule R2: start and end must fall on 15-minute boundaries (minutes 00, 15, 30, 45, seconds 0, ms 0)
 */
export function validateRuleR2(date: Date, fieldName: 'start' | 'end'): void {
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const is15MinStep = minutes === 0 || minutes === 15 || minutes === 30 || minutes === 45;
  if (!is15MinStep || seconds !== 0 || ms !== 0) {
    throw new BusinessRuleError(
      'RULE_R2_BOUNDARY',
      `${fieldName} timestamp must fall on 15-minute boundaries (00, 15, 30, 45 minutes) with zero seconds and milliseconds.`,
      400
    );
  }
}

/**
 * Rule R3: A booking must last at least 15 minutes and at most 4 hours.
 */
export function validateRuleR3(start: Date, end: Date): void {
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  if (durationMinutes < 15) {
    throw new BusinessRuleError(
      'RULE_R3_DURATION',
      `Booking duration must be at least 15 minutes. Current duration: ${durationMinutes} minutes.`,
      400
    );
  }
  if (durationMinutes > 240) {
    throw new BusinessRuleError(
      'RULE_R3_DURATION',
      `Booking duration cannot exceed 4 hours (240 minutes). Current duration: ${durationMinutes} minutes.`,
      400
    );
  }
}

/**
 * Rule R4: A booking must fall entirely within business hours, 08:00 to 20:00 UTC, and start and end on the same UTC day.
 */
export function validateRuleR4(start: Date, end: Date): void {
  // Check same UTC day
  const startDay = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
  const endDay = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;

  if (startDay !== endDay) {
    throw new BusinessRuleError(
      'RULE_R4_BUSINESS_HOURS',
      'Booking must start and end on the same UTC day.',
      400
    );
  }

  const startHourMin = start.getUTCHours() * 60 + start.getUTCMinutes();
  const endHourMin = end.getUTCHours() * 60 + end.getUTCMinutes();

  const businessStart = 8 * 60;  // 08:00 UTC
  const businessEnd = 20 * 60;   // 20:00 UTC

  if (startHourMin < businessStart || endHourMin > businessEnd) {
    throw new BusinessRuleError(
      'RULE_R4_BUSINESS_HOURS',
      'Booking must fall entirely within business hours (08:00 to 20:00 UTC).',
      400
    );
  }
}

/**
 * Rule R5: A booking cannot start in the past.
 */
export function validateRuleR5(start: Date, now: Date = new Date()): void {
  if (start.getTime() < now.getTime()) {
    throw new BusinessRuleError(
      'RULE_R5_PAST_START',
      'A booking cannot start in the past.',
      400
    );
  }
}

/**
 * Rule R6: Attendees cannot exceed room capacity and must be at least 1.
 */
export function validateRuleR6(attendees: number, roomCapacity: number): void {
  if (!Number.isInteger(attendees) || attendees < 1) {
    throw new BusinessRuleError(
      'RULE_R6_CAPACITY_EXCEEDED',
      'Attendees must be an integer of at least 1.',
      400
    );
  }
  if (attendees > roomCapacity) {
    throw new BusinessRuleError(
      'RULE_R6_CAPACITY_EXCEEDED',
      `Attendees (${attendees}) cannot exceed room capacity (${roomCapacity}).`,
      400
    );
  }
}

/**
 * Rule R7: A room cannot have two confirmed bookings that overlap in time.
 * Cancelled bookings do not block a slot.
 */
export function validateRuleR7(
  roomId: number,
  roomName: string,
  start: Date,
  end: Date,
  existingBookings: Booking[]
): void {
  for (const existing of existingBookings) {
    // Only check confirmed bookings in the same room
    if (existing.roomId !== roomId || existing.status !== 'confirmed') {
      continue;
    }

    const exStart = new Date(existing.start);
    const exEnd = new Date(existing.end);

    if (checkOverlap(start, end, exStart, exEnd)) {
      const formattedStart = `${String(exStart.getUTCHours()).padStart(2, '0')}:${String(exStart.getUTCMinutes()).padStart(2, '0')}`;
      const formattedEnd = `${String(exEnd.getUTCHours()).padStart(2, '0')}:${String(exEnd.getUTCMinutes()).padStart(2, '0')}`;

      throw new BusinessRuleError(
        'BOOKING_CONFLICT',
        `Room ${roomName} is already booked from ${formattedStart} to ${formattedEnd} UTC.`,
        409,
        { conflictingBookingId: existing.id }
      );
    }
  }
}

/**
 * Rule R8: A booking that has already started cannot be cancelled.
 * Cancelling a booking that is already cancelled is a no-op that returns success.
 * Returns true if cancellation should proceed, false if it's a no-op (already cancelled).
 */
export function validateRuleR8(booking: Booking, now: Date = new Date()): boolean {
  if (booking.status === 'cancelled') {
    return false; // No-op, already cancelled
  }

  const startTime = new Date(booking.start).getTime();
  if (startTime <= now.getTime()) {
    throw new BusinessRuleError(
      'RULE_R8_CANNOT_CANCEL_STARTED',
      'A booking that has already started cannot be cancelled.',
      409
    );
  }

  return true;
}

/**
 * Rule R9: An organizer cannot hold more than 3 confirmed bookings that start on the same day.
 */
export function validateRuleR9(
  organizerEmail: string,
  targetDate: Date,
  existingBookings: Booking[]
): void {
  const targetDayStr = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDate.getUTCDate()).padStart(2, '0')}`;
  const normalizedEmail = organizerEmail.trim().toLowerCase();

  let count = 0;
  for (const b of existingBookings) {
    if (b.status !== 'confirmed') continue;
    if (b.organizerEmail.trim().toLowerCase() !== normalizedEmail) continue;

    const bStart = new Date(b.start);
    const bDayStr = `${bStart.getUTCFullYear()}-${String(bStart.getUTCMonth() + 1).padStart(2, '0')}-${String(bStart.getUTCDate()).padStart(2, '0')}`;

    if (bDayStr === targetDayStr) {
      count++;
    }
  }

  if (count >= 3) {
    throw new BusinessRuleError(
      'RULE_R9_MAX_BOOKINGS_EXCEEDED',
      `Organizer ${organizerEmail} already has 3 confirmed bookings starting on ${targetDayStr}.`,
      409
    );
  }
}

/**
 * Validates basic field syntax before rule validation.
 */
export function validateBookingInputSyntax(input: {
  roomId: unknown;
  title: unknown;
  organizerEmail: unknown;
  attendees: unknown;
  start: unknown;
  end: unknown;
}): {
  roomId: number;
  title: string;
  organizerEmail: string;
  attendees: number;
  startStr: string;
  endStr: string;
} {
  if (!input || typeof input !== 'object') {
    throw new BusinessRuleError('INVALID_INPUT', 'Request body must be a valid JSON object', 400);
  }

  const { roomId, title, organizerEmail, attendees, start, end } = input;

  if (typeof roomId !== 'number' || !Number.isInteger(roomId) || roomId <= 0) {
    throw new BusinessRuleError('INVALID_INPUT', 'roomId must be a positive integer', 400);
  }

  if (typeof title !== 'string') {
    throw new BusinessRuleError('INVALID_INPUT', 'title must be a string', 400);
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
    throw new BusinessRuleError('INVALID_INPUT', 'title must be between 1 and 100 characters after trimming', 400);
  }

  if (typeof organizerEmail !== 'string') {
    throw new BusinessRuleError('INVALID_INPUT', 'organizerEmail must be a string', 400);
  }
  const trimmedEmail = organizerEmail.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new BusinessRuleError('INVALID_INPUT', 'organizerEmail must be a valid email address', 400);
  }

  if (typeof attendees !== 'number' || !Number.isInteger(attendees) || attendees < 1) {
    throw new BusinessRuleError('RULE_R6_CAPACITY_EXCEEDED', 'attendees must be an integer of at least 1', 400);
  }

  if (typeof start !== 'string' || typeof end !== 'string') {
    throw new BusinessRuleError('INVALID_INPUT', 'start and end must be ISO 8601 strings', 400);
  }

  return {
    roomId,
    title: trimmedTitle,
    organizerEmail: trimmedEmail,
    attendees,
    startStr: start,
    endStr: end,
  };
}

/**
 * Comprehensive pure validator that runs all rules R1-R9.
 */
export function validateBookingRequest(
  input: {
    roomId: number;
    title: string;
    organizerEmail: string;
    attendees: number;
    start: string;
    end: string;
  },
  room: Room,
  existingBookings: Booking[],
  now: Date = new Date()
): { startDate: Date; endDate: Date } {
  const startDate = parseUtcDate(input.start);
  const endDate = parseUtcDate(input.end);

  // R1: end after start
  validateRuleR1(startDate, endDate);

  // R2: 15-minute boundaries
  validateRuleR2(startDate, 'start');
  validateRuleR2(endDate, 'end');

  // R3: duration 15 min - 4 hours
  validateRuleR3(startDate, endDate);

  // R4: business hours 08:00 - 20:00 UTC, same UTC day
  validateRuleR4(startDate, endDate);

  // R5: not in the past
  validateRuleR5(startDate, now);

  // R6: capacity
  validateRuleR6(input.attendees, room.capacity);

  // R7: room conflict
  validateRuleR7(room.id, room.name, startDate, endDate, existingBookings);

  // R9: organizer max 3 bookings on same UTC day
  validateRuleR9(input.organizerEmail, startDate, existingBookings);

  return { startDate, endDate };
}
