/**
 * API Endpoints Configuration
 * 
 * Central configuration for all API endpoints used in the application.
 */

// Base API configuration
interface ApiConfig {
  baseURL: string;
  version: string;
  timeout: number;
  maxRetries: number;
}

// Environment-specific configurations
const configurations: Record<string, ApiConfig> = {
  development: {
    baseURL: 'http://localhost:3001/api',
    version: 'v1',
    timeout: 30000,
    maxRetries: 3,
  },
  staging: {
    baseURL: 'https://staging-api.keja.ai/api',
    version: 'v1',
    timeout: 30000,
    maxRetries: 2,
  },
  production: {
    baseURL: 'https://api.keja.ai/api',
    version: 'v1',
    timeout: 15000,
    maxRetries: 1,
  },
};

// Get current environment
function getEnvironment(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    if (hostname.includes('staging')) {
      return 'staging';
    }
  }
  
  return process.env.NODE_ENV || 'development';
}

// Get current configuration
function getConfig(): ApiConfig {
  const env = getEnvironment();
  return configurations[env] || configurations.development;
}

// Build endpoint URL
export function buildEndpoint(endpoint: string): string {
  const config = getConfig();
  return `${config.baseURL}/${config.version}${endpoint}`;
}

// API Endpoint definitions
class Endpoints {
  // Authentication
  auth = {
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    google: '/auth/google',
    me: '/auth/me',
  };

  // Users
  users = {
    list: '/users',
    get: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
    profile: '/users/me',
    updateProfile: '/users/me',
    changePassword: '/users/me/password',
    uploadAvatar: '/users/me/avatar',
  };

  // Properties
  properties = {
    list: '/properties',
    get: (id: string) => `/properties/${id}`,
    create: '/properties',
    update: (id: string) => `/properties/${id}`,
    delete: (id: string) => `/properties/${id}`,
    search: '/properties/search',
    featured: '/properties/featured',
    trending: '/properties/trending',
    nearby: (lat: number, lng: number, radius: number = 10) =>
      `/properties/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    views: (id: string) => `/properties/${id}/views`,
    favorites: '/properties/favorites',
    toggleFavorite: (id: string) => `/properties/${id}/favorite`,
    recommendations: '/properties/recommendations',
  };

  // Investments
  investments = {
    list: '/investments',
    get: (id: string) => `/investments/${id}`,
    create: '/investments',
    update: (id: string) => `/investments/${id}`,
    delete: (id: string) => `/investments/${id}`,
    calculator: '/investments/calculator',
    roi: (propertyId: string) => `/investments/${propertyId}/roi`,
    projections: (propertyId: string, years: number = 5) =>
      `/investments/${propertyId}/projections?years=${years}`,
  };

  // Tokenization
  tokenize = {
    properties: '/tokenize/properties',
    getProperty: (propertyId: string) => `/tokenize/properties/${propertyId}`,
    tokens: (propertyId: string) => `/tokenize/properties/${propertyId}/tokens`,
    purchase: '/tokenize/purchases',
    sell: '/tokenize/sales',
    portfolio: '/tokenize/portfolio',
    transactions: '/tokenize/transactions',
    distributions: '/tokenize/distributions',
    kyc: '/tokenize/kyc',
    submitKyc: '/tokenize/kyc/submit',
    verifyKyc: '/tokenize/kyc/verify',
    orders: '/tokenize/orders',
    createOrder: '/tokenize/orders',
    cancelOrder: (orderId: string) => `/tokenize/orders/${orderId}/cancel`,
    fillOrder: (orderId: string) => `/tokenize/orders/${orderId}/fill`,
  };

  // AI / Chat
  ai = {
    chat: '/ai/chat',
    complete: '/ai/complete',
    suggestions: '/ai/suggestions',
    analyze: '/ai/analyze',
    verify: '/ai/verify',
    recommendations: '/ai/recommendations',
    qualification: '/ai/qualification',
  };

  // Trust & Verification
  trust = {
    verify: '/trust/verify',
    titleCheck: (propertyId: string) => `/trust/${propertyId}/title`,
    ardhisasa: (propertyId: string) => `/trust/${propertyId}/ardhisasa`,
    duplicateCheck: '/trust/duplicate-check',
    anomalyDetection: '/trust/anomalies',
    score: (propertyId: string) => `/trust/${propertyId}/score`,
  };

  // Admin
  admin = {
    users: '/admin/users',
    properties: '/admin/properties',
    listings: '/admin/listings',
    verifyListing: (id: string) => `/admin/listings/${id}/verify`,
    rejectListing: (id: string) => `/admin/listings/${id}/reject`,
    statistics: '/admin/statistics',
    audit: '/admin/audit',
    settings: '/admin/settings',
    partners: '/admin/partners',
    feeds: '/admin/feeds',
    autopilot: '/admin/autopilot',
    runAutopilot: '/admin/autopilot/run',
  };

  // Notifications
  notifications = {
    list: '/notifications',
    get: (id: string) => `/notifications/${id}`,
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    preferences: '/notifications/preferences',
    subscribe: '/notifications/subscribe',
    unsubscribe: (topic: string) => `/notifications/unsubscribe/${topic}`,
  };

  // Leads
  leads = {
    list: '/leads',
    get: (id: string) => `/leads/${id}`,
    create: '/leads',
    update: (id: string) => `/leads/${id}`,
    delete: (id: string) => `/leads/${id}`,
    convert: (id: string) => `/leads/${id}/convert`,
    qualify: '/leads/qualify',
    assign: (id: string, agentId: string) => `/leads/${id}/assign/${agentId}`,
  };

  // Analytics
  analytics = {
    track: '/analytics/track',
    pageview: '/analytics/pageview',
    event: '/analytics/event',
    user: (userId: string) => `/analytics/users/${userId}`,
    property: (propertyId: string) => `/analytics/properties/${propertyId}`,
    dashboard: '/analytics/dashboard',
  };

  // Files
  files = {
    upload: '/files/upload',
    get: (id: string) => `/files/${id}`,
    delete: (id: string) => `/files/${id}`,
    signedUrl: (path: string) => `/files/signed-url?path=${encodeURIComponent(path)}`,
  };

  // Geocoding
  geocoding = {
    search: '/geocoding/search',
    reverse: (lat: number, lng: number) => `/geocoding/reverse?lat=${lat}&lng=${lng}`,
    areas: '/geocoding/areas',
    counties: '/geocoding/counties',
  };

  // Health check
  health = {
    check: '/health',
    ping: '/ping',
  };
}

// Singleton instance
export const endpoints = new Endpoints();

// Export endpoint builder
export { buildEndpoint, getConfig };

// Export types
export type { ApiConfig };
