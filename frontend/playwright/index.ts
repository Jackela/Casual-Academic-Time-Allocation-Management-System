/* eslint-disable import/no-unresolved */
import { beforeMount, afterMount } from '@playwright/experimental-ct-react/hooks';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/contexts/AuthContext';
import { authManager } from '../src/services/auth-manager';
import type { User } from '../src/types/auth';
import '../src/index.modern.css';

type HooksConfig = {
  authUser?: User | null;
  authToken?: string;
  initialPath?: string;
};

beforeMount(async ({ App, hooksConfig }) => {
  const config = (hooksConfig ?? {}) as HooksConfig;

  authManager.clearAuth();
  if (config.authUser) {
    authManager.setAuth({
      token: config.authToken ?? 'test-token',
      user: config.authUser,
      refreshToken: null,
      expiresAt: null,
    });
  }

  if (config.initialPath) {
    window.history.replaceState({}, '', config.initialPath);
  }

  return React.createElement(
    BrowserRouter,
    null,
    React.createElement(
      AuthProvider,
      null,
      React.createElement(App),
    ),
  );
});

afterMount(async () => {
  console.log(`After mount`);
});
