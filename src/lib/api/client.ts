/**
 * API Client
 * 
 * Central HTTP client for all API requests with interceptors,
 * error handling, and request/response transformations.
 */

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

interface ApiError extends Error {
  status: number;
  statusText: string;
  data?: unknown;
  isTimeout: boolean;
  isNetworkError: boolean;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private interceptors: {
    request: Array<(config: ApiRequestOptions) => ApiRequestOptions | Promise<ApiRequestOptions>>;
    response: Array<(response: Response) => Response | Promise<Response>>;
    error: Array<(error: ApiError) => ApiError | Promise<ApiError>>;
  };

  constructor(
    baseURL: string = '',
    defaultHeaders: Record<string, string> = {},
  ) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(
    interceptor: (config: ApiRequestOptions) => ApiRequestOptions | Promise<ApiRequestOptions>,
  ): void {
    this.interceptors.request.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>,
  ): void {
    this.interceptors.response.push(interceptor);
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(
    interceptor: (error: ApiError) => ApiError | Promise<ApiError>,
  ): void {
    this.interceptors.error.push(interceptor);
  }

  /**
   * Remove an interceptor
   */
  ejectInterceptor(
    type: 'request' | 'response' | 'error',
    interceptor: Function,
  ): void {
    this.interceptors[type] = this.interceptors[type].filter(
      (i) => i !== interceptor,
    );
  }

  /**
   * Clear all interceptors
   */
  clearInterceptors(): void {
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
  }

  /**
   * Set base URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string | null): void {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    let url = `${this.baseURL}${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Apply request interceptors
   */
  private async applyRequestInterceptors(
    config: ApiRequestOptions,
  ): Promise<ApiRequestOptions> {
    let result = config;

    for (const interceptor of this.interceptors.request) {
      result = await interceptor(result);
    }

    return result;
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors(
    response: Response,
  ): Promise<Response> {
    let result = response;

    for (const interceptor of this.interceptors.response) {
      result = await interceptor(result);
    }

    return result;
  }

  /**
   * Apply error interceptors
   */
  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let result = error;

    for (const interceptor of this.interceptors.error) {
      result = await interceptor(result);
    }

    return result;
  }

  /**
   * Create fetch timeout promise
   */
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Request timeout after ${timeout}ms`) as ApiError;
        error.isTimeout = true;
        error.isNetworkError = true;
        reject(error);
      }, timeout);
    });
  }

  /**
   * Create retry promise
   */
  private async withRetries<T>(
    request: () => Promise<T>,
    retries: number = 0,
    retryDelay: number = 1000,
  ): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      const apiError = error as ApiError;

      // Don't retry on client errors (4xx)
      if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
        throw error;
      }

      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      return this.withRetries(request, retries - 1, retryDelay * 2);
    }
  }

  /**
   * Process response
   */
  private async processResponse<T>(
    response: Response,
  ): Promise<ApiResponse<T>> {
    const processedResponse = await this.applyResponseInterceptors(response);

    const status = processedResponse.status;
    const statusText = processedResponse.statusText;
    const headers = processedResponse.headers;

    // Handle empty responses
    if (status === 204) {
      return {
        data: null as unknown as T,
        status,
        statusText,
        headers,
      };
    }

    // Parse response body
    let data: T;
    try {
      const contentType = headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await processedResponse.json();
      } else {
        data = (await processedResponse.text()) as unknown as T;
      }
    } catch {
      // If JSON parsing fails, return raw text
      data = (await processedResponse.text()) as unknown as T;
    }

    // Check for error status codes
    if (!processedResponse.ok) {
      const error = new Error(response.statusText) as ApiError;
      error.status = status;
      error.statusText = statusText;
      error.data = data;
      error.isNetworkError = false;

      throw await this.applyErrorInterceptors(error);
    }

    return {
      data,
      status,
      statusText,
      headers,
    };
  }

  /**
   * Create error from network error
   */
  private createNetworkError(error: unknown): ApiError {
    const apiError = new Error(
      error instanceof Error ? error.message : 'Network error',
    ) as ApiError;

    apiError.status = 0;
    apiError.statusText = 'Network Error';
    apiError.isTimeout = error instanceof Error && error.message.includes('timeout');
    apiError.isNetworkError = true;

    return apiError;
  }

  /**
   * Make an HTTP request
   */
  async request<T = unknown>(
    method: string,
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const { params, timeout, retries = 0, retryDelay = 1000, ...fetchOptions } = options;

    // Build URL
    const url = this.buildURL(endpoint, params);

    // Build headers
    const headers = {
      ...this.defaultHeaders,
      ...fetchOptions.headers,
    };

    // Build request config
    const config: RequestInit = {
      method,
      headers,
      ...fetchOptions,
    };

    // Apply request interceptors
    const processedConfig = await this.applyRequestInterceptors(config);

    // Create fetch promise with timeout
    const fetchPromise = this.withRetries(
      () => fetch(url, processedConfig),
      retries,
      retryDelay,
    );

    // Race fetch against timeout
    const timeoutPromise = timeout
      ? this.createTimeoutPromise<void>(timeout)
      : new Promise<void>(() => {});

    try {
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      return this.processResponse<T>(response as Response);
    } catch (error) {
      const apiError = this.createNetworkError(error);
      throw await this.applyErrorInterceptors(apiError);
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const body = data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>('POST', endpoint, { ...options, body });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const body = data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>('PUT', endpoint, { ...options, body });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const body = data !== undefined ? JSON.stringify(data) : undefined;
    return this.request<T>('PATCH', endpoint, { ...options, body });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * Upload file
   */
  async upload<T = unknown>(
    endpoint: string,
    file: File,
    fieldName: string = 'file',
    additionalData: Record<string, unknown> = {},
    onUploadProgress?: (progress: number) => void,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    // Remove Content-Type header to let browser set it with boundary
    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type'];

    if (options.headers) {
      Object.entries(options.headers as Record<string, string>).forEach(
        ([key, value]) => {
          headers[key] = value;
        },
      );
    }

    // Create XMLHttpRequest for upload progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onUploadProgress) {
          const progress = (event.loaded / event.total) * 100;
          onUploadProgress(progress);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({
                data,
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Headers(
                  xhr
                    .getAllResponseHeaders()
                    .trim()
                    .split(/[\r\n]+/)
                    .map((line) => line.split(/:\s*/, 2)),
                ),
              });
            } catch {
              resolve({
                data: xhr.responseText as unknown as T,
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Headers(
                  xhr
                    .getAllResponseHeaders()
                    .trim()
                    .split(/[\r\n]+/)
                    .map((line) => line.split(/:\s*/, 2)),
                ),
              });
            }
          } else {
            const error = new Error(xhr.statusText) as ApiError;
            error.status = xhr.status;
            error.statusText = xhr.statusText;
            error.isNetworkError = false;
            try {
              error.data = JSON.parse(xhr.responseText);
            } catch {
              error.data = xhr.responseText;
            }
            reject(error);
          }
        }
      };

      xhr.onerror = () => {
        const error = new Error('Network error') as ApiError;
        error.status = 0;
        error.statusText = 'Network Error';
        error.isNetworkError = true;
        reject(error);
      };

      xhr.onabort = () => {
        const error = new Error('Request aborted') as ApiError;
        error.status = 0;
        error.statusText = 'Aborted';
        error.isNetworkError = true;
        reject(error);
      };

      xhr.open('POST', this.buildURL(endpoint, options.params));

      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  }

  /**
   * Download file
   */
  async download(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<Blob> {
    const response = await this.request<Blob>('GET', endpoint, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
        Accept: 'application/octet-stream',
      },
    });

    return response.data as Blob;
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// Export types
export type { ApiRequestOptions, ApiResponse, ApiError };

// Export client class
export { ApiClient };
