'use client';

import React from 'react';
import { Booking, Room } from '@/lib/types';
import { formatUtcTimeRange } from '@/lib/time-utils';
import { AlertTriangle, X } from 'lucide-react';

interface CancelModalProps {
  isOpen: boolean;
  booking: Booking | null;
  room: Room | null;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelModal({
  isOpen,
  booking,
  room,
  isLoading,
  error,
  onConfirm,
  onClose,
}: CancelModalProps) {
  if (!isOpen || !booking) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/60">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 id="cancel-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Cancel Booking Confirmation
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          <p>Are you sure you want to cancel this booking? This slot will immediately be freed up for other team members.</p>

          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3.5 space-y-1.5 border border-zinc-200/80 dark:border-zinc-700/80">
            <div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Title: </span>
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{booking.title}</span>
            </div>
            <div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Room: </span>
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{room?.name || `Room #${booking.roomId}`}</span>
            </div>
            <div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Time (UTC): </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                {formatUtcTimeRange(booking.start, booking.end)}
              </span>
            </div>
            <div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Organizer: </span>
              <span className="text-zinc-900 dark:text-zinc-100">{booking.organizerEmail}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm transition disabled:opacity-50"
          >
            {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}
