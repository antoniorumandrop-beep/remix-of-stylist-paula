import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';

/** Hearted products. */
export function useSaved() {
  const query = useQuery({ queryKey: qk.saved, queryFn: () => backend.saved.list() });
  const add = useMutation({ mutationFn: (id: string) => backend.saved.add(id) });
  const remove = useMutation({ mutationFn: (id: string) => backend.saved.remove(id) });
  const ids = query.data ?? [];
  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => (ids.includes(id) ? remove.mutateAsync(id) : add.mutateAsync(id)),
    [ids, add.mutateAsync, remove.mutateAsync],
  );
  return { ids, loading: query.isPending, isSaved, toggle };
}
