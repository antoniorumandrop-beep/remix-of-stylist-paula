import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';
import type { Outfit, OutfitDraft } from '@/lib/wardrobe';
import { prepareFitPhoto } from '@/lib/fitPhoto';
import { scanFit, ScanFailed } from '@/lib/fitCutout';

/**
 * Her own fits: photos of herself wearing something, plus what she says she has
 * on. Stored as `Outfit` — the same record the wardrobe's builder writes, on
 * purpose, so a fit does not become a second kind of thing with the same
 * columns. What makes it a fit rather than a list is the photos.
 *
 * Reads are queries, writes are mutations, storage is `backend.wardrobe` for
 * the record and `backend.photos` for the bytes.
 */

/** Shared empty list; see the note in `saved.ts`. */
const NO_FITS: Outfit[] = [];

export function useFits() {
  const query = useQuery({ queryKey: qk.wardrobeOutfits, queryFn: () => backend.wardrobe.listOutfits() });
  const create = useMutation({ mutationFn: (draft: OutfitDraft) => backend.wardrobe.createOutfit(draft) });
  const update = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: OutfitDraft }) => backend.wardrobe.updateOutfit(id, draft),
  });
  const remove = useMutation({ mutationFn: (id: string) => backend.wardrobe.deleteOutfit(id) });
  const cutouts = useMutation({
    mutationFn: ({ id, map }: { id: string; map: Record<string, string> }) =>
      backend.wardrobe.setCutouts(id, map),
  });

  const fits = query.data ?? NO_FITS;

  /**
   * Scaling and storing are one step from her side — she picked a file — so
   * they are one call here. Returns the id to put in the draft; the draft is
   * what makes the photo part of a fit, so a photo stored by this and then
   * abandoned is deleted by the editor, not left to guesswork.
   */
  const addPhoto = useCallback(async (file: File): Promise<string> => {
    const blob = await prepareFitPhoto(file);
    return backend.photos.put(blob);
  }, []);

  const dropPhoto = useCallback(async (id: string) => {
    await backend.photos.remove(id);
  }, []);

  /**
   * Skan całego fitu: sylwetka bez tła, w kadrach ustawionych względem siebie.
   *
   * Świadomy krok, nie efekt uboczny wgrania zdjęcia — zdjęcie wyjeżdża z
   * telefonu dopiero wtedy, gdy ona o to prosi, i płacimy tylko za te fity,
   * które mają być pokazane. Ta sama reguła, co przy pomiarze.
   */
  const scan = useCallback(async (fit: Outfit, onProgress?: (done: number, total: number) => void) => {
    const loaded = await Promise.all(fit.photoIds.map(id => backend.photos.get(id).catch(() => null)));
    // Zdjęcie, którego nie ma w magazynie, nie ma z czego wyciąć sylwetki — a
    // fit z jedną zgubioną klatką ma dać się zeskanować z reszty.
    const usable = fit.photoIds.filter((_, index) => loaded[index]);
    const blobs = loaded.filter((blob): blob is Blob => Boolean(blob));
    if (blobs.length === 0) throw new ScanFailed('failed');

    const cuts = await scanFit(blobs, onProgress);
    const ids = await Promise.all(cuts.map(blob => backend.photos.put(blob)));
    const map: Record<string, string> = {};
    usable.forEach((photoId, index) => { map[photoId] = ids[index]; });

    try {
      await cutouts.mutateAsync({ id: fit.id, map });
    } catch (error) {
      // Zapis się nie udał, więc nic na te wycinki nie wskazuje. Zostawione
      // leżałyby w magazynie niewidoczne i na zawsze.
      await Promise.allSettled(ids.map(id => backend.photos.remove(id)));
      throw error;
    }
  }, [cutouts]);

  /** Zdejmuje skan; wycinki kasuje repozytorium, bo to ono je trzyma. */
  const clearScan = useCallback(
    (fit: Outfit) => cutouts.mutateAsync({ id: fit.id, map: {} }),
    [cutouts],
  );

  return {
    fits,
    loading: query.isPending,
    photosAvailable: backend.photos.available(),
    /**
     * Where her photos physically are, as a fact about the backend rather than
     * a sentence someone typed. With a server behind this the copy has to
     * change, and copy that is a function of the backend cannot lie.
     */
    photosStayLocal: backend.name === 'local',
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    saving: create.isPending || update.isPending,
    addPhoto,
    dropPhoto,
    scan,
    clearScan,
  };
}

/** One fit by id, without every screen reimplementing the lookup. */
export function useFit(id: string | undefined) {
  const { fits, loading } = useFits();
  return { fit: id ? fits.find(f => f.id === id) ?? null : null, loading };
}

/**
 * Object URLs for a fit's photos, revoked when the view goes away.
 *
 * Keyed on the joined ids rather than the array: a new array with the same
 * contents arrives on every render of the screen above, and re-reading every
 * blob each time would flicker the image it just showed.
 */
export function useFitPhotoUrls(photoIds: string[]): Record<string, string> {
  const key = photoIds.join(',');
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      setUrls({});
      return;
    }
    let cancelled = false;
    const created: string[] = [];

    void (async () => {
      const pairs = await Promise.all(ids.map(async id => {
        // A missing blob is not an error worth shouting about: the fit still
        // has its name and its rows, and a broken frame is better than a
        // broken screen.
        const blob = await backend.photos.get(id).catch(() => null);
        return blob ? ([id, blob] as const) : null;
      }));
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const pair of pairs) {
        if (!pair) continue;
        const url = URL.createObjectURL(pair[1]);
        created.push(url);
        next[pair[0]] = url;
      }
      setUrls(next);
    })();

    return () => {
      cancelled = true;
      created.forEach(url => URL.revokeObjectURL(url));
      setUrls({});
    };
  }, [key]);

  return urls;
}
