import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize dark mode from sessionStorage (avoid persistent localStorage)
  useEffect(() => {
    try {
      const savedMode = sessionStorage.getItem('darkMode');
      if (savedMode !== null) {
        setIsDarkMode(savedMode === 'true');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(systemPrefersDark);
      }
    } catch (error) {
      console.error('Error initializing dark mode:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Save to sessionStorage
    sessionStorage.setItem('darkMode', newMode.toString());
  };

  return {
    isDarkMode,
    isLoading,
    toggleDarkMode
  };
};