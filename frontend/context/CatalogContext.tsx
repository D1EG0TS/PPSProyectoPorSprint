import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CatalogPreferences {
  viewMode: 'list' | 'grid';
  showStock: boolean;
  showCosts: boolean; // Only for authorized roles, but preference stored here
}

interface CatalogContextType {
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  preferences: CatalogPreferences;
  updatePreferences: (prefs: Partial<CatalogPreferences>) => void;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<CatalogPreferences>({
    viewMode: 'list',
    showStock: true,
    showCosts: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSearches = await AsyncStorage.getItem('recentSearches');
      if (storedSearches) setRecentSearches(JSON.parse(storedSearches));

      const storedPrefs = await AsyncStorage.getItem('catalogPreferences');
      if (storedPrefs) setPreferences(JSON.parse(storedPrefs));
    } catch (e) {
      console.error('Failed to load catalog settings', e);
    }
  };

  const addRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    setRecentSearches(prev => {
      const newSearches = [query, ...prev.filter(s => s !== query)].slice(0, 10); // Keep last 10
      AsyncStorage.setItem('recentSearches', JSON.stringify(newSearches));
      return newSearches;
    });
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('recentSearches');
  };

  const updatePreferences = async (newPrefs: Partial<CatalogPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      AsyncStorage.setItem('catalogPreferences', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <CatalogContext.Provider
      value={{
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
