// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api',
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      auth0Login: '/auth/login/auth0',
      verifyToken: '/auth/verify-token'
    },
    personas: {
      base: '/personas',
      stats: '/personas/stats'
    },
    consulta: {
      search: '/consulta/search',
      export: '/consulta/export'
    },
    nlp: {
      query: '/nlp/query'
    },
    logs: {
      base: '/logs'
    }
  }
} as const;

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};

export default API_CONFIG;
