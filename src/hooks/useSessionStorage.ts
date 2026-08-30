/**
 * useSessionStorage Hook
 * 
 * A custom hook for synchronizing state with sessionStorage.
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
 * Custom hook for sessionStorage with SSR support
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
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

        // Save to sessionStorage
        window.sessionStorage.setItem(key, stringifyValue(valueToStore));

        // Dispatch storage event
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: stringifyValue(valueToStore),
            storageArea: sessionStorage,
          }),
        );
      } catch (error) {
        console.error('Error setting sessionStorage key:', key, error);
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
      if (event.key === key && event.storageArea === sessionStorage) {
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
 * Remove item from sessionStorage
 */
export function useRemoveSessionStorage(key: string): () => void {
  return useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Ignore errors
      }
    }
  }, [key]);
}

/**
 * Clear all sessionStorage
 */
export function useClearSessionStorage(): () => void {
  return useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.clear();
      } catch {
        // Ignore errors
      }
    }
  }, []);
}
