import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { OperationalCatalogItem } from '../types/catalog';

export interface CartItem {
  product: OperationalCatalogItem;
  quantity: number;
  notes?: string;
}

interface RequestCartContextType {
  items: CartItem[];
  addToCart: (product: OperationalCatalogItem, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateNotes: (productId: number, notes: string) => void;
  clearCart: () => void;
  sourceWarehouseId: number | null;
  setSourceWarehouseId: (id: number | null) => void;
  destinationWarehouseId: number | null;
  setDestinationWarehouseId: (id: number | null) => void;
  getItemCount: () => number;
}

const RequestCartContext = createContext<RequestCartContextType | undefined>(undefined);

export const RequestCartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | null>(null);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<number | null>(null);

  const addToCart = useCallback((product: OperationalCatalogItem, quantity: number = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return currentItems.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...currentItems, { product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems(currentItems => 
      currentItems.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  }, []);

  const updateNotes = useCallback((productId: number, notes: string) => {
    setItems(currentItems => 
      currentItems.map(item => 
        item.product.id === productId 
          ? { ...item, notes }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSourceWarehouseId(null);
    setDestinationWarehouseId(null);
  }, []);

  const getItemCount = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  return (
    <RequestCartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateNotes,
        clearCart,
        sourceWarehouseId,
        setSourceWarehouseId,
        destinationWarehouseId,
        setDestinationWarehouseId,
        getItemCount,
      }}
    >
      {children}
    </RequestCartContext.Provider>
  );
};

export const useRequestCart = () => {
  const context = useContext(RequestCartContext);
  if (context === undefined) {
    throw new Error('useRequestCart must be used within a RequestCartProvider');
  }
  return context;
};
