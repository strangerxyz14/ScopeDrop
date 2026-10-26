
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { reloadForStaleChunk } from './lib/lazyWithReload';

// Vite fires this when a chunk's preloaded deps (JS/CSS) fail, e.g. after a deploy.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForStaleChunk()) event.preventDefault();
});

// Add global styles
document.documentElement.classList.add('scroll-smooth');

createRoot(document.getElementById("root")!).render(<App />);
