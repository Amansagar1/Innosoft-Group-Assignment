/**
 * Frontend time utilities ensuring strict UTC handling across UI components.
 */

export function getTodayUtcDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateTimeOptions(startHour = 8, endHour = 20): string[] {
  const options: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === endHour && m > 0) break;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
}

export function formatUtcTimeRange(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sH = String(s.getUTCHours()).padStart(2, '0');
    const sM = String(s.getUTCMinutes()).padStart(2, '0');
    const eH = String(e.getUTCHours()).padStart(2, '0');
    const eM = String(e.getUTCMinutes()).padStart(2, '0');
    return `${sH}:${sM} - ${eH}:${eM} UTC`;
  } catch {
    return `${startIso} - ${endIso}`;
  }
}

export function formatUtcDateDisplay(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) + ' (UTC)';
    }
    return `${dateStr} (UTC)`;
  } catch {
    return `${dateStr} (UTC)`;
  }
}

export function calculateDurationMinutes(startHourMin: string, endHourMin: string): number {
  if (!startHourMin || !endHourMin) return 0;
  const [sH, sM] = startHourMin.split(':').map((v) => parseInt(v, 10));
  const [eH, eM] = endHourMin.split(':').map((v) => parseInt(v, 10));
  return (eH * 60 + eM) - (sH * 60 + sM);
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 mins';
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${remainingMins} mins`;
}

export function isBookingInPastOrStarted(startIso: string): boolean {
  try {
    const start = new Date(startIso).getTime();
    const now = Date.now();
    return start <= now;
  } catch {
    return false;
  }
}
