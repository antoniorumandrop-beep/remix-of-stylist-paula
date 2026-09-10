import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk, type Collection } from '@/lib/backend';

/**
 * The same shared-empty-array trick as `saved.ts`: `query.data ?? []` builds a
 * new array on every render while the query is pending, which changes the
 * identity of every callback below it — and a product card reads this hook.
 */
const EMPTY: Collection[] = [];

export function useCollections() {
  const query = useQuery({ queryKey: qk.collections, queryFn: () => backend.collections.list() });

  const create = useMutation({
    mutationFn: ({ name, emoji }: { name: string; emoji?: string | null }) =>
      backend.collections.create(name, emoji ?? null),
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => backend.collections.rename(id, name),
  });
  const remove = useMutation({ mutationFn: (id: string) => backend.collections.remove(id) });
  const addProduct = useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      backend.collections.addProduct(id, productId),
  });
  const removeProduct = useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      backend.collections.removeProduct(id, productId),
  });

  const collections = query.data ?? EMPTY;

  /**
   * Creating a collection and putting the first product in it is one gesture
   * from the user's side ("New collection" in the menu on a card), so it is
   * one call here — otherwise every caller reimplements the two-step.
   */
  const createWith = useCallback(
    async (name: string, productId?: string) => {
      const created = await create.mutateAsync({ name });
      if (productId) await addProduct.mutateAsync({ id: created.id, productId });
      return created;
    },
    // `mutateAsync` is stable across renders, the mutation object is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [create.mutateAsync, addProduct.mutateAsync],
  );

  const contains = useCallback(
    (id: string, productId: string) =>
      collections.find(c => c.id === id)?.productIds.includes(productId) ?? false,
    [collections],
  );

  return {
    collections,
    loading: query.isPending,
    contains,
    createWith,
    create: create.mutateAsync,
    rename: rename.mutateAsync,
    remove: remove.mutateAsync,
    addProduct: addProduct.mutateAsync,
    removeProduct: removeProduct.mutateAsync,
  };
}
