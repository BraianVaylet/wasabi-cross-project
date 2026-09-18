import {
  DEFAULT_PREFERENCES,
  type UpdatePreferences,
  type UserPreferences,
} from '@wasabi-cross/schemas';

/**
 * Lo que el usuario cambió, y nada más. Lo que nunca tocó no se guarda: toma el default del
 * momento en que se lee (spec §5: "configurables por usuario").
 */
export type StoredPreferences = Partial<UserPreferences>;

export interface PreferencesStore {
  find: (userId: string) => Promise<StoredPreferences | null>;
  /** Aplica el cambio de una vez y devuelve cómo quedó lo guardado. */
  save: (userId: string, change: UpdatePreferences) => Promise<StoredPreferences>;
}

export function withDefaults(stored: StoredPreferences | null): UserPreferences {
  return {
    theme: stored?.theme ?? DEFAULT_PREFERENCES.theme,
    loadPercentages: [...(stored?.loadPercentages ?? DEFAULT_PREFERENCES.loadPercentages)],
  };
}
