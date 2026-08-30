/**
 * UI State Store
 * 
 * Manages global UI state like modals, loading states, notifications, etc.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Modal states
  isAuthModalOpen: boolean;
  isSearchModalOpen: boolean;
  isFilterModalOpen: boolean;
  isCompareModalOpen: boolean;
  isNotificationCenterOpen: boolean;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;
  
  // Notifications
  notifications: Notification[];
  
  // Theme
  theme: 'light' | 'dark';
  
  // Sidebar state (for admin dashboard)
  isSidebarCollapsed: boolean;
  
  // Mobile menu state
  isMobileMenuOpen: boolean;
}

interface UIActions {
  // Modal actions
  openAuthModal: () => void;
  closeAuthModal: () => void;
  toggleAuthModal: () => void;
  
  openSearchModal: () => void;
  closeSearchModal: () => void;
  
  openFilterModal: () => void;
  closeFilterModal: () => void;
  
  openCompareModal: () => void;
  closeCompareModal: () => void;
  
  toggleNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  
  // Loading actions
  setLoading: (isLoading: boolean, message?: string | null) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Theme actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Mobile menu actions
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

type Notification = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  createdAt: number;
};

const initialState: UIState = {
  isAuthModalOpen: false,
  isSearchModalOpen: false,
  isFilterModalOpen: false,
  isCompareModalOpen: false,
  isNotificationCenterOpen: false,
  isLoading: false,
  loadingMessage: null,
  notifications: [],
  theme: 'light',
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,
};

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Modal actions
      openAuthModal: () => set({ isAuthModalOpen: true }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
      toggleAuthModal: () => set((state) => ({ isAuthModalOpen: !state.isAuthModalOpen })),
      
      openSearchModal: () => set({ isSearchModalOpen: true }),
      closeSearchModal: () => set({ isSearchModalOpen: false }),
      
      openFilterModal: () => set({ isFilterModalOpen: true }),
      closeFilterModal: () => set({ isFilterModalOpen: false }),
      
      openCompareModal: () => set({ isCompareModalOpen: true }),
      closeCompareModal: () => set({ isCompareModalOpen: false }),
      
      toggleNotificationCenter: () => 
        set((state) => ({ isNotificationCenterOpen: !state.isNotificationCenterOpen })),
      closeNotificationCenter: () => set({ isNotificationCenterOpen: false }),
      
      // Loading actions
      setLoading: (isLoading, message = null) => set({ isLoading, loadingMessage: message }),
      
      // Notification actions
      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification: Notification = {
          ...notification,
          id,
          createdAt: Date.now(),
          duration: notification.duration || 5000,
        };
        
        set((state) => ({ notifications: [...state.notifications, newNotification] }));
        
        // Auto-remove after duration
        if (newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
        
        return id;
      },
      
      removeNotification: (id) => 
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      // Theme actions
      setTheme: (theme) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        return set({ theme });
      },
      
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
        return set({ theme: newTheme });
      },
      
      // Sidebar actions
      toggleSidebar: () => 
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      
      // Mobile menu actions
      toggleMobileMenu: () => 
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
    }),
    { name: 'UIStore' },
  ),
);

// Selectors for better performance
export const useIsAuthModalOpen = () => useUIStore((state) => state.isAuthModalOpen);
export const useIsLoading = () => useUIStore((state) => state.isLoading);
export const useLoadingMessage = () => useUIStore((state) => state.loadingMessage);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useTheme = () => useUIStore((state) => state.theme);
export const useIsSidebarCollapsed = () => useUIStore((state) => state.isSidebarCollapsed);
export const useIsMobileMenuOpen = () => useUIStore((state) => state.isMobileMenuOpen);
