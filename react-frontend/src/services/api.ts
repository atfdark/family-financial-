// Determines the API base URL.
// 1. If REACT_APP_API_URL is set (e.g. in Vercel env vars), use it.
// 2. If running locally (Node env development), default to using the current hostname on port 8000 (for local network testing).
// 3. Otherwise (Production on Vercel), use empty string for relative paths (via vercel rewrites).
const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development' ? `http://${window.location.hostname}:8000` : '');

// Configuration for retry logic and timeout
const API_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // ms
  timeout: 30000, // 30 seconds
};

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

// Custom error class for better error handling
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}



// Delay function for retry logic
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// AbortController timeout wrapper
function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new ApiError('Request timeout', 408, 'Request Timeout', true));
    }, timeout);

    fetch(url, { ...options, signal: controller.signal })
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          reject(new ApiError('Request timeout', 408, 'Request Timeout', true));
        } else {
          reject(new ApiError(error.message || 'Network error', 0, 'Network Error', true));
        }
      });
  });
}

// Retry logic wrapper
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryCount: number = 0
): Promise<Response> {
  try {
    const response = await fetchWithTimeout(url, options, API_CONFIG.timeout);
    return response;
  } catch (error) {
    if (error instanceof ApiError && error.isRetryable && retryCount < API_CONFIG.maxRetries) {
      console.log(`Retrying request (${retryCount + 1}/${API_CONFIG.maxRetries})...`);
      await delay(API_CONFIG.retryDelay * (retryCount + 1));
      return fetchWithRetry(url, options, retryCount + 1);
    }
    throw error;
  }
}

async function apiCall<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Send cookies including httpOnly JWT
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, fetchOptions);

    // Handle unauthorized
    if (response.status === 401) {
      localStorage.removeItem('user');
      throw new ApiError('Unauthorized. Please log in again.', 401, 'Unauthorized', false);
    }

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new ApiError(
          errorJson.error || errorText || 'Request failed',
          response.status,
          response.statusText,
          response.status >= 500 // Retry on 5xx errors
        );
      } catch {
        throw new ApiError(errorText || 'Request failed', response.status, response.statusText, response.status >= 500);
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data as T;
    }

    return {} as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error
    throw new ApiError('Network error. Please check your connection.', 0, 'Network Error', true);
  }
}

export interface Transaction {
  id?: number;
  user_id?: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string | null;
  payment_method?: string | null;
  date: string;
}

export interface Reminder {
  id?: number;
  user_id?: number;
  description: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  frequency: 'once' | 'monthly' | 'yearly';
  created_at?: string;
}

export interface User {
  id?: number;
  username: string;
}

export const api = {
  // Auth endpoints
  login: (username: string, password: string) =>
    apiCall<{ message: string; user?: User }>('/login', {
      method: 'POST',
      body: { username, password },
      requireAuth: false,
    }),

  register: (username: string, password: string) =>
    apiCall<{ message: string }>('/register', {
      method: 'POST',
      body: { username, password },
      requireAuth: false,
    }),

  logout: () =>
    apiCall<{ message: string }>('/api/logout', {
      method: 'POST',
    }),

  getUser: () =>
    apiCall<{ username: string }>('/api/user'),

  // Transaction endpoints
  getTransactions: () =>
    apiCall<Transaction[]>('/api/transactions'),

  addTransaction: (transaction: Omit<Transaction, 'id' | 'user_id'>) =>
    apiCall<{ message: string }>('/api/transactions', {
      method: 'POST',
      body: transaction,
    }),

  createTransaction: (transaction: Omit<Transaction, 'id' | 'user_id'>) =>
    apiCall<{ message: string }>('/api/transactions', {
      method: 'POST',
      body: transaction,
    }),

  updateTransaction: (id: number, transaction: Partial<Transaction>) =>
    apiCall<{ message: string }>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: transaction,
    }),

  deleteTransaction: (id: number) =>
    apiCall<{ message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),

  // Reminder endpoints
  getReminders: () =>
    apiCall<Reminder[]>('/api/reminders'),

  addReminder: (reminder: Omit<Reminder, 'id' | 'user_id' | 'is_paid'>) =>
    apiCall<{ message: string; id: number }>('/api/reminders', {
      method: 'POST',
      body: reminder,
    }),

  updateReminder: (id: number, updates: Partial<Reminder>) =>
    apiCall<{ message: string }>(`/api/reminders/${id}`, {
      method: 'PUT',
      body: updates,
    }),

  deleteReminder: (id: number) =>
    apiCall<{ message: string }>(`/api/reminders/${id}`, {
      method: 'DELETE',
    }),

  // Export
  exportTransactions: async (params: {
    format: 'csv' | 'pdf';
    month?: number;
    year: number;
    type?: 'financial_year' | 'month';
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('format', params.format);
    queryParams.append('year', params.year.toString());
    if (params.month) queryParams.append('month', params.month.toString());
    if (params.type) queryParams.append('type', params.type);

    const response = await fetch(`${API_BASE_URL}/api/export/transactions?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${params.type === 'financial_year' ? 'FY' : params.month}-${params.year}.${params.format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
