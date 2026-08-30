/**
 * Generic Store Utilities
 * 
 * Provides type-safe store creation utilities and helpers for Zustand.
 */
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist, type PersistStorage } from 'zustand/middleware';

/**
 * Storage interface for persistence
 */
export interface KejaStorage<T> {
  getItem: (name: string) => T | null;
  setItem: (name: string, value: T) => void;
  removeItem: (name: string) => void;
}

/**
 * Create a devtools-enabled store
 */
export function createDevStore<T extends object>(
  initialState: T,
  name: string,
): UseBoundStore<StoreApi<T>> {
  return create<T>()(
    devtools(
      () => initialState,
      { name },
    ),
  );
}

/**
 * Create a persisted store with devtools
 */
export function createPersistedStore<T extends object>(
  initialState: T,
  config: {
    name: string;
    storage: PersistStorage<T> | KejaStorage<T>;
    partialize?: (state: T) => Partial<T>;
    version?: number;
    migrate?: (persistedState: unknown, version: number) => T | Promise<T>;
  },
): UseBoundStore<StoreApi<T>> {
  return create<T>()(
    devtools(
      persist(
        () => initialState,
        {
          name: config.name,
          storage: config.storage,
          partialize: config.partialize,
          version: config.version,
          migrate: config.migrate,
        },
      ),
      { name: config.name },
    ),
  );
}

/**
 * Create a store with actions
 */
export function createStoreWithActions<State extends object, Actions extends object>(
  initialState: State,
  actions: (set: any, get: any) => Actions,
  name: string,
): UseBoundStore<StoreApi<State & Actions>> {
  return create<State & Actions>()(
    devtools(
      (set, get) => ({
        ...initialState,
        ...actions(set, get),
      }),
      { name },
    ),
  );
}

/**
 * Create a persisted store with actions
 */
export function createPersistedStoreWithActions<
  State extends object,
  Actions extends object,
>(
  initialState: State,
  actions: (set: any, get: any) => Actions,
  config: {
    name: string;
    storage: PersistStorage<State & Actions> | KejaStorage<State & Actions>;
    partialize?: (state: State & Actions) => Partial<State & Actions>;
    version?: number;
  },
): UseBoundStore<StoreApi<State & Actions>> {
  return create<State & Actions>()(
    devtools(
      persist(
        (set, get) => ({
          ...initialState,
          ...actions(set, get),
        }),
        {
          name: config.name,
          storage: config.storage,
          partialize: config.partialize,
          version: config.version,
        },
      ),
      { name: config.name },
    ),
  );
}

/**
 * LocalStorage implementation for Zustand persist
 */
export const localStorageAdapter: KejaStorage<unknown> = {
  getItem: (name) => {
    try {
      const item = localStorage.getItem(name);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};

/**
 * SessionStorage implementation for Zustand persist
 */
export const sessionStorageAdapter: KejaStorage<unknown> = {
  getItem: (name) => {
    try {
      const item = sessionStorage.getItem(name);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      sessionStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name) => {
    try {
      sessionStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};
