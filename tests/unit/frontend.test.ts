import { describe, it, expect } from 'vitest';
import {
  generateTimeOptions,
  formatUtcTimeRange,
  formatUtcDateDisplay,
  calculateDurationMinutes,
  formatDuration,
  getTodayUtcDateString,
  isBookingInPastOrStarted,
} from '@/lib/time-utils';

describe('Frontend Helper & Time Utilities Tests', () => {
  it('generates 15-minute time options between 08:00 and 20:00 UTC', () => {
    const options = generateTimeOptions(8, 20);
    expect(options[0]).toBe('08:00');
    expect(options[1]).toBe('08:15');
    expect(options[2]).toBe('08:30');
    expect(options[3]).toBe('08:45');
    expect(options[4]).toBe('09:00');
    expect(options[options.length - 1]).toBe('20:00');
    // From 08:00 to 20:00 is 12 hours * 4 steps + 1 = 49 options
    expect(options.length).toBe(49);
  });

  it('formats UTC time range correctly with UTC label', () => {
    const start = '2030-05-14T09:15:00.000Z';
    const end = '2030-05-14T10:45:00.000Z';
    expect(formatUtcTimeRange(start, end)).toBe('09:15 - 10:45 UTC');
  });

  it('formats UTC date display correctly with UTC label', () => {
    const formatted = formatUtcDateDisplay('2030-05-14');
    expect(formatted).toContain('May 14, 2030');
    expect(formatted).toContain('(UTC)');
  });

  it('calculates duration in minutes accurately', () => {
    expect(calculateDurationMinutes('09:00', '10:30')).toBe(90);
    expect(calculateDurationMinutes('10:00', '10:15')).toBe(15);
    expect(calculateDurationMinutes('10:00', '14:00')).toBe(240);
    expect(calculateDurationMinutes('11:00', '10:00')).toBe(-60);
  });

  it('formats human readable duration', () => {
    expect(formatDuration(15)).toBe('15 mins');
    expect(formatDuration(60)).toBe('1 hour');
    expect(formatDuration(120)).toBe('2 hours');
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(240)).toBe('4 hours');
  });

  it('returns valid YYYY-MM-DD for today UTC', () => {
    const today = getTodayUtcDateString();
    expect(/^\d{4}-\d{2}-\d{2}$/.test(today)).toBe(true);
  });

  it('detects if booking is in past or already started', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(isBookingInPastOrStarted(past)).toBe(true);
    expect(isBookingInPastOrStarted(future)).toBe(false);
  });
});
