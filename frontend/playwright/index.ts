import { beforeMount, afterMount } from '@playwright/experimental-ct-react/hooks';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

beforeMount(async ({ App, hooksConfig }) => {
  console.log(`Before mount: ${JSON.stringify(hooksConfig)}, app: ${typeof App}`);
  
  return React.createElement(BrowserRouter, null, React.createElement(App));
});

afterMount(async () => {
  console.log(`After mount`);
});