"use client";

import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api } from "../services/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [vendorCarts, setVendorCarts] = useState({}); // {vendorId: [{id, name, price, quantity, vendorId, options}]}
  const [loading, setLoading] = useState(true);

  // Load cart from backend on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const response = await api('/api/cart');

        // Backend returns { vendorCarts: {vendorId: [items]} }
        if (response && response.vendorCarts) {
          setVendorCarts(response.vendorCarts);
        }
      } catch (err) {
        console.error('Failed to load cart:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, []);

  const addItem = async (product, quantity = 1, selectedOptions = {}) => {
    // Optimistically update UI
    const previousState = vendorCarts;
    setVendorCarts((prev) => {
      const vendorId = product.vendorId;
      const vendorItems = prev[vendorId] || [];
      const keyMatches = (i) => i.id === product.id && JSON.stringify(i.options ?? {}) === JSON.stringify(selectedOptions ?? {});
      const existing = vendorItems.find(keyMatches);

      if (existing) {
        return {
          ...prev,
          [vendorId]: vendorItems.map((i) => (keyMatches(i) ? { ...i, quantity: i.quantity + quantity } : i))
        };
      }

      return {
        ...prev,
        [vendorId]: [
          ...vendorItems,
          {
            id: product.id,
            vendorId: product.vendorId,
            name: product.name,
            price: product.price,
            quantity,
            options: selectedOptions,
          },
        ],
      };
    });

    // Sync with backend
    try {
      const response = await api('/api/cart/items', {
        method: 'POST',
        body: {
          productId: product.id,
          quantity: quantity,
          selectedOptions: selectedOptions
        }
      });

      // Update state with backend response to ensure sync
      if (response && response.vendorCarts) {
        setVendorCarts(response.vendorCarts);
      }
    } catch (err) {
      console.error('Failed to add item to backend cart:', err);
      // Revert optimistic update on error
      setVendorCarts(previousState);
    }
  };

  const removeItem = async (vendorId, productId) => {
    // Optimistically update UI
    const previousState = vendorCarts;
    setVendorCarts((prev) => {
      const updated = { ...prev };
      if (updated[vendorId]) {
        updated[vendorId] = updated[vendorId].filter((i) => i.id !== productId);
        if (updated[vendorId].length === 0) {
          delete updated[vendorId];
        }
      }
      return updated;
    });

    // Sync with backend - Note: backend uses cart_item ID, not product ID
    // We'll need to find the cart item by productId or clear vendor items
    try {
      // For now, we'll just reload the cart after removal
      // You may want to enhance the backend API to support removing by productId
      const response = await api(`/api/cart/vendors/${vendorId}`, {
        method: 'DELETE'
      });

      // Update state with backend response to ensure sync
      if (response && response.vendorCarts) {
        setVendorCarts(response.vendorCarts);
      }
    } catch (err) {
      console.error('Failed to remove item from backend cart:', err);
      // Revert on error
      setVendorCarts(previousState);
    }
  };

  const clearVendor = async (vendorId) => {
    // Optimistically update UI
    const previousState = vendorCarts;
    setVendorCarts((prev) => {
      const updated = { ...prev };
      delete updated[vendorId];
      return updated;
    });

    // Sync with backend
    try {
      const response = await api(`/api/cart/vendors/${vendorId}`, {
        method: 'DELETE'
      });

      // Update state with backend response to ensure sync
      if (response && response.vendorCarts) {
        setVendorCarts(response.vendorCarts);
      }
    } catch (err) {
      console.error('Failed to clear vendor from backend cart:', err);
      // Revert on error
      setVendorCarts(previousState);
    }
  };

  const clearAll = async () => {
    // Optimistically update UI
    const previousState = vendorCarts;
    setVendorCarts({});

    // Sync with backend
    try {
      await api('/api/cart', {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to clear backend cart:', err);
      // Revert on error
      setVendorCarts(previousState);
    }
  };

  const getVendorCart = (vendorId) => vendorCarts[vendorId] || [];

  const getVendorTotal = (vendorId) => {
    const items = getVendorCart(vendorId);
    return items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  };

  const allItems = useMemo(
    () => Object.values(vendorCarts).flat(),
    [vendorCarts]
  );

  const totalItems = useMemo(
    () => allItems.reduce((acc, i) => acc + i.quantity, 0),
    [allItems]
  );

  const value = useMemo(
    () => ({
      vendorCarts,
      addItem,
      removeItem,
      clearVendor,
      clearAll,
      getVendorCart,
      getVendorTotal,
      allItems,
      totalItems,
      loading
    }),
    [vendorCarts, allItems, totalItems, loading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
