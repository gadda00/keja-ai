/**
 * API Layer Index
 * 
 * Central export point for all API-related functionality.
 */

export * from './client';
export * from './endpoints';
export * from './services';

// Re-export commonly used items for convenience
export { apiClient } from './client';
export { endpoints } from './endpoints';
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
  handleApiError,
  isNetworkError,
  isTimeoutError,
} from './services';
