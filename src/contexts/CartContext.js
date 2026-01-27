"use client";

import { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

const CartContext = createContext(null);
const MAX_CHARGE_CENTS = 5000000;
const MAX_CHARGE_LABEL = "$50,000.00";

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
    const vendorId = product.vendorId;
    const vendorItems = vendorCarts[vendorId] || [];
    const keyMatches = (i) => i.id === product.id && JSON.stringify(i.options ?? {}) === JSON.stringify(selectedOptions ?? {});
    const existing = vendorItems.find(keyMatches);
    const nextItems = existing
      ? vendorItems.map((i) => (keyMatches(i) ? { ...i, quantity: i.quantity + quantity } : i))
      : [
          ...vendorItems,
          {
            id: product.id,
            vendorId: product.vendorId,
            name: product.name,
            price: product.price,
            quantity,
            options: selectedOptions,
          },
        ];
    const nextTotal = nextItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (nextTotal > MAX_CHARGE_CENTS) {
      alert(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
      return { error: "limit_exceeded" };
    }

    // Optimistically update UI
    const previousState = vendorCarts;
    setVendorCarts((prev) => {
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

  const updateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;

    let targetVendorId = null;
    let targetItems = [];
    for (const vendorId of Object.keys(vendorCarts)) {
      const items = vendorCarts[vendorId];
      if (items.some((item) => item.id === cartItemId)) {
        targetVendorId = vendorId;
        targetItems = items;
        break;
      }
    }

    if (targetVendorId) {
      const nextItems = targetItems.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
      const nextTotal = nextItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      if (nextTotal > MAX_CHARGE_CENTS) {
        alert(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
        return;
      }
    }

    // Optimistically update UI
    const previousState = vendorCarts;
    setVendorCarts((prev) => {
      const updated = { ...prev };
      for (const vendorId in updated) {
        updated[vendorId] = updated[vendorId].map((item) =>
          item.id === cartItemId ? { ...item, quantity: newQuantity } : item
        );
      }
      return updated;
    });

    // Sync with backend
    try {
      const response = await api(`/api/cart/items/${cartItemId}`, {
        method: 'PATCH',
        body: {
          quantity: newQuantity
        }
      });

      // Update state with backend response to ensure sync
      if (response && response.vendorCarts) {
        setVendorCarts(response.vendorCarts);
      }
    } catch (err) {
      console.error('Failed to update quantity in backend cart:', err);
      // Revert on error
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

  const clearVendor = useCallback(async (vendorId) => {
    // Optimistically update UI
    setVendorCarts((prev) => {
      const previousState = prev;
      const updated = { ...prev };
      delete updated[vendorId];

      // Sync with backend
      api(`/api/cart/vendors/${vendorId}`, {
        method: 'DELETE'
      }).then((response) => {
        // Update state with backend response to ensure sync
        if (response && response.vendorCarts) {
          setVendorCarts(response.vendorCarts);
        }
      }).catch((err) => {
        console.error('Failed to clear vendor from backend cart:', err);
        // Revert on error
        setVendorCarts(previousState);
      });

      return updated;
    });
  }, []);

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
      updateQuantity,
      removeItem,
      clearVendor,
      clearAll,
      getVendorCart,
      getVendorTotal,
      allItems,
      totalItems,
      loading
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendorCarts, allItems, totalItems, loading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
