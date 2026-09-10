import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';
import type { Product, RawProduct } from './types';

const EMPTY: Product[] = [];

/**
 * Two different questions, deliberately answered differently.
 *
 * `products` is the shared channel: what Paula may recommend, search and put
 * in a "similar products" row. `byId` is everything the user can open, which
 * also covers the pieces she added herself from a link to a shop we do not
 * carry. Those are enriched from whatever that page happened to publish, so
 * they would wear the same Fit Score badge on far thinner data — fine on a
 * page she opened on purpose, wrong in a recommendation.
 */
export function useCatalog() {
  const query = useQuery({ queryKey: qk.catalog, queryFn: () => backend.catalog.list() });
  const mine = useQuery({ queryKey: qk.catalogUser, queryFn: () => backend.catalog.listUserProducts() });
  const products = query.data ?? EMPTY;
  const userProducts = mine.data ?? EMPTY;
  const byId = useMemo(
    () => new Map([...products, ...userProducts].map(p => [p.id, p])),
    [products, userProducts],
  );
  return { products, userProducts, byId, loading: query.isPending };
}

export function useProduct(id: string | undefined) {
  const { byId, loading } = useCatalog();
  return { product: id ? byId.get(id) ?? null : null, loading };
}

/** Products the user added herself, from a pasted shop link. */
export function useUserProducts() {
  const query = useQuery({ queryKey: qk.catalogUser, queryFn: () => backend.catalog.listUserProducts() });
  const add = useMutation({ mutationFn: (item: RawProduct) => backend.catalog.addUserProduct(item) });
  const remove = useMutation({ mutationFn: (id: string) => backend.catalog.removeUserProduct(id) });
  return {
    products: query.data ?? EMPTY,
    loading: query.isPending,
    add: add.mutateAsync,
    remove: remove.mutateAsync,
    adding: add.isPending,
  };
}

/** The brand-import side of the catalog. Used by /admin/import. */
export function useCatalogImport() {
  const query = useQuery({ queryKey: qk.catalogImported, queryFn: () => backend.catalog.listImported() });
  const importMutation = useMutation({ mutationFn: (items: RawProduct[]) => backend.catalog.importRaw(items) });
  const clearMutation = useMutation({ mutationFn: () => backend.catalog.clearImported() });
  return {
    imported: query.data ?? EMPTY,
    loading: query.isPending,
    importRaw: (items: RawProduct[]) => importMutation.mutateAsync(items),
    clearImported: () => clearMutation.mutateAsync(),
    importing: importMutation.isPending,
  };
}
