'use client';

import React from 'react';
import { Booking, Room } from '@/lib/types';
import {
  formatUtcDateDisplay,
  formatUtcTimeRange,
  isBookingInPastOrStarted,
} from '@/lib/time-utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  Users,
  Monitor,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DayScheduleViewProps {
  rooms: Room[];
  bookings: Booking[];
  selectedDate: string;
  isLoading: boolean;
  onDateChange: (newDate: string) => void;
  onCancelClick: (booking: Booking, room: Room) => void;
  onQuickBookSlot: (roomId: number, date: string, startTime: string, endTime: string) => void;
}

export function DayScheduleView({
  rooms,
  bookings,
  selectedDate,
  isLoading,
  onDateChange,
  onCancelClick,
  onQuickBookSlot,
}: DayScheduleViewProps) {
  // Navigation for previous/next/today UTC day
  const changeDay = (offsetDays: number) => {
    const parts = selectedDate.split('-');
    const curYear = parseInt(parts[0], 10);
    const curMonth = parseInt(parts[1], 10) - 1;
    const curDay = parseInt(parts[2], 10);

    const d = new Date(Date.UTC(curYear, curMonth, curDay + offsetDays));
    const nextStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    onDateChange(nextStr);
  };

  const setToday = () => {
    const now = new Date();
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    onDateChange(todayStr);
  };

  // Business hours blocks: 08:00 to 20:00 (12 hours)
  const businessHours = Array.from({ length: 12 }, (_, i) => 8 + i);

  return (
    <div className="space-y-6">
      {/* Date Header & Navigation Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {formatUtcDateDisplay(selectedDate)}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Schedule across all 5 conference rooms (08:00 - 20:00 UTC)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeDay(-1)}
            className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title="Previous Day (UTC)"
            aria-label="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={setToday}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
          >
            Today (UTC)
          </button>
          <button
            type="button"
            onClick={() => changeDay(1)}
            className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title="Next Day (UTC)"
            aria-label="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
            aria-label="Pick date (UTC)"
          />
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="p-8 text-center text-zinc-500 text-sm animate-pulse">
          Loading schedule data from server...
        </div>
      )}

      {/* Room Grouped Schedules */}
      <div className="space-y-4">
        {rooms.map((room) => {
          const roomBookings = bookings.filter(
            (b) => b.roomId === room.id && b.status === 'confirmed'
          );

          return (
            <div
              key={room.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              {/* Room Metadata Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 text-sm">
                    {room.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>{room.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Floor {room.floor}
                      </span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Cap: {room.capacity}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5" />
                        {room.amenities}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs text-zinc-500">
                    {roomBookings.length} booking{roomBookings.length !== 1 ? 's' : ''} on this day
                  </span>
                </div>
              </div>

              {/* Visual Schedule Timeline Grid (08:00 - 20:00 UTC) */}
              <div className="mt-4">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Day Timeline (08:00 to 20:00 UTC)</span>
                  <span className="text-[10px] text-zinc-400">Click free hour to book</span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {businessHours.map((h) => {
                    const hourStart = `${String(h).padStart(2, '0')}:00`;
                    const hourEnd = `${String(h + 1).padStart(2, '0')}:00`;

                    // Check if this hour is covered by any confirmed booking
                    const isOccupied = roomBookings.some((b) => {
                      const bStart = new Date(b.start);
                      const bEnd = new Date(b.end);
                      const slotStart = new Date(`${selectedDate}T${hourStart}:00.000Z`);
                      const slotEnd = new Date(`${selectedDate}T${hourEnd}:00.000Z`);
                      return slotStart < bEnd && slotEnd > bStart;
                    });

                    return (
                      <div
                        key={h}
                        onClick={() => {
                          if (!isOccupied) {
                            onQuickBookSlot(room.id, selectedDate, hourStart, hourEnd);
                          }
                        }}
                        className={`p-2 rounded-lg text-center border text-xs transition cursor-pointer ${
                          isOccupied
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 cursor-not-allowed'
                            : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 hover:border-blue-400'
                        }`}
                        title={isOccupied ? `Occupied during ${hourStart} - ${hourEnd} UTC` : `Free: Click to book ${room.name} from ${hourStart} to ${hourEnd} UTC`}
                      >
                        <div className="font-mono font-semibold text-[11px]">{hourStart}</div>
                        <div className="text-[10px] mt-0.5 font-medium">
                          {isOccupied ? 'Booked' : 'Free'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bookings List for this Room */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                {roomBookings.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-1">
                    No confirmed bookings for {room.name} on this date. The entire room is open.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {roomBookings.map((b) => {
                      const isStarted = isBookingInPastOrStarted(b.start);

                      return (
                        <div
                          key={b.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                {b.title}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                {formatUtcTimeRange(b.start, b.end)}
                              </span>
                              {isStarted && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                  Already Started (Cannot Cancel)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Organizer: <strong className="text-zinc-700 dark:text-zinc-300">{b.organizerEmail}</strong></span>
                              <span>•</span>
                              <span>Attendees: <strong className="text-zinc-700 dark:text-zinc-300">{b.attendees}</strong></span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onCancelClick(b, room)}
                            disabled={isStarted}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer ${
                              isStarted
                                ? 'opacity-40 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                            }`}
                            title={isStarted ? 'Booking has already started and cannot be cancelled (Rule R8)' : 'Cancel this booking (Confirmation required)'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
