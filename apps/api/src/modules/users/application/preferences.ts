import type { UpdatePreferences, UserPreferences } from '@wasabi-cross/schemas';
import { withDefaults, type PreferencesStore } from '../domain/preferences.ts';

/** Las preferencias del usuario, completas: lo que cambió y el default de lo demás (F1-08). */
export async function getPreferences(
  store: PreferencesStore,
  userId: string,
): Promise<UserPreferences> {
  return withDefaults(await store.find(userId));
}

/** Cambia una preferencia sin tocar la otra. El schema ya validó en el borde. */
export async function updatePreferences(
  store: PreferencesStore,
  userId: string,
  change: UpdatePreferences,
): Promise<UserPreferences> {
  return withDefaults(await store.save(userId, change));
}
