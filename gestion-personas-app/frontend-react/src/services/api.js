const API_BASE_URL = 'http://localhost:8001/api';

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle auth errors
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }
    
    throw new ApiError(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData
    );
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};

export const apiClient = {
  async get(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });
    return handleResponse(response);
  },

  async post(endpoint, data, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    return handleResponse(response);
  },

  async put(endpoint, data, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    return handleResponse(response);
  },

  async delete(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });
    return handleResponse(response);
  },

  async upload(endpoint, formData, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
      body: formData,
      ...options,
    });
    return handleResponse(response);
  }
};

// API methods for different services
export const personasApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/personas${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => apiClient.get(`/personas/${id}`),
  create: (data) => apiClient.post('/personas', data),
  update: (id, data) => apiClient.put(`/personas/${id}`, data),
  delete: (id) => apiClient.delete(`/personas/${id}`),
  search: (query) => apiClient.get(`/personas/search?q=${encodeURIComponent(query)}`),
  validateDocument: (numero) => apiClient.post('/personas/validate-document', { numero_documento: numero }),
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiClient.upload(`/personas/${id}/photo`, formData);
  }
};

export const consultaApi = {
  getStats: () => apiClient.get('/consulta/stats'),
  getDashboardStats: () => apiClient.get('/consulta/dashboard/stats'),
  refreshStats: () => apiClient.post('/consulta/dashboard/refresh'),
  clearCache: () => apiClient.delete('/consulta/cache')
};

export const logsApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/logs${queryString ? `?${queryString}` : ''}`);
  },
  search: (query, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/logs/search?q=${encodeURIComponent(query)}${queryString ? `&${queryString}` : ''}`);
  }
};

export const nlpApi = {
  query: (pregunta) => apiClient.post('/nlp/query', { pregunta }),
  syncEmbeddings: () => apiClient.post('/nlp/sync-embeddings')
};

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  register: (userData) => apiClient.post('/auth/register', userData),
  validateToken: () => apiClient.get('/auth/validate'),
  refreshToken: () => apiClient.post('/auth/refresh'),
  loginAuth0: () => apiClient.get('/auth/login/auth0'),
  callbackAuth0: (code, state) => apiClient.get(`/auth/login/auth0/callback?code=${code}&state=${state}`)
};
