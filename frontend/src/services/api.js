const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = RAW_API_URL ? `${RAW_API_URL.replace(/\/+$/, '')}/api/v1` : '/api/v1';

export function getAuthToken() {
  return localStorage.getItem('securebank_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('securebank_token', token);
  } else {
    localStorage.removeItem('securebank_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  // Idempotency support
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle CSV or Blob downloads
    if (options.responseType === 'blob') {
      if (!response.ok) throw new Error('File download failed');
      return await response.blob();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.detail || (data.errors ? Object.values(data.errors).flat().join(', ') : 'An unexpected error occurred.');
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.status === 401) {
      // Session expired, clear token
      // Avoid redirecting if already on login pages
      const path = window.location.pathname;
      if (!path.includes('/login') && path !== '/') {
        localStorage.removeItem('securebank_token');
        localStorage.removeItem('securebank_user');
        window.location.href = '/login';
      }
    }
    throw error;
  }
}
