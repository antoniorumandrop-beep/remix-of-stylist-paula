/** Query keys, in one place so invalidation and hooks agree on them. */
export const qk = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  prefs: ['prefs'] as const,
  wardrobeItems: ['wardrobe', 'items'] as const,
  wardrobePending: ['wardrobe', 'pending'] as const,
  wardrobeOutfits: ['wardrobe', 'outfits'] as const,
  feedback: ['feedback'] as const,
  saved: ['saved'] as const,
  collections: ['collections'] as const,
  catalog: ['catalog'] as const,
  catalogImported: ['catalog', 'imported'] as const,
};
