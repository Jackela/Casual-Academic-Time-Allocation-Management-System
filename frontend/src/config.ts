// src/config.ts

const getApiBaseUrl = () => {
  if (import.meta.env.MODE === 'e2e') {
    return 'http://localhost:8084';
  }
  // For development and production, you can adjust as needed
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();
