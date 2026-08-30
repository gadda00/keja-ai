/**
 * API Services
 * 
 * Service layer that provides business logic on top of API endpoints.
 * Each service encapsulates a specific domain and provides methods for
 * common operations.
 */

import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { ApiResponse, ApiError } from './client';

// ============================================================================
// Authentication Service
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    token: string;
    refreshToken: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      endpoints.auth.login,
      credentials,
    );
    return response.data;
  },

  async loginWithGoogle(token: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(endpoints.auth.google, {
      token,
    });
    return response.data;
  },

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      endpoints.auth.register,
      data,
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post(endpoints.auth.logout);
  },

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await apiClient.post<{ token: string }>(
      endpoints.auth.refresh,
      { refreshToken },
    );
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(endpoints.auth.forgotPassword, { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post(endpoints.auth.resetPassword, { token, password });
  },

  async getCurrentUser(): Promise<any> {
    const response = await apiClient.get(endpoints.auth.me);
    return response.data;
  },
};

// ============================================================================
// Property Service
// ============================================================================

export interface PropertyFilter {
  area?: string[];
  type?: string[];
  purpose?: string[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  amenities?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Property {
  id: string;
  title: string;
  type: string;
  purpose: string[];
  area: string;
  county: string;
  price: number;
  rentEstimate?: number;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm: number;
  amenities: string[];
  images: string[];
  description: string;
  agency: string;
  agent: {
    name: string;
    phone: string;
  };
  trustScore: number;
  verification: any;
  trustSignals: any[];
  availability: string;
  listedAt: string;
  views: number;
  highlights: string[];
}

export const propertyService = {
  async getAll(filters?: PropertyFilter): Promise<{ properties: Property[]; total: number }> {
    const response = await apiClient.get<{ properties: Property[]; total: number }>(
      endpoints.properties.list,
      { params: filters },
    );
    return response.data;
  },

  async getById(id: string): Promise<Property> {
    const response = await apiClient.get<Property>(endpoints.properties.get(id));
    return response.data;
  },

  async search(query: string, filters?: PropertyFilter): Promise<{ properties: Property[]; total: number }> {
    const response = await apiClient.get<{ properties: Property[]; total: number }>(
      endpoints.properties.search,
      { params: { q: query, ...filters } },
    );
    return response.data;
  },

  async getFeatured(): Promise<Property[]> {
    const response = await apiClient.get<Property[]>(endpoints.properties.featured);
    return response.data;
  },

  async getTrending(): Promise<Property[]> {
    const response = await apiClient.get<Property[]>(endpoints.properties.trending);
    return response.data;
  },

  async getNearby(lat: number, lng: number, radius: number = 10): Promise<Property[]> {
    const response = await apiClient.get<Property[]>(
      endpoints.properties.nearby(lat, lng, radius),
    );
    return response.data;
  },

  async incrementViews(id: string): Promise<void> {
    await apiClient.post(endpoints.properties.views(id));
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const response = await apiClient.post<{ isFavorite: boolean }>(
      endpoints.properties.toggleFavorite(id),
    );
    return response.data.isFavorite;
  },

  async getFavorites(): Promise<Property[]> {
    const response = await apiClient.get<Property[]>(endpoints.properties.favorites);
    return response.data;
  },

  async getRecommendations(): Promise<Property[]> {
    const response = await apiClient.get<Property[]>(endpoints.properties.recommendations);
    return response.data;
  },
};

// ============================================================================
// Investment Service
// ============================================================================

export interface InvestmentInput {
  price: number;
  furnishingCost: number;
  monthlyRent: number;
  occupancyPct: number;
  monthlyExpenses: number;
  appreciationPct: number;
  rentGrowthPct: number;
}

export interface InvestmentResult {
  totalInvestment: number;
  annualGrossIncome: number;
  vacancyAllowance: number;
  annualExpenses: number;
  annualNetIncome: number;
  grossYield: number;
  netYield: number;
  paybackYears: number;
  year5: any[];
  year10: any[];
  monthlyCashflow: number;
}

export interface MortgageInput {
  propertyPrice: number;
  depositPct: number;
  annualRatePct: number;
  termYears: number;
  extraMonthly?: number;
}

export interface MortgageResult {
  deposit: number;
  principal: number;
  monthlyRepayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: any[];
  extra?: {
    monthsSaved: number;
    interestSaved: number;
    payoffMonths: number;
  };
}

export const investmentService = {
  async analyzeInvestment(input: InvestmentInput): Promise<InvestmentResult> {
    const response = await apiClient.post<InvestmentResult>(
      endpoints.investments.calculator,
      input,
    );
    return response.data;
  },

  async calculateMortgage(input: MortgageInput): Promise<MortgageResult> {
    const response = await apiClient.post<MortgageResult>(
      endpoints.investments.calculator,
      input,
    );
    return response.data;
  },

  async calculateROI(propertyId: string): Promise<any> {
    const response = await apiClient.get(endpoints.investments.roi(propertyId));
    return response.data;
  },

  async getProjections(propertyId: string, years: number = 5): Promise<any> {
    const response = await apiClient.get(
      endpoints.investments.projections(propertyId, years),
    );
    return response.data;
  },
};

// ============================================================================
// Tokenization Service
// ============================================================================

export interface Token {
  id: string;
  propertyId: string;
  tokenNumber: number;
  totalTokens: number;
  pricePerToken: number;
  status: string;
  ownerId: string | null;
}

export interface Investment {
  id: string;
  userId: string;
  propertyId: string;
  tokenIds: string[];
  amountInvested: number;
  tokensPurchased: number;
  status: string;
  createdAt: string;
}

export const tokenizeService = {
  async getTokenizedProperties(): Promise<any[]> {
    const response = await apiClient.get<any[]>(endpoints.tokenize.properties);
    return response.data;
  },

  async getPropertyTokens(propertyId: string): Promise<Token[]> {
    const response = await apiClient.get<Token[]>(endpoints.tokenize.tokens(propertyId));
    return response.data;
  },

  async purchaseTokens(userId: string, tokenIds: string[]): Promise<Investment> {
    const response = await apiClient.post<Investment>(endpoints.tokenize.purchase, {
      userId,
      tokenIds,
    });
    return response.data;
  },

  async sellTokens(userId: string, tokenIds: string[]): Promise<any> {
    const response = await apiClient.post(endpoints.tokenize.sell, {
      userId,
      tokenIds,
    });
    return response.data;
  },

  async getPortfolio(userId: string): Promise<any> {
    const response = await apiClient.get(
      `${endpoints.tokenize.portfolio}?userId=${userId}`,
    );
    return response.data;
  },

  async getTransactions(userId: string): Promise<any[]> {
    const response = await apiClient.get(
      `${endpoints.tokenize.transactions}?userId=${userId}`,
    );
    return response.data;
  },

  async getDistributions(propertyId: string): Promise<any[]> {
    const response = await apiClient.get(
      `${endpoints.tokenize.distributions}?propertyId=${propertyId}`,
    );
    return response.data;
  },

  async submitKYC(data: any): Promise<any> {
    const response = await apiClient.post(endpoints.tokenize.submitKyc, data);
    return response.data;
  },

  async createOrder(
    userId: string,
    tokenId: string,
    propertyId: string,
    type: 'buy' | 'sell',
    price: number,
    quantity: number,
  ): Promise<any> {
    const response = await apiClient.post(endpoints.tokenize.createOrder, {
      userId,
      tokenId,
      propertyId,
      type,
      price,
      quantity,
    });
    return response.data;
  },

  async cancelOrder(orderId: string): Promise<void> {
    await apiClient.post(endpoints.tokenize.cancelOrder(orderId));
  },
};

// ============================================================================
// AI Service
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  propertyIds?: string[];
  quickReplies?: string[];
  action?: string;
  meta?: any[];
}

export const aiService = {
  async sendMessage(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>(endpoints.ai.chat, {
      message,
      history,
    });
    return response.data;
  },

  async getSuggestions(query: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(endpoints.ai.suggestions, {
      params: { q: query },
    });
    return response.data;
  },

  async analyzeProperty(propertyId: string): Promise<any> {
    const response = await apiClient.post(endpoints.ai.analyze, { propertyId });
    return response.data;
  },

  async verifyListing(listingId: string): Promise<any> {
    const response = await apiClient.post(endpoints.ai.verify, { listingId });
    return response.data;
  },

  async getRecommendations(userId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(
      `${endpoints.ai.recommendations}?userId=${userId}`,
    );
    return response.data;
  },

  async startQualification(): Promise<any> {
    const response = await apiClient.post(endpoints.ai.qualification);
    return response.data;
  },
};

// ============================================================================
// Trust Service
// ============================================================================

export const trustService = {
  async verifyTitle(propertyId: string): Promise<any> {
    const response = await apiClient.get(endpoints.trust.titleCheck(propertyId));
    return response.data;
  },

  async checkArdhisasa(propertyId: string): Promise<any> {
    const response = await apiClient.get(endpoints.trust.ardhisasa(propertyId));
    return response.data;
  },

  async checkDuplicates(): Promise<any> {
    const response = await apiClient.post(endpoints.trust.duplicateCheck);
    return response.data;
  },

  async detectAnomalies(propertyId: string): Promise<any> {
    const response = await apiClient.post(endpoints.trust.anomalyDetection, {
      propertyId,
    });
    return response.data;
  },

  async getTrustScore(propertyId: string): Promise<number> {
    const response = await apiClient.get<{ score: number }>(
      endpoints.trust.score(propertyId),
    );
    return response.data.score;
  },
};

// ============================================================================
// User Service
// ============================================================================

export const userService = {
  async getAll(): Promise<any[]> {
    const response = await apiClient.get<any[]>(endpoints.users.list);
    return response.data;
  },

  async getById(id: string): Promise<any> {
    const response = await apiClient.get(endpoints.users.get(id));
    return response.data;
  },

  async updateProfile(data: any): Promise<any> {
    const response = await apiClient.put(endpoints.users.updateProfile, data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put(endpoints.users.changePassword, {
      currentPassword,
      newPassword,
    });
  },

  async uploadAvatar(file: File): Promise<string> {
    const response = await apiClient.upload<string>(
      endpoints.users.uploadAvatar,
      file,
      'avatar',
    );
    return response.data;
  },
};

// ============================================================================
// Notification Service
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const response = await apiClient.get<Notification[]>(endpoints.notifications.list);
    return response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.post(endpoints.notifications.markRead(id));
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post(endpoints.notifications.markAllRead);
  },

