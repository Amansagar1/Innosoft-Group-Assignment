'use client';

import React, { useState } from 'react';
import { Room } from '@/lib/types';
import { generateTimeOptions, getTodayUtcDateString, formatDuration, calculateDurationMinutes } from '@/lib/time-utils';
import { Search, Sparkles, Building2, Users, Monitor, ArrowRight, AlertCircle } from 'lucide-react';

interface FindRoomSectionProps {
  onSelectRoomForBooking: (roomId: number, date: string, start: string, end: string) => void;
}

export function FindRoomSection({ onSelectRoomForBooking }: FindRoomSectionProps) {
  const [date, setDate] = useState(getTodayUtcDateString());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [minCapacity, setMinCapacity] = useState<number>(4);

  const [availableRooms, setAvailableRooms] = useState<Room[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const startTimes = generateTimeOptions(8, 19);
  const endTimes = generateTimeOptions(8, 20).filter((t) => t !== '08:00');
  const duration = calculateDurationMinutes(startTime, endTime);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    if (duration <= 0) {
      setSearchError('End time must be after start time.');
      return;
    }
    if (duration < 15 || duration > 240) {
      setSearchError('Booking duration must be between 15 minutes and 4 hours.');
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/availability?date=${date}&start=${startTime}&end=${endTime}&minCapacity=${minCapacity}`
      );
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error?.message || 'Error searching for available rooms');
        setAvailableRooms(null);
      } else {
        setAvailableRooms(data);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Network error');
      setAvailableRooms(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Find Available Rooms
        </h2>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        Search for rooms with enough capacity that are completely free during your chosen time slot. Results are automatically ordered by smallest sufficient capacity first for optimal room fit.
      </p>

      {searchError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label htmlFor="search-date" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
            Date (UTC)
          </label>
          <input
            id="search-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="search-start" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
            Start Time (UTC)
          </label>
          <select
            id="search-start"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono"
          >
            {startTimes.map((t) => (
              <option key={t} value={t}>
                {t} UTC
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-end" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
            End Time (UTC)
          </label>
          <select
            id="search-end"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono"
          >
            {endTimes.map((t) => (
              <option key={t} value={t}>
                {t} UTC
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-min-capacity" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
            Min Capacity
          </label>
          <div className="flex gap-2">
            <input
              id="search-min-capacity"
              type="number"
              min={1}
              max={50}
              value={minCapacity}
              onChange={(e) => setMinCapacity(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {/* Results Section */}
      {availableRooms !== null && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Available Rooms for {startTime} - {endTime} UTC ({formatDuration(duration)})</span>
            </h3>
            <span className="text-xs text-zinc-500">
              {availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} free
            </span>
          </div>

          {availableRooms.length === 0 ? (
            <div className="p-6 text-center rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No rooms are available for the selected time window ({startTime} - {endTime} UTC) and minimum capacity ({minCapacity}).
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Try selecting a different time or reducing the minimum capacity.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableRooms.map((room, idx) => (
                <div
                  key={room.id}
                  className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition bg-white dark:bg-zinc-800/80 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {idx === 0 ? '★ Best Fit' : `Fit #${idx + 1}`}
                        </span>
                        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{room.name}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        Available
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        <span>Capacity: <strong className="text-zinc-800 dark:text-zinc-200">{room.capacity} people</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Floor: <strong>{room.floor}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Amenities: <strong>{room.amenities}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectRoomForBooking(room.id, date, startTime, endTime)}
                    className="mt-4 w-full py-1.5 px-3 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <span>Book {room.name} for this Slot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
