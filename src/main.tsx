
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add global styles
document.documentElement.classList.add('scroll-smooth');

createRoot(document.getElementById("root")!).render(<App />);
