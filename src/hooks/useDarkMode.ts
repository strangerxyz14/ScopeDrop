import { useState, useEffect } from 'react';
import { supabase } from '@/services/enhancedCacheManager';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize dark mode from localStorage and Supabase
  useEffect(() => {
    const initializeDarkMode = async () => {
      try {
        // Check localStorage first
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode !== null) {
          setIsDarkMode(savedMode === 'true');
        } else {
          // Check system preference
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setIsDarkMode(systemPrefersDark);
        }

        // Try to get user preference from Supabase if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('dark_mode')
            .eq('user_id', user.id)
            .single();

          if (preferences?.dark_mode !== null) {
            setIsDarkMode(preferences.dark_mode);
          }
        }
      } catch (error) {
        console.error('Error initializing dark mode:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDarkMode();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Save to localStorage
    localStorage.setItem('darkMode', newMode.toString());
    
    // Save to Supabase if user is authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            dark_mode: newMode,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  return {
    isDarkMode,
    isLoading,
    toggleDarkMode
  };
};