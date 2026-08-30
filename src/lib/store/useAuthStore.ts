/**
 * Authentication Store
 * 
 * Manages authentication state, user sessions, and role-based access control.
 * This store replaces the existing context-based auth with a more maintainable
 * Zustand-based approach while maintaining backward compatibility.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { localStorageAdapter } from './useStore';

export type Role = 'user' | 'agent' | 'admin';
export type AuthProvider = 'google' | 'email' | 'demo';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: Role;
  provider: AuthProvider;
  status: 'active' | 'suspended' | 'pending';
  phone?: string;
  company?: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  // For demo accounts
  blurb?: string;
}

export interface Session {
  token: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
  remember: boolean;
}

interface AuthState {
  // Current user
  user: UserAccount | null;
  
  // Current session
  session: Session | null;
  
  // All users (for demo mode)
  users: UserAccount[];
  
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Pending auth intent (for modal coordination)
  pendingIntent: { reason: string; onDone: () => void } | null;
  
  // Auth modal state
  authModalOpen: boolean;
  
  // Demo mode flag
  isDemoMode: boolean;
}

interface AuthActions {
  // Authentication actions
  login: (user: UserAccount, session: Session) => void;
  logout: (reason?: string) => void;
  register: (user: UserAccount) => void;
  
  // Session management
  setSession: (session: Session | null) => void;
  refreshSession: () => void;
  
  // User management
  updateUser: (updates: Partial<UserAccount>) => void;
  addUser: (user: UserAccount) => void;
  removeUser: (userId: string) => void;
  
  // Modal actions
  setAuthModalOpen: (open: boolean) => void;
  toggleAuthModalOpen: () => void;
  
  // Intent management
  setPendingIntent: (intent: { reason: string; onDone: () => void } | null) => void;
  clearPendingIntent: () => void;
  requireAuth: (reason: string, onDone: () => void) => void;
  
  // Demo mode
  setDemoMode: (isDemo: boolean) => void;
  
  // Utility
  clearError: () => void;
  setError: (error: string) => void;
  setLoading: (isLoading: boolean) => void;
}

const initialState: AuthState = {
  user: null,
  session: null,
  users: [],
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingIntent: null,
  authModalOpen: false,
  isDemoMode: true, // Default to demo mode for static hosting
};

// Seed demo users
const seedUsers: UserAccount[] = [
  {
    id: 'usr-admin',
    name: 'Clive Mwangi',
    email: 'admin@keja.ai',
    role: 'admin',
    provider: 'email',
    status: 'active',
    phone: '+254 700 123 456',
    company: 'Chacadom Investments',
    createdAt: '2026-06-01T08:00:00Z',
    lastLoginAt: new Date().toISOString(),
    loginCount: 42,
  },
  {
    id: 'usr-agent',
    name: 'Victor Ndunda',
    email: 'agent@keja.ai',
    role: 'agent',
    provider: 'email',
    status: 'active',
    phone: '+254 711 222 333',
    company: 'Chacadom Premier Properties',
    createdAt: '2026-06-12T09:30:00Z',
    lastLoginAt: new Date().toISOString(),
    loginCount: 17,
  },
  {
    id: 'usr-investor',
    name: 'Amina Otieno',
    email: 'investor@keja.ai',
    role: 'user',
    provider: 'email',
    status: 'active',
    phone: '+254 722 444 555',
    createdAt: '2026-07-03T14:15:00Z',
    lastLoginAt: new Date().toISOString(),
    loginCount: 9,
  },
];

// Demo Google accounts
const demoGoogleAccounts: UserAccount[] = [
  {
    id: 'demo-amina',
    name: 'Amina Otieno',
    email: 'amina.otieno@gmail.com',
    role: 'user',
    provider: 'google',
    status: 'active',
    picture: '#a88727',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    loginCount: 5,
    blurb: 'Verified investor \u20b7 3 tokenized holdings',
  },
  {
    id: 'demo-victor',
    name: 'Victor Ndunda',
    email: 'victor.ndunda@chacadom.com',
    role: 'agent',
    provider: 'google',
    status: 'active',
    picture: '#1f2937',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    loginCount: 3,
    blurb: 'Agent \u20b7 Chacadom Premier Properties',
  },
  {
    id: 'demo-clive',
    name: 'Clive Mwangi',
    email: 'clive@chacadom.com',
    role: 'admin',
    provider: 'google',
    status: 'active',
    picture: '#7c2d12',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    loginCount: 2,
    blurb: 'Platform administrator \u20b7 Chacadom',
  },
];

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        users: [...seedUsers, ...demoGoogleAccounts],
        
        login: (user, session) => {
          set({
            user,
            session,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            authModalOpen: false,
            pendingIntent: null,
          });
        },
        
        logout: (reason) => {
          // Call any pending intent callbacks
          const pendingIntent = get().pendingIntent;
          if (pendingIntent) {
            pendingIntent.onDone();
          }
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: null,
            pendingIntent: null,
          });
        },
        
        register: (user) => {
          set((state) => ({
            users: [...state.users, user],
          }));
        },
        
        setSession: (session) => {
          set({
            session,
            isAuthenticated: !!session,
          });
        },
        
        refreshSession: () => {
          const session = get().session;
          if (session) {
            set({
              session: {
                ...session,
                expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
              },
            });
          }
        },
        
        updateUser: (updates) => {
          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
            users: state.users.map((u) =>
              u.id === state.user?.id ? { ...u, ...updates } : u
            ),
          }));
        },
        
        addUser: (user) => {
          set((state) => ({
            users: [...state.users, user],
          }));
        },
        
        removeUser: (userId) => {
          set((state) => ({
            users: state.users.filter((u) => u.id !== userId),
          }));
        },
        
        setAuthModalOpen: (open) => set({ authModalOpen: open }),
        toggleAuthModalOpen: () => 
          set((state) => ({ authModalOpen: !state.authModalOpen })),
        
        setPendingIntent: (intent) => set({ pendingIntent: intent }),
        clearPendingIntent: () => set({ pendingIntent: null }),
        
        requireAuth: (reason, onDone) => {
          const isAuthenticated = get().isAuthenticated;
          if (isAuthenticated) {
            onDone();
          } else {
            set({
              authModalOpen: true,
              pendingIntent: { reason, onDone },
            });
          }
        },
        
        setDemoMode: (isDemo) => set({ isDemoMode: isDemo }),
        
        clearError: () => set({ error: null }),
        setError: (error) => set({ error, isLoading: false }),
        setLoading: (isLoading) => set({ isLoading }),
      }),
      {
        name: 'AuthStore',
        storage: localStorageAdapter,
        partialize: (state) => ({
          // Only persist these fields
          user: state.user,
          session: state.session,
          users: state.users,
          isAuthenticated: state.isAuthenticated,
          isDemoMode: state.isDemoMode,
        }),
      },
    ),
    { name: 'AuthStore' },
  ),
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsAdmin = () => useAuthStore((state) => state.user?.role === 'admin');
export const useIsAgent = () => useAuthStore((state) => state.user?.role === 'agent');
export const useUserRole = () => useAuthStore((state) => state.user?.role);
export const useSession = () => useAuthStore((state) => state.session);
export const useUsers = () => useAuthStore((state) => state.users);
export const usePendingIntent = () => useAuthStore((state) => state.pendingIntent);
export const useAuthModalOpen = () => useAuthStore((state) => state.authModalOpen);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useIsDemoMode = () => useAuthStore((state) => state.isDemoMode);

// Compatibility layer for existing code
export function useAuth() {
  const store = useAuthStore();
  
  return {
    user: store.user,
    session: store.session,
    users: store.users,
    isLoggedIn: store.isAuthenticated,
    isAdmin: store.user?.role === 'admin',
    isAgent: store.user?.role === 'agent',
    loading: store.isLoading,
    error: store.error,
    loginWithGoogle: (demoAccount?: any) => {
      // Find demo account by email
      const demoUser = store.users.find(
        (u) => u.email === demoAccount?.email || u.id === demoAccount?.id,
      );
      
      if (demoUser) {
        const session: Session = {
          token: `demo-token-${demoUser.id}-${Date.now()}`,
          userId: demoUser.id,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          remember: false,
        };
        
        store.login(demoUser, session);
        return Promise.resolve(demoUser);
      }
      
      return Promise.reject(new Error('Demo account not found'));
    },
    loginWithEmail: (email: string, password: string, remember?: boolean) => {
      // In demo mode, accept known passwords
      const demoPasswords: Record<string, string> = {
        'admin@keja.ai': 'admin123',
        'agent@keja.ai': 'agent123',
        'investor@keja.ai': 'investor123',
      };
      
      const user = store.users.find((u) => u.email === email);
      
      if (user && demoPasswords[email] === password) {
        const session: Session = {
          token: `demo-token-${user.id}-${Date.now()}`,
          userId: user.id,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000),
          ).toISOString(),
          remember: !!remember,
        };
        
        store.login(user, session);
        return Promise.resolve(user);
      }
      
      store.setError('Invalid email or password');
      return Promise.reject(new Error('Invalid credentials'));
    },
    register: (data: any) => {
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: 'user',
        provider: 'email',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        loginCount: 0,
        phone: data.phone,
      };
      
      store.register(newUser);
      store.login(newUser, {
        token: `demo-token-${newUser.id}-${Date.now()}`,
        userId: newUser.id,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        remember: false,
      });
      
      return Promise.resolve(newUser);
    },
    logout: (reason?: string) => {
      store.logout(reason);
    },
    updateUser: store.updateUser,
    requireAuth: store.requireAuth,
    pendingIntent: store.pendingIntent,
    clearIntent: store.clearPendingIntent,
    authModalOpen: store.authModalOpen,
    setAuthModalOpen: store.setAuthModalOpen,
  };
}

// Demo accounts for compatibility
export const DEMO_GOOGLE_ACCOUNTS = demoGoogleAccounts;
