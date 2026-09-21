import type { Theme } from '@wasabi-cross/schemas';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useTheme } from '@wasabi-cross/ui';
import { useEffect, useRef } from 'react';
import { preferencesQueryOptions, PREFERENCES_QUERY_KEY, type ApiClient } from './api.ts';

export interface SyncedTheme {
  theme: Theme;
  /** Lo aplica al instante y lo guarda en la API. */
  change: (theme: Theme) => void;
  save: UseMutationResult<unknown, Error, { theme: Theme }>;
}

/**
 * El tema, con la API como fuente de verdad (F1-16). `localStorage` sigue existiendo para
 * que no haya un parpadeo antes de que cargue la sesión, pero con sesión manda lo guardado:
 * el mismo usuario en otro dispositivo ve su tema.
 */
export function useSyncedTheme(api: ApiClient): SyncedTheme {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const preferences = useQuery(preferencesQueryOptions(api));
  const applied = useRef<Theme | null>(null);

  const save = useMutation({
    mutationFn: (change: { theme: Theme }) => api.savePreferences(change),
    onSuccess: (saved) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, saved);
    },
  });

  const stored = preferences.data?.theme;
  useEffect(() => {
    // Sólo cuando cambia lo que dice la API: si no, pelearía con lo que acaba de elegir
    // el usuario. Si el guardado falla, la API sigue diciendo lo viejo y el tema vuelve.
    if (stored !== undefined && stored !== applied.current) {
      applied.current = stored;
      setTheme(stored);
    }
  }, [stored, setTheme]);

  return {
    theme,
    change: (next) => {
      setTheme(next);
      save.mutate({ theme: next });
    },
    save,
  };
}
