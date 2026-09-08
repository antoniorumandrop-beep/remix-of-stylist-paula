import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';

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

/**
 * The wardrobe: things the user owns, things she clicked through to buy and
 * has not confirmed yet, and outfits built from owned items.
 *
 * Reads are queries, writes are mutations, storage is `backend.wardrobe`.
 */
export function useWardrobe() {
  const itemsQuery = useQuery({ queryKey: qk.wardrobeItems, queryFn: () => backend.wardrobe.listItems() });
  const pendingQuery = useQuery({ queryKey: qk.wardrobePending, queryFn: () => backend.wardrobe.listPending() });
  const outfitsQuery = useQuery({ queryKey: qk.wardrobeOutfits, queryFn: () => backend.wardrobe.listOutfits() });

  const add = useMutation({ mutationFn: (id: string) => backend.wardrobe.addItem(id) });
  const remove = useMutation({ mutationFn: (id: string) => backend.wardrobe.removeItem(id) });
  const wear = useMutation({ mutationFn: (id: string) => backend.wardrobe.incrementWear(id) });
  const pend = useMutation({ mutationFn: (id: string) => backend.wardrobe.markPending(id) });
  const dismiss = useMutation({ mutationFn: (id: string) => backend.wardrobe.dismissPending(id) });
  const create = useMutation({ mutationFn: (v: { name: string; productIds: string[] }) => backend.wardrobe.createOutfit(v.name, v.productIds) });
  const del = useMutation({ mutationFn: (id: string) => backend.wardrobe.deleteOutfit(id) });

  const items = itemsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const outfits = outfitsQuery.data ?? [];

  const has = useCallback((productId: string) => items.some(i => i.productId === productId), [items]);

  return {
    items,
    pending,
    outfits,
    loading: itemsQuery.isPending || pendingQuery.isPending || outfitsQuery.isPending,
    has,
    addItem: (id: string) => add.mutateAsync(id),
    removeItem: (id: string) => remove.mutateAsync(id),
    incWear: (id: string) => wear.mutateAsync(id),
    markPending: (id: string) => pend.mutateAsync(id),
    dismissPending: (id: string) => dismiss.mutateAsync(id),
    createOutfit: (name: string, productIds: string[]) => create.mutateAsync({ name, productIds }),
    deleteOutfit: (id: string) => del.mutateAsync(id),
  };
}
