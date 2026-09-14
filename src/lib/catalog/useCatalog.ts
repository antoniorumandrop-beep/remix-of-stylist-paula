import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';
import type { Product, RawProduct } from './types';

const EMPTY: Product[] = [];

/**
 * Drop the mock catalogue once there are real products.
 *
 * Its thirty rows carry no photo, English names and a `fitScore` nobody can
 * derive from anything. Standing among imported garments that have their own
 * picture, composition and size chart, they read as broken products, and
 * Antonio asked for them gone on 2026-09-14.
 *
 * A filter rather than a delete, because that same mock catalogue is the
 * fixture the rest of the suite runs on — emptying the array failed fifteen
 * tests across six files, half of them another session's. So the rule is
 * stated the way it is meant: filler exists to stop an empty app looking
 * broken, and stops the moment there is anything real to show.
 *
 * Keyed on `source` and not on the missing photo. A brand that fills the feed
 * spreadsheet without an `image_url` column still gets a real product, and
 * hiding it would be a silent no-show for the small brands Paula is for — the
 * e2e import test is what caught that.
 *
 * Only the recommendation channel is filtered. `byId` keeps everything, so a
 * piece already sitting in a wardrobe or a collection still opens.
 */
function withoutMockCatalogue(products: Product[]): Product[] {
  const real = products.filter(p => p.source);
  return real.length > 0 ? real : products;
}

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
  const all = query.data ?? EMPTY;
  const userProducts = mine.data ?? EMPTY;
  const products = useMemo(() => withoutMockCatalogue(all), [all]);
  const byId = useMemo(
    () => new Map([...all, ...userProducts].map(p => [p.id, p])),
    [all, userProducts],
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
