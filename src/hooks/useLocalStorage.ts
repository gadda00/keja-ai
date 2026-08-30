/**
 * useLocalStorage Hook
 * 
 * A custom hook for synchronizing state with localStorage.
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * Parse stored JSON value safely
 */
function parseValue<T>(value: string | null): T | null {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * Stringify value safely
 */
function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Custom hook for localStorage with SSR support
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? parseValue<T>(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Return a wrapped setter function
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      // Only run on client-side
      if (typeof window === 'undefined') {
        return;
      }

      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to localStorage
        window.localStorage.setItem(key, stringifyValue(valueToStore));

        // Dispatch storage event for other tabs
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: stringifyValue(valueToStore),
            storageArea: localStorage,
          }),
        );
      } catch (error) {
        console.error('Error setting localStorage key:', key, error);
      }
    },
    [key, storedValue],
  );

  // Sync across tabs
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        try {
          const newValue = event.newValue ? parseValue<T>(event.newValue) : initialValue;
          setStoredValue(newValue);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

/**
 * Custom hook for localStorage with expiration
 */
export function useLocalStorageWithExpiry<T>(
  key: string,
  initialValue: T,
  ttl: number, // Time to live in milliseconds
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      
      if (!item) {
        return initialValue;
      }

      const parsed = parseValue<{ value: T; expiry: number }>(item);
      
      if (!parsed || !parsed.expiry) {
        return initialValue;
      }

      // Check if expired
      if (Date.now() > parsed.expiry) {
        window.localStorage.removeItem(key);
        return initialValue;
      }

      return parsed.value;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        const expiry = Date.now() + ttl;

        setStoredValue(valueToStore);
        
        window.localStorage.setItem(
          key,
          JSON.stringify({ value: valueToStore, expiry }),
        );
      } catch (error) {
        console.error('Error setting localStorage with expiry:', key, error);
      }
    },
    [key, storedValue, ttl],
  );

  return [storedValue, setValue];
}

/**
 * Remove item from localStorage
 */
export function useRemoveLocalStorage(key: string): () => void {
  return useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore errors
      }
    }
  }, [key]);
}

/**
 * Clear all localStorage
 */
export function useClearLocalStorage(): () => void {
  return useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.clear();
      } catch {
        // Ignore errors
      }
    }
  }, []);
}
