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

/**
 * One garment in a fit, as she names it herself.
 *
 * `label` is the whole point and it is never derived from a product: most of
 * what she wears is not in our catalogue, so a picker over the catalogue would
 * be a feature pretending to work. `productId` is the optional upgrade — when
 * the thing does happen to be in Paula, the row can carry a link to it, and
 * that is where "where do I buy this" comes from later. A row is allowed to
 * have one, the other, or both.
 */
export interface FitItem {
  label: string;
  productId?: string | null;
}

/**
 * A fit: photos of her wearing something, plus what she says she has on.
 *
 * The photos are the content, not decoration — a fit without them is a list.
 * They are held by id, never inline: the bytes live behind
 * `backend.photos`, because a data URI of a phone photo does not fit in
 * localStorage and would take the rest of her data down with it.
 *
 * Order in `photoIds` is the order she is turning in — front, three-quarter,
 * side — which is what makes the viewer read as a turn rather than a gallery.
 */
export interface Outfit {
  id: string;
  name: string;
  photoIds: string[];
  /**
   * Sylwetka wycięta z danego zdjęcia — klucz to id oryginału, wartość to id
   * wycinka w tym samym magazynie. Oryginał zostaje nietknięty i to jest cała
   * różnica: zły wycinek da się cofnąć i powtórzyć, a gdy kiedyś zmienimy
   * model na lepszy, stare fity przeliczymy z tego, co już mamy.
   *
   * Puste, dopóki nie poprosi o skan. Fity zapisane wcześniej czytają się
   * dalej — `toOutfit` daje im pustą mapę.
   */
  cutouts: Record<string, string>;
  items: FitItem[];
  createdAt: string;
}

/** Everything a fit is made of, without the parts the store assigns. */
export interface OutfitDraft {
  name: string;
  items: FitItem[];
  photoIds: string[];
}

/** Shared empty lists; see the note in `saved.ts`. */
const NO_ITEMS: WardrobeItem[] = [];
const NO_PENDING: PendingPurchase[] = [];
const NO_OUTFITS: Outfit[] = [];

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
  /**
   * The old two-argument shape is kept here on purpose: the wardrobe's own
   * builder combines things she owns and has nothing to say about photos or
   * labels. A fit with both is built on its own screen, through `useFits`.
   */
  const create = useMutation({
    mutationFn: (v: { name: string; productIds: string[] }) => backend.wardrobe.createOutfit({
      name: v.name,
      items: v.productIds.map(productId => ({ label: '', productId })),
      photoIds: [],
    }),
  });
  const del = useMutation({ mutationFn: (id: string) => backend.wardrobe.deleteOutfit(id) });

  const items = itemsQuery.data ?? NO_ITEMS;
  const pending = pendingQuery.data ?? NO_PENDING;
  const outfits = outfitsQuery.data ?? NO_OUTFITS;

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
