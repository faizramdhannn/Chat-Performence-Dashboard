'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ActivityTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    // Update activity immediately on mount
    updateActivity();

    // Update activity every 5 minutes (300000ms)
    const interval = setInterval(() => {
      updateActivity();
    }, 300000); // 5 minutes

    // Update activity on user interaction (throttled)
    let lastActivityTime = Date.now();
    const throttleDelay = 60000; // 1 minute throttle

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > throttleDelay) {
        updateActivity();
        lastActivityTime = now;
      }
    };

    // Listen to user interactions (throttled)
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [session]);

  const updateActivity = async () => {
    try {
      await fetch('/api/user/activity', {
        method: 'POST',
      });
      // No console log
    } catch (error) {
      // Silent error
    }
  };

  return null;
}