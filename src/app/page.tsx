'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Room, Booking } from '@/lib/types';
import { getTodayUtcDateString } from '@/lib/time-utils';
import { Header } from '@/components/Header';
import { DayScheduleView } from '@/components/DayScheduleView';
import { CreateBookingForm } from '@/components/CreateBookingForm';
import { FindRoomSection } from '@/components/FindRoomSection';
import { CancelModal } from '@/components/CancelModal';
import { Calendar, Search, PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayUtcDateString());
  const [activeTab, setActiveTab] = useState<'schedule' | 'book' | 'search'>('schedule');

  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick-booking state prefill
  const [prefillData, setPrefillData] = useState<{
    roomId?: number;
    startTime?: string;
    endTime?: string;
  }>({});

  // Cancel Modal State
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    room: Room | null;
    isLoading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    booking: null,
    room: null,
    isLoading: false,
    error: null,
  });

  // Fetch rooms once
  useEffect(() => {
    async function fetchRooms() {
      try {
        setIsRoomsLoading(true);
        const res = await fetch('/api/rooms');
        if (!res.ok) throw new Error('Failed to load rooms');
        const data = await res.json();
        setRooms(data);
      } catch (err) {
        setAppError(err instanceof Error ? err.message : 'Error fetching rooms');
      } finally {
        setIsRoomsLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const setIsRoomsLoading = (val: boolean) => setIsLoadingRooms(val);

  // Fetch bookings for the selected UTC date
  const loadBookings = useCallback(async (date: string) => {
    try {
      setIsLoadingBookings(true);
      const res = await fetch(`/api/bookings?date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch bookings for date');
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Error fetching bookings');
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadBookings(selectedDate);
  }, [selectedDate, loadBookings]);

  // Handle Cancel Click -> Open Confirmation Modal
  const handleOpenCancelModal = (booking: Booking, room: Room) => {
    setCancelModal({
      isOpen: true,
      booking,
      room,
      isLoading: false,
      error: null,
    });
  };

  // Execute Cancellation via DELETE /api/bookings/:id
  const handleConfirmCancel = async () => {
    if (!cancelModal.booking) return;

    setCancelModal((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(`/api/bookings/${cancelModal.booking.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        setCancelModal((prev) => ({
          ...prev,
          isLoading: false,
          error: data.error?.message || 'Cancellation rejected by server',
        }));
      } else {
        setCancelModal({
          isOpen: false,
          booking: null,
          room: null,
          isLoading: false,
          error: null,
        });

        setToastMessage({
          type: 'success',
          text: `Booking "${data.booking?.title || 'Meeting'}" was cancelled successfully.`,
        });

        // Instant refresh (Requirement F5)
        loadBookings(selectedDate);
      }
    } catch (err) {
      setCancelModal((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Network error occurred',
      }));
    }
  };

  // Quick book from Timeline free hour or Find a Room search
  const handleQuickBook = (roomId: number, date: string, startTime: string, endTime: string) => {
    setSelectedDate(date);
    setPrefillData({ roomId, startTime, endTime });
    setActiveTab('book');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm ${
              toastMessage.type === 'success'
                ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-200'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-900 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Application Error Banner */}
        {appError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-900 dark:text-red-200 text-sm flex items-center gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="font-semibold">System Communication Error</p>
              <p className="text-xs">{appError}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs (F1 Day view, F4 Find room, F2 Book room) */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Day Schedule (F1)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'search'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Find a Room (F4)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'book'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Booking (F2)</span>
          </button>
        </div>

        {/* Tab 1: Day Schedule (F1, F3, F5, F6) */}
        {activeTab === 'schedule' && (
          <DayScheduleView
            rooms={rooms}
            bookings={bookings}
            selectedDate={selectedDate}
            isLoading={isLoadingBookings || isLoadingRooms}
            onDateChange={(d) => setSelectedDate(d)}
            onCancelClick={handleOpenCancelModal}
            onQuickBookSlot={handleQuickBook}
          />
        )}

        {/* Tab 2: Find a Room (F4) */}
        {activeTab === 'search' && (
          <FindRoomSection
            onSelectRoomForBooking={(roomId, date, start, end) => {
              handleQuickBook(roomId, date, start, end);
            }}
          />
        )}

        {/* Tab 3: Create Booking (F2) */}
        {activeTab === 'book' && (
          <div className="max-w-2xl mx-auto">
            <CreateBookingForm
              rooms={rooms}
              selectedDate={selectedDate}
              initialRoomId={prefillData.roomId}
              initialStartTime={prefillData.startTime}
              initialEndTime={prefillData.endTime}
              onSuccess={() => {
                loadBookings(selectedDate);
                setActiveTab('schedule');
              }}
            />
          </div>
        )}
      </main>

      {/* Cancel Confirmation Modal (F3) */}
      <CancelModal
        isOpen={cancelModal.isOpen}
        booking={cancelModal.booking}
        room={cancelModal.room}
        isLoading={cancelModal.isLoading}
        error={cancelModal.error}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelModal((prev) => ({ ...prev, isOpen: false, error: null }))}
      />

      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <p>Meeting Room Booking System • Business hours: 08:00 to 20:00 UTC • All timestamps in UTC</p>
      </footer>
    </div>
  );
}
