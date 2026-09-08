import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';
import type { Product, RawProduct } from './types';

const EMPTY: Product[] = [];

/** Every product Paula can show. `[]` while loading. */
export function useCatalog() {
  const query = useQuery({ queryKey: qk.catalog, queryFn: () => backend.catalog.list() });
  const products = query.data ?? EMPTY;
  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  return { products, byId, loading: query.isPending };
}

export function useProduct(id: string | undefined) {
  const { byId, loading } = useCatalog();
  return { product: id ? byId.get(id) ?? null : null, loading };
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
