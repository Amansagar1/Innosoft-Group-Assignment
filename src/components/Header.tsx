'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck } from 'lucide-react';

export function Header() {
  const [utcClock, setUtcClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcClock(`${h}:${m}:${s} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
             AMAN
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Meeting Room Booking System
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Conflict-free workspace reservation with strict concurrency protection
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Current Time: {utcClock || '--:--:-- UTC'}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>All times are UTC</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
