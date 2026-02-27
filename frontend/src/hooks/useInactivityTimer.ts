import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

// 1 Hour in milliseconds
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

export function useInactivityTimer() {
    const { logout, user } = useAuth();
    const timeoutRef = useRef<number | null>(null);

    const handleLogout = useCallback(() => {
        // Only attempt to log out if the user is actually authenticated
        if (user) {
            console.log("Session expired due to inactivity. Logging out...");
            logout();
        }
    }, [logout, user]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }

        // Only set the timer if a user is logged in
        if (user) {
            timeoutRef.current = window.setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
        }
    }, [handleLogout, user]);

    useEffect(() => {
        // Events that qualify as "activity"
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // Throttle the resets so we aren't firing clearTimeout/setTimeout thousands of times per second on mousemove
        let throttleTimer: number | null = null;
        const throttledReset = () => {
            if (!throttleTimer) {
                throttleTimer = window.setTimeout(() => {
                    throttleTimer = null;
                    resetTimer();
                }, 1000); // 1-second throttle window
            }
        };

        // Initialize the first timer
        resetTimer();

        // Attach listeners
        events.forEach((event) => {
            document.addEventListener(event, throttledReset, { passive: true });
        });

        return () => {
            // Cleanup on unmount
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
            if (throttleTimer) window.clearTimeout(throttleTimer);
            events.forEach((event) => {
                document.removeEventListener(event, throttledReset);
            });
        };
    }, [resetTimer]);
}
