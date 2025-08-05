// src/config.ts

const getApiBaseUrl = () => {
  if (import.meta.env.MODE === 'e2e') {
    return 'http://localhost:8084';
  }
  // For development and production, default to 8084 where backend runs
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8084';
};

export const API_BASE_URL = getApiBaseUrl();
