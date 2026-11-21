export interface Room {
  id: number;
  name: string;
  capacity: number;
  floor: number;
  amenities: string;
}

export interface Booking {
  id: number;
  roomId: number;
  title: string;
  organizerEmail: string;
  attendees: number;
  start: string; // ISO 8601 UTC timestamp
  end: string;   // ISO 8601 UTC timestamp
  status: 'confirmed' | 'cancelled';
  createdAt: string; // ISO 8601 UTC timestamp
}

export interface CreateBookingInput {
  roomId: number;
  title: string;
  organizerEmail: string;
  attendees: number;
  start: string;
  end: string;
}

export type BusinessRuleCode =
  | 'RULE_R1_INVALID_INTERVAL'
  | 'RULE_R2_BOUNDARY'
  | 'RULE_R3_DURATION'
  | 'RULE_R4_BUSINESS_HOURS'
  | 'RULE_R5_PAST_START'
  | 'RULE_R6_CAPACITY_EXCEEDED'
  | 'BOOKING_CONFLICT'
  | 'RULE_R8_CANNOT_CANCEL_STARTED'
  | 'RULE_R9_MAX_BOOKINGS_EXCEEDED'
  | 'ROOM_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'INVALID_INPUT';

export interface APIErrorDetail {
  code: BusinessRuleCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIErrorResponse {
  error: APIErrorDetail;
}
