import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@shopping_theme';

type ThemeContextType = {
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(THEME_KEY)
      .then(saved => {
        if (active) {
          setDarkModeState(saved === 'dark');
        }
      })
      .catch(error => {
        console.error('Theme loading error:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const setDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled);

    AsyncStorage.setItem(
      THEME_KEY,
      enabled ? 'dark' : 'light'
    ).catch(error => {
      console.error('Theme saving error:', error);
    });
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return context;
}