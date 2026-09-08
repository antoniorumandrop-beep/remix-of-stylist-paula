import { useEffect, useState, useCallback } from 'react';

export interface WardrobeItem {
  productId: string;
  addedAt: string; // ISO
  timesWorn: number;
  notes?: string;
}

export interface PendingPurchase {
  productId: string;
  clickedAt: string;
}

export interface Outfit {
  id: string;
  name: string;
  productIds: string[];
  createdAt: string;
}

const KEYS = {
  wardrobe: 'paula.wardrobe',
  pending: 'paula.pendingPurchases',
  outfits: 'paula.outfits',
} as const;

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('paula:storage', { detail: { key } }));
}

export function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback));
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.key === key) setValue(readStored(key, fallback));
    };
    window.addEventListener('paula:storage', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('paula:storage', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [key]);
  const update = useCallback((next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeStored(key, v);
      return v;
    });
  }, [key]);
  return [value, update] as const;
}

export function useWardrobe() {
  const [items, setItems] = useStored<WardrobeItem[]>(KEYS.wardrobe, []);
  const [pending, setPending] = useStored<PendingPurchase[]>(KEYS.pending, []);
  const [outfits, setOutfits] = useStored<Outfit[]>(KEYS.outfits, []);

  const has = (productId: string) => items.some(i => i.productId === productId);

  const addItem = (productId: string) => {
    setItems(prev => prev.some(i => i.productId === productId)
      ? prev
      : [...prev, { productId, addedAt: new Date().toISOString(), timesWorn: 0 }]);
    setPending(prev => prev.filter(p => p.productId !== productId));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
    setOutfits(prev => prev.map(o => ({ ...o, productIds: o.productIds.filter(id => id !== productId) })));
  };

  const incWear = (productId: string) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, timesWorn: i.timesWorn + 1 } : i));
  };

  const markPending = (productId: string) => {
    if (items.some(i => i.productId === productId)) return;
    setPending(prev => prev.some(p => p.productId === productId)
      ? prev
      : [...prev, { productId, clickedAt: new Date().toISOString() }]);
  };

  const dismissPending = (productId: string) => {
    setPending(prev => prev.filter(p => p.productId !== productId));
  };

  const createOutfit = (name: string, productIds: string[]) => {
    const o: Outfit = { id: `o-${Date.now()}`, name, productIds, createdAt: new Date().toISOString() };
    setOutfits(prev => [o, ...prev]);
    return o;
  };

  const deleteOutfit = (id: string) => setOutfits(prev => prev.filter(o => o.id !== id));

  return { items, pending, outfits, has, addItem, removeItem, incWear, markPending, dismissPending, createOutfit, deleteOutfit };
}
