// API Configuration for Next.js Frontend
// This file handles API endpoints and CORS configuration

declare const process: {
  env: {
    NEXT_PUBLIC_API_BASE_URL?: string;
    NEXT_PUBLIC_FRONTEND_URL?: string;
    NEXT_PUBLIC_AUTH0_DOMAIN?: string;
    NEXT_PUBLIC_AUTH0_CLIENT_ID?: string;
    NEXT_PUBLIC_AUTH0_REDIRECT_URI?: string;
  };
};

const config = {
  // API Base URL
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api',
  
  // Frontend URL
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  
  // Auth0 Configuration
  AUTH0: {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-zg58kn127grr7sf6.us.auth0.com',
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'eKRUA6UlzZX8DKuCi247gryxqPc8r293',
    redirectUri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    scope: 'openid profile email'
  },
  
  // Request timeout
  REQUEST_TIMEOUT: 30000,
  
  // Default headers for API requests
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Sistema-Gestion-Personas-Frontend/1.0.0'
  },
  
  // CORS origins for development
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000'
  ]
} as const;

export default config;
