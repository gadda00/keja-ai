/**
 * Property Store
 * 
 * Manages property listings, filtering, sorting, and user interactions.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { localStorageAdapter } from './useStore';
import type { Property } from '@/data/properties';

interface PropertyState {
  // All properties
  properties: Property[];
  
  // Filtered properties
  filteredProperties: Property[];
  
  // Current filters
  filters: PropertyFilters;
  
  // Sorting
  sortBy: SortOption;
  sortDirection: 'asc' | 'desc';
  
  // Selected property
  selectedProperty: Property | null;
  
  // Favorites
  favorites: string[];
  
  // Recently viewed
  recentlyViewed: string[];
  
  // Compare list
  compareList: string[];
  
  // Search state
  searchQuery: string;
  isSearching: boolean;
  
  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

interface PropertyActions {
  // Property actions
  setProperties: (properties: Property[]) => void;
  addProperty: (property: Property) => void;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  removeProperty: (id: string) => void;
  
  // Filter actions
  setFilters: (filters: Partial<PropertyFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  
  // Sort actions
  setSort: (sortBy: SortOption, direction?: 'asc' | 'desc') => void;
  
  // Selection actions
  selectProperty: (property: Property | null) => void;
  
  // Favorite actions
  toggleFavorite: (propertyId: string) => void;
  addFavorite: (propertyId: string) => void;
  removeFavorite: (propertyId: string) => void;
  clearFavorites: () => void;
  
  // Recently viewed actions
  addToRecentlyViewed: (propertyId: string) => void;
  removeFromRecentlyViewed: (propertyId: string) => void;
  clearRecentlyViewed: () => void;
  
  // Compare actions
  toggleCompare: (propertyId: string) => void;
  addToCompare: (propertyId: string) => void;
  removeFromCompare: (propertyId: string) => void;
  clearCompare: () => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setIsSearching: (isSearching: boolean) => void;
  searchProperties: (query: string) => void;
  
  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  
  // Utility
  getPropertyById: (id: string) => Property | undefined;
  getFavoritedProperties: () => Property[];
  getComparedProperties: () => Property[];
}

// Filter types
export interface PropertyFilters {
  area?: string[];
  county?: string[];
  type?: string[];
  purpose?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minSize?: number;
  maxSize?: number;
  amenities?: string[];
  availability?: string[];
  trustScoreMin?: number;
  offPlan?: boolean;
  furnished?: boolean;
}

export type SortOption = 
  | 'price'
  | 'trustScore'
  | 'listedAt'
  | 'views'
  | 'sizeSqm'
  | 'bedrooms'
  | 'title';

const initialState: PropertyState = {
  properties: [],
  filteredProperties: [],
  filters: {},
  sortBy: 'listedAt',
  sortDirection: 'desc',
  selectedProperty: null,
  favorites: [],
  recentlyViewed: [],
  compareList: [],
  searchQuery: '',
  isSearching: false,
  currentPage: 1,
  itemsPerPage: 12,
  totalPages: 1,
};

// Filter function
function applyPropertyFilters(properties: Property[], filters: PropertyFilters): Property[] {
  return properties.filter((property) => {
    // Area filter
    if (filters.area?.length && !filters.area.includes(property.area) && !filters.area.includes(property.county)) {
      return false;
    }
    
    // County filter
    if (filters.county?.length && !filters.county.includes(property.county)) {
      return false;
    }
    
    // Type filter
    if (filters.type?.length && !filters.type.includes(property.type)) {
      return false;
    }
    
    // Purpose filter
    if (filters.purpose?.length && !filters.purpose.some((p) => property.purpose.includes(p as any))) {
      return false;
    }
    
    // Price range filter
    if (filters.minPrice !== undefined && property.price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && property.price > filters.maxPrice) {
      return false;
    }
    
    // Bedrooms filter
    if (filters.minBedrooms !== undefined && (property.bedrooms ?? 0) < filters.minBedrooms) {
      return false;
    }
    if (filters.maxBedrooms !== undefined && (property.bedrooms ?? 0) > filters.maxBedrooms) {
      return false;
    }
    
    // Size filter
    if (filters.minSize !== undefined && property.sizeSqm < filters.minSize) {
      return false;
    }
    if (filters.maxSize !== undefined && property.sizeSqm > filters.maxSize) {
      return false;
    }
    
    // Amenities filter
    if (filters.amenities?.length && !filters.amenities.some((a) => property.amenities.includes(a))) {
      return false;
    }
    
    // Availability filter
    if (filters.availability?.length && !filters.availability.includes(property.availability)) {
      return false;
    }
    
    // Trust score filter
    if (filters.trustScoreMin !== undefined && property.trustScore < filters.trustScoreMin) {
      return false;
    }
    
    // Off-plan filter
    if (filters.offPlan !== undefined && property.offPlan !== filters.offPlan) {
      return false;
    }
    
    // Furnished filter
    if (filters.furnished !== undefined && property.furnished !== filters.furnished) {
      return false;
    }
    
    return true;
  });
}

// Sort function
export function sortProperties(properties: Property[], sortBy: SortOption, direction: 'asc' | 'desc'): Property[] {
  const sorted = [...properties];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'trustScore':
        comparison = a.trustScore - b.trustScore;
        break;
      case 'listedAt':
        comparison = new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
        break;
      case 'views':
        comparison = b.views - a.views;
        break;
      case 'sizeSqm':
        comparison = a.sizeSqm - b.sizeSqm;
        break;
      case 'bedrooms':
        comparison = (a.bedrooms ?? 0) - (b.bedrooms ?? 0);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

export const usePropertyStore = create<PropertyState & PropertyActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setProperties: (properties) => {
          set({
            properties,
            filteredProperties: applyPropertyFilters(properties, get().filters),
            totalPages: Math.ceil(properties.length / get().itemsPerPage),
          });
        },
        
        addProperty: (property) => {
          set((state) => {
            const newProperties = [...state.properties, property];
            return {
              properties: newProperties,
              filteredProperties: applyPropertyFilters(newProperties, state.filters),
              totalPages: Math.ceil(newProperties.length / state.itemsPerPage),
            };
          });
        },
        
        updateProperty: (id, updates) => {
          set((state) => {
            const newProperties = state.properties.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            );
            return {
              properties: newProperties,
              filteredProperties: applyPropertyFilters(newProperties, state.filters),
              selectedProperty:
                state.selectedProperty?.id === id
                  ? { ...state.selectedProperty, ...updates }
                  : state.selectedProperty,
            };
          });
        },
        
        removeProperty: (id) => {
          set((state) => {
            const newProperties = state.properties.filter((p) => p.id !== id);
            return {
              properties: newProperties,
              filteredProperties: applyPropertyFilters(newProperties, state.filters),
              selectedProperty:
                state.selectedProperty?.id === id ? null : state.selectedProperty,
              favorites: state.favorites.filter((fid) => fid !== id),
              recentlyViewed: state.recentlyViewed.filter((rid) => rid !== id),
              compareList: state.compareList.filter((cid) => cid !== id),
              totalPages: Math.ceil(newProperties.length / state.itemsPerPage),
            };
          });
        },
        
        setFilters: (filters) => {
          set((state) => {
            const newFilters = { ...state.filters, ...filters };
            const newFiltered = applyPropertyFilters(state.properties, newFilters);
            return {
              filters: newFilters,
              filteredProperties: sortProperties(
                newFiltered,
                state.sortBy,
                state.sortDirection,
              ),
              currentPage: 1,
              totalPages: Math.ceil(newFiltered.length / state.itemsPerPage),
            };
          });
        },
        
        resetFilters: () => {
          set((state) => ({
            filters: {},
            filteredProperties: sortProperties(
              state.properties,
              state.sortBy,
              state.sortDirection,
            ),
            currentPage: 1,
            totalPages: Math.ceil(state.properties.length / state.itemsPerPage),
          }));
        },
        
        applyFilters: () => {
          const { properties, filters, sortBy, sortDirection } = get();
          const filtered = applyPropertyFilters(properties, filters);
          const sorted = sortProperties(filtered, sortBy, sortDirection);
          
          set({
            filteredProperties: sorted,
            currentPage: 1,
            totalPages: Math.ceil(sorted.length / get().itemsPerPage),
          });
        },
        
        setSort: (sortBy, direction = 'desc') => {
          set((state) => {
            const sorted = sortProperties(
              state.filteredProperties,
              sortBy,
              direction,
            );
            return {
              sortBy,
              sortDirection: direction,
              filteredProperties: sorted,
            };
          });
        },
        
        selectProperty: (property) => {
          set({ selectedProperty: property });
          if (property) {
            get().addToRecentlyViewed(property.id);
          }
        },
        
        toggleFavorite: (propertyId) => {
          const isFavorite = get().favorites.includes(propertyId);
          if (isFavorite) {
            get().removeFavorite(propertyId);
          } else {
            get().addFavorite(propertyId);
          }
        },
        
        addFavorite: (propertyId) => {
          set((state) => {
            const newFavorites = [...state.favorites, propertyId];
            return { favorites: newFavorites };
          });
        },
        
        removeFavorite: (propertyId) => {
          set((state) => ({
            favorites: state.favorites.filter((id) => id !== propertyId),
          }));
        },
        
        clearFavorites: () => set({ favorites: [] }),
        
        addToRecentlyViewed: (propertyId) => {
          set((state) => {
            // Remove if already exists
            const newRecentlyViewed = state.recentlyViewed.filter(
              (id) => id !== propertyId,
            );
            // Add to beginning and limit to 10
            return {
              recentlyViewed: [propertyId, ...newRecentlyViewed].slice(0, 10),
            };
          });
        },
        
        removeFromRecentlyViewed: (propertyId) => {
          set((state) => ({
            recentlyViewed: state.recentlyViewed.filter(
              (id) => id !== propertyId,
            ),
          }));
        },
        
        clearRecentlyViewed: () => set({ recentlyViewed: [] }),
        
        toggleCompare: (propertyId) => {
          const isInCompare = get().compareList.includes(propertyId);
          if (isInCompare) {
            get().removeFromCompare(propertyId);
          } else {
            get().addToCompare(propertyId);
          }
        },
        
        addToCompare: (propertyId) => {
          set((state) => {
            // Limit to 4 properties for comparison
            if (state.compareList.length >= 4) {
              return state;
            }
            const newCompareList = [...state.compareList, propertyId];
            return { compareList: newCompareList };
          });
        },
        
        removeFromCompare: (propertyId) => {
          set((state) => ({
            compareList: state.compareList.filter((id) => id !== propertyId),
          }));
        },
        
        clearCompare: () => set({ compareList: [] }),
        
        setSearchQuery: (query) => set({ searchQuery: query }),
        
        setIsSearching: (isSearching) => set({ isSearching }),
        
        searchProperties: (query) => {
          set({ searchQuery: query, isSearching: true });
          
          const { properties, filters, sortBy, sortDirection } = get();
          
          // Apply search query
          const searchResults = properties.filter((property) => {
            const searchLower = query.toLowerCase();
            return (
              property.title.toLowerCase().includes(searchLower) ||
              property.description.toLowerCase().includes(searchLower) ||
              property.area.toLowerCase().includes(searchLower) ||
              property.county.toLowerCase().includes(searchLower) ||
              property.type.toLowerCase().includes(searchLower) ||
              property.id.toLowerCase().includes(searchLower)
            );
          });
          
          // Apply filters to search results
          const filtered = applyPropertyFilters(searchResults, filters);
          const sorted = sortProperties(filtered, sortBy, sortDirection);
          
          set({
            filteredProperties: sorted,
            currentPage: 1,
            totalPages: Math.ceil(sorted.length / get().itemsPerPage),
            isSearching: false,
          });
        },
        
        setCurrentPage: (page) => {
          set({ currentPage: Math.max(1, Math.min(page, get().totalPages)) });
        },
        
        setItemsPerPage: (itemsPerPage) => {
          set((state) => ({
            itemsPerPage,
            totalPages: Math.ceil(state.filteredProperties.length / itemsPerPage),
            currentPage: 1,
          }));
        },
        
        getPropertyById: (id) => {
          return get().properties.find((p) => p.id === id);
        },
        
        getFavoritedProperties: () => {
          const { properties, favorites } = get();
          return properties.filter((p) => favorites.includes(p.id));
        },
        
        getComparedProperties: () => {
          const { properties, compareList } = get();
          return properties.filter((p) => compareList.includes(p.id));
        },
      }),
      {
        name: 'PropertyStore',
        storage: localStorageAdapter,
        partialize: (state) => ({
          // Only persist user-specific data
          favorites: state.favorites,
          recentlyViewed: state.recentlyViewed,
          compareList: state.compareList,
          filters: state.filters,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
          itemsPerPage: state.itemsPerPage,
        }),
      },
    ),
    { name: 'PropertyStore' },
  ),
);

// Selectors for better performance
export const useProperties = () => usePropertyStore((state) => state.properties);
export const useFilteredProperties = () => usePropertyStore((state) => state.filteredProperties);
export const useFilters = () => usePropertyStore((state) => state.filters);
export const useFavorites = () => usePropertyStore((state) => state.favorites);
export const useRecentlyViewed = () => usePropertyStore((state) => state.recentlyViewed);
export const useCompareList = () => usePropertyStore((state) => state.compareList);
export const useSelectedProperty = () => usePropertyStore((state) => state.selectedProperty);
export const useSearchQuery = () => usePropertyStore((state) => state.searchQuery);
export const useIsSearching = () => usePropertyStore((state) => state.isSearching);
export const usePagination = () => usePropertyStore((state) => ({
  currentPage: state.currentPage,
  itemsPerPage: state.itemsPerPage,
  totalPages: state.totalPages,
}));
