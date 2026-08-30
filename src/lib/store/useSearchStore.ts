/**
 * Search Store
 * 
 * Manages search queries, filters, saved searches, and search results.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { localStorageAdapter } from './useStore';

interface SearchFilter {
  type: string;
  label: string;
  value: string | number | boolean;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'range';
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter[];
  createdAt: string;
  updatedAt: string;
  notificationEnabled: boolean;
  notificationFrequency: 'daily' | 'weekly' | 'realtime';
}

interface SearchResult {
  id: string;
  score: number;
  matches: Record<string, string[]>;
  timestamp: string;
}

interface SearchState {
  // Current search
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  
  // Filters
  activeFilters: SearchFilter[];
  availableFilters: SearchFilter[];
  
  // Saved searches
  savedSearches: SavedSearch[];
  
  // Recent searches
  recentSearches: string[];
  
  // Suggestions
  suggestions: string[];
  
  // Pagination
  currentPage: number;
  totalResults: number;
  resultsPerPage: number;
}

interface SearchActions {
  // Search actions
  setQuery: (query: string) => void;
  performSearch: (query: string, filters?: SearchFilter[]) => Promise<void>;
  clearSearch: () => void;
  
  // Filter actions
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (filterId: string) => void;
  updateFilter: (filterId: string, updates: Partial<SearchFilter>) => void;
  clearFilters: () => void;
  setAvailableFilters: (filters: SearchFilter[]) => void;
  
  // Saved search actions
  saveSearch: (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>) => SavedSearch;
  updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => void;
  deleteSavedSearch: (id: string) => void;
  enableSearchNotifications: (id: string, frequency: SavedSearch['notificationFrequency']) => void;
  disableSearchNotifications: (id: string) => void;
  
  // Recent searches
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Suggestions
  setSuggestions: (suggestions: string[]) => void;
  clearSuggestions: () => void;
  
  // Pagination
  setCurrentPage: (page: number) => void;
  setResultsPerPage: (perPage: number) => void;
  
  // Results
  addResult: (result: SearchResult) => void;
  removeResult: (resultId: string) => void;
  clearResults: () => void;
  
  // Utility
  getSearchById: (id: string) => SavedSearch | undefined;
  getSearchesWithNotifications: () => SavedSearch[];
}

const initialState: SearchState = {
  query: '',
  results: [],
  isSearching: false,
  searchError: null,
  activeFilters: [],
  availableFilters: [],
  savedSearches: [],
  recentSearches: [],
  suggestions: [],
  currentPage: 1,
  totalResults: 0,
  resultsPerPage: 10,
};

// Default available filters for properties
const defaultPropertyFilters: SearchFilter[] = [
  { type: 'area', label: 'Area', value: '', operator: 'contains' },
  { type: 'type', label: 'Property Type', value: '', operator: 'equals' },
  { type: 'price', label: 'Price Range', value: 0, operator: 'range' },
  { type: 'bedrooms', label: 'Bedrooms', value: 0, operator: 'greaterThan' },
  { type: 'trustScore', label: 'Trust Score', value: 0, operator: 'greaterThan' },
  { type: 'purpose', label: 'Purpose', value: '', operator: 'equals' },
  { type: 'availability', label: 'Availability', value: '', operator: 'equals' },
];

export const useSearchStore = create<SearchState & SearchActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        availableFilters: defaultPropertyFilters,
        
        setQuery: (query) => {
          set({ query });
          if (query.length > 2) {
            get().addRecentSearch(query);
          }
        },
        
        performSearch: async (query, filters = []) => {
          set({ isSearching: true, searchError: null, query });
          
          try {
            // Simulate search delay
            await new Promise((resolve) => setTimeout(resolve, 300));
            
            // In a real implementation, this would call the search API
            // For now, we'll generate mock results
            const mockResults: SearchResult[] = [];
            const totalResults = Math.floor(Math.random() * 50) + 10;
            
            for (let i = 0; i < Math.min(totalResults, 20); i++) {
              mockResults.push({
                id: `result-${Date.now()}-${i}`,
                score: 1 - i * 0.05,
                matches: {
                  title: [`Property ${i + 1}`],
                  description: [`Sample description for property ${i + 1}`],
                },
                timestamp: new Date().toISOString(),
              });
            }
            
            set({
              results: mockResults,
              totalResults,
              activeFilters: filters,
              currentPage: 1,
              isSearching: false,
            });
            
            // Generate suggestions based on query
            const suggestions = get().generateSuggestions(query);
            set({ suggestions });
            
          } catch (error) {
            set({
              searchError: error instanceof Error ? error.message : 'Search failed',
              isSearching: false,
            });
          }
        },
        
        clearSearch: () => {
          set({
            query: '',
            results: [],
            isSearching: false,
            searchError: null,
            currentPage: 1,
            totalResults: 0,
          });
        },
        
        addFilter: (filter) => {
          set((state) => {
            // Check if filter already exists
            const existingIndex = state.activeFilters.findIndex(
              (f) => f.type === filter.type,
            );
            
            if (existingIndex >= 0) {
              // Update existing filter
              const newFilters = [...state.activeFilters];
              newFilters[existingIndex] = filter;
              return { activeFilters: newFilters };
            }
            
            // Add new filter
            return { activeFilters: [...state.activeFilters, filter] };
          });
        },
        
        removeFilter: (filterId) => {
          set((state) => ({
            activeFilters: state.activeFilters.filter(
              (_, index) => index !== Number(filterId),
            ),
          }));
        },
        
        updateFilter: (filterId, updates) => {
          set((state) => ({
            activeFilters: state.activeFilters.map((filter, index) =>
              index === Number(filterId) ? { ...filter, ...updates } : filter,
            ),
          }));
        },
        
        clearFilters: () => set({ activeFilters: [] }),
        
        setAvailableFilters: (filters) => set({ availableFilters: filters }),
        
        saveSearch: (searchData) => {
          const newSearch: SavedSearch = {
            ...searchData,
            id: `search-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notificationEnabled: searchData.notificationEnabled ?? false,
            notificationFrequency: searchData.notificationFrequency ?? 'realtime',
          };
          
          set((state) => ({
            savedSearches: [...state.savedSearches, newSearch],
          }));
          
          return newSearch;
        },
        
        updateSavedSearch: (id, updates) => {
          set((state) => ({
            savedSearches: state.savedSearches.map((search) =>
              search.id === id
                ? { ...search, ...updates, updatedAt: new Date().toISOString() }
                : search,
            ),
          }));
        },
        
        deleteSavedSearch: (id) => {
          set((state) => ({
            savedSearches: state.savedSearches.filter(
              (search) => search.id !== id,
            ),
          }));
        },
        
        enableSearchNotifications: (id, frequency) => {
          get().updateSavedSearch(id, {
            notificationEnabled: true,
            notificationFrequency: frequency,
          });
        },
        
        disableSearchNotifications: (id) => {
          get().updateSavedSearch(id, {
            notificationEnabled: false,
          });
        },
        
        addRecentSearch: (query) => {
          set((state) => {
            // Remove if already exists
            const newRecent = state.recentSearches.filter(
              (q) => q !== query,
            );
            // Add to beginning and limit to 10
            return {
              recentSearches: [query, ...newRecent].slice(0, 10),
            };
          });
        },
        
        removeRecentSearch: (query) => {
          set((state) => ({
            recentSearches: state.recentSearches.filter(
              (q) => q !== query,
            ),
          }));
        },
        
        clearRecentSearches: () => set({ recentSearches: [] }),
        
        setSuggestions: (suggestions) => set({ suggestions }),
        
        clearSuggestions: () => set({ suggestions: [] }),
        
        setCurrentPage: (page) => {
          set({ currentPage: Math.max(1, page) });
        },
        
        setResultsPerPage: (perPage) => {
          set({ resultsPerPage: perPage, currentPage: 1 });
        },
        
        addResult: (result) => {
          set((state) => ({
            results: [...state.results, result],
            totalResults: state.totalResults + 1,
          }));
        },
        
        removeResult: (resultId) => {
          set((state) => ({
            results: state.results.filter((r) => r.id !== resultId),
            totalResults: state.totalResults - 1,
          }));
        },
        
        clearResults: () => {
          set({ results: [], totalResults: 0, currentPage: 1 });
        },
        
        getSearchById: (id) => {
          return get().savedSearches.find((s) => s.id === id);
        },
        
        getSearchesWithNotifications: () => {
          return get().savedSearches.filter(
            (s) => s.notificationEnabled,
          );
        },
        
        // Helper method to generate suggestions
        generateSuggestions: (query: string) => {
          const commonQueries = [
            'Kilimani apartments',
            'Westlands offices',
            'Karen villas',
            'investment properties',
            'luxury homes',
            'commercial spaces',
            'land for sale',
            'rental properties',
          ];
          
          return commonQueries
            .filter((q) => 
              q.toLowerCase().includes(query.toLowerCase()) &&
              q !== query
            )
            .slice(0, 5);
        },
      }),
      {
        name: 'SearchStore',
        storage: localStorageAdapter,
        partialize: (state) => ({
          // Persist user-specific data
          savedSearches: state.savedSearches,
          recentSearches: state.recentSearches,
          resultsPerPage: state.resultsPerPage,
        }),
      },
    ),
    { name: 'SearchStore' },
  ),
);

// Selectors for better performance
export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchResults = () => useSearchStore((state) => state.results);
export const useIsSearching = () => useSearchStore((state) => state.isSearching);
export const useSearchError = () => useSearchStore((state) => state.searchError);
export const useActiveFilters = () => useSearchStore((state) => state.activeFilters);
export const useSavedSearches = () => useSearchStore((state) => state.savedSearches);
export const useRecentSearches = () => useSearchStore((state) => state.recentSearches);
export const useSuggestions = () => useSearchStore((state) => state.suggestions);
export const usePagination = () => useSearchStore((state) => ({
  currentPage: state.currentPage,
  totalResults: state.totalResults,
  resultsPerPage: state.resultsPerPage,
}));
