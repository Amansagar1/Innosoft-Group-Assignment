'use client';

import React, { useState, useEffect } from 'react';
import { Room } from '@/lib/types';
import {
  generateTimeOptions,
  calculateDurationMinutes,
  formatDuration,
  getTodayUtcDateString,
} from '@/lib/time-utils';
import { PlusCircle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface CreateBookingFormProps {
  rooms: Room[];
  selectedDate: string;
  initialRoomId?: number;
  initialStartTime?: string;
  initialEndTime?: string;
  onSuccess: () => void;
}

export function CreateBookingForm({
  rooms,
  selectedDate,
  initialRoomId,
  initialStartTime,
  initialEndTime,
  onSuccess,
}: CreateBookingFormProps) {
  const [roomId, setRoomId] = useState<number>(initialRoomId || (rooms[0]?.id ?? 1));
  const [title, setTitle] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [attendees, setAttendees] = useState<number>(1);
  const [date, setDate] = useState(selectedDate || getTodayUtcDateString());
  const [startTime, setStartTime] = useState(initialStartTime || '09:00');
  const [endTime, setEndTime] = useState(initialEndTime || '10:00');

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<{ code: string; message: string; details?: unknown } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startTimes = generateTimeOptions(8, 19);
  const endTimes = generateTimeOptions(8, 20).filter((t) => t !== '08:00');

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const durationMinutes = calculateDurationMinutes(startTime, endTime);

  // Sync props when initial values change (e.g. from Find a Room quick-action)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialRoomId) setRoomId(initialRoomId);
    if (initialStartTime) setStartTime(initialStartTime);
    if (initialEndTime) setEndTime(initialEndTime);
    if (selectedDate) setDate(selectedDate);
  }, [initialRoomId, initialStartTime, initialEndTime, selectedDate]);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = 'Title is required.';
    } else if (trimmedTitle.length > 100) {
      errors.title = 'Title must be 100 characters or fewer.';
    }

    const trimmedEmail = organizerEmail.trim();
    if (!trimmedEmail) {
      errors.organizerEmail = 'Organizer email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.organizerEmail = 'Please enter a valid email address.';
    }

    if (!selectedRoom) {
      errors.roomId = 'Please select a room.';
    } else if (attendees < 1) {
      errors.attendees = 'Attendees must be at least 1.';
    } else if (attendees > selectedRoom.capacity) {
      errors.attendees = `Attendees (${attendees}) cannot exceed room capacity (${selectedRoom.capacity}) for ${selectedRoom.name}.`;
    }

    if (!date) {
      errors.date = 'Date is required.';
    }

    if (durationMinutes <= 0) {
      errors.time = 'End time must be after start time.';
    } else if (durationMinutes < 15) {
      errors.time = 'Booking must last at least 15 minutes.';
    } else if (durationMinutes > 240) {
      errors.time = 'Booking cannot exceed 4 hours (240 minutes).';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        roomId,
        title: title.trim(),
        organizerEmail: organizerEmail.trim(),
        attendees: Number(attendees),
        start: `${date}T${startTime}:00.000Z`,
        end: `${date}T${endTime}:00.000Z`,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || { code: 'UNKNOWN_ERROR', message: 'Failed to create booking' });
      } else {
        setSuccessMessage(`Booking "${data.title}" successfully confirmed in ${selectedRoom?.name || 'room'}!`);
        setTitle('');
        setAttendees(1);
        onSuccess();
      }
    } catch (err) {
      setServerError({
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network communication error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Create New Booking
        </h2>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-5 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 text-red-800 dark:text-red-200 text-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-900 dark:text-red-100">Server Rejected Request</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200">
                  {serverError.code}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm">{serverError.message}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room Selection */}
        <div>
          <label htmlFor="booking-room" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
            Meeting Room <span className="text-red-500">*</span>
          </label>
          <select
            id="booking-room"
            value={roomId}
            onChange={(e) => setRoomId(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Capacity: {r.capacity}, Floor: {r.floor} - {r.amenities})
              </option>
            ))}
          </select>
          {clientErrors.roomId && <p className="mt-1 text-xs text-red-600">{clientErrors.roomId}</p>}
        </div>

        {/* Title */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="booking-title" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-zinc-400">{title.trim().length}/100</span>
          </div>
          <input
            id="booking-title"
            type="text"
            placeholder="e.g. Q3 Roadmap Review"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {clientErrors.title && <p className="mt-1 text-xs text-red-600">{clientErrors.title}</p>}
        </div>

        {/* Organizer Email and Attendees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="booking-organizer" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Organizer Email <span className="text-red-500">*</span>
            </label>
            <input
              id="booking-organizer"
              type="email"
              placeholder="user@example.com"
              value={organizerEmail}
              onChange={(e) => setOrganizerEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {clientErrors.organizerEmail && <p className="mt-1 text-xs text-red-600">{clientErrors.organizerEmail}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="booking-attendees" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Attendees <span className="text-red-500">*</span>
              </label>
              {selectedRoom && (
                <span className="text-xs text-zinc-400">Max: {selectedRoom.capacity}</span>
              )}
            </div>
            <input
              id="booking-attendees"
              type="number"
              min={1}
              max={selectedRoom?.capacity || 50}
              value={attendees}
              onChange={(e) => setAttendees(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {clientErrors.attendees && <p className="mt-1 text-xs text-red-600">{clientErrors.attendees}</p>}
          </div>
        </div>

        {/* Date and Time Pickers (All times UTC) */}
        <div>
          <label htmlFor="booking-date" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
            Date (UTC) <span className="text-red-500">*</span>
          </label>
          <input
            id="booking-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {clientErrors.date && <p className="mt-1 text-xs text-red-600">{clientErrors.date}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="booking-start-time" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Start Time (UTC) <span className="text-red-500">*</span>
            </label>
            <select
              id="booking-start-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            >
              {startTimes.map((t) => (
                <option key={t} value={t}>
                  {t} UTC
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="booking-end-time" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              End Time (UTC) <span className="text-red-500">*</span>
            </label>
            <select
              id="booking-end-time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            >
              {endTimes.map((t) => (
                <option key={t} value={t}>
                  {t} UTC
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Duration and Boundary Hints */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Duration:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {formatDuration(durationMinutes)}
            </span>
          </div>
          <span className="text-zinc-500">Business hours: 08:00 - 20:00 UTC</span>
        </div>

        {clientErrors.time && <p className="text-xs text-red-600">{clientErrors.time}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? 'Confirming with server...' : 'Confirm & Book Room'}
        </button>
      </form>
    </div>
  );
}