  async getPreferences(): Promise<any> {
    const response = await apiClient.get(endpoints.notifications.preferences);
    return response.data;
  },

  async updatePreferences(preferences: any): Promise<void> {
    await apiClient.put(endpoints.notifications.preferences, preferences);
  },
};

// ============================================================================
// Admin Service
// ============================================================================

export const adminService = {
  async getStatistics(): Promise<any> {
    const response = await apiClient.get(endpoints.admin.statistics);
    return response.data;
  },

  async getUsers(): Promise<any[]> {
    const response = await apiClient.get<any[]>(endpoints.admin.users);
    return response.data;
  },

  async getListings(): Promise<any[]> {
    const response = await apiClient.get<any[]>(endpoints.admin.listings);
    return response.data;
  },

  async verifyListing(id: string): Promise<void> {
    await apiClient.post(endpoints.admin.verifyListing(id));
  },

  async rejectListing(id: string, reason: string): Promise<void> {
    await apiClient.post(endpoints.admin.rejectListing(id), { reason });
  },

  async getAuditLog(): Promise<any[]> {
    const response = await apiClient.get<any[]>(endpoints.admin.audit);
    return response.data;
  },

  async runAutopilot(count?: number): Promise<any> {
    const response = await apiClient.post(endpoints.admin.runAutopilot, {
      count,
    });
    return response.data;
  },
};

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Handle API errors and convert to user-friendly messages
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    if ('status' in (error as ApiError)) {
      const apiError = error as ApiError;
      
      switch (apiError.status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Unauthorized. Please login.';
        case 403:
          return 'Forbidden. You do not have permission.';
        case 404:
          return 'Resource not found.';
        case 422:
          return 'Validation error. Please check your input.';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
        case 502:
        case 503:
          return 'Server error. Please try again later.';
        default:
          return apiError.message || 'An error occurred.';
      }
    }
    
    return error.message;
  }
  
  return 'An unknown error occurred.';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ('isNetworkError' in (error as ApiError) ? (error as ApiError).isNetworkError : false)
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ('isTimeout' in (error as ApiError) ? (error as ApiError).isTimeout : false)
  );
}

// Export all services
export {
  authService,
  propertyService,
  investmentService,
  tokenizeService,
  aiService,
  trustService,
  userService,
  notificationService,
  adminService,
};
