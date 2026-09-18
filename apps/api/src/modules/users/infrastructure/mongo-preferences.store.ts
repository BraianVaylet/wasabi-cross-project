import type { Theme } from '@wasabi-cross/schemas';
import type { Db } from 'mongodb';
import type { PreferencesStore, StoredPreferences } from '../domain/preferences.ts';

export const PREFERENCES_COLLECTION = 'user_preferences';

/*
 * Un documento por usuario, con el ID del usuario como `_id`: no hace falta un índice para
 * que haya uno solo. Fuera del documento que maneja Better Auth, que es de la librería.
 */
interface PreferencesDocument {
  _id: string;
  theme?: Theme;
  loadPercentages?: number[];
  createdAt: string;
  updatedAt: string;
}

function toStored(document: PreferencesDocument): StoredPreferences {
  return {
    ...(document.theme === undefined ? {} : { theme: document.theme }),
    ...(document.loadPercentages === undefined
      ? {}
      : { loadPercentages: document.loadPercentages }),
  };
}

export function createMongoPreferencesStore(db: Db): PreferencesStore {
  const preferences = db.collection<PreferencesDocument>(PREFERENCES_COLLECTION);

  return {
    find: async (userId) => {
      const document = await preferences.findOne({ _id: userId });
      return document ? toStored(document) : null;
    },

    save: async (userId, change) => {
      const now = new Date().toISOString();

      // Un solo `$set` con upsert: dos cambios a la vez, uno del tema y otro de los
      // porcentajes, no se pisan como con leer, modificar y escribir.
      const document = await preferences.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            ...(change.theme === undefined ? {} : { theme: change.theme }),
            ...(change.loadPercentages === undefined
              ? {}
              : { loadPercentages: change.loadPercentages }),
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true, returnDocument: 'after' },
      );

      /* v8 ignore next 3 -- con upsert y returnDocument 'after', Mongo siempre devuelve el documento */
      if (!document) {
        throw new Error(`Preferencias de ${userId} sin documento después del upsert`);
      }
      return toStored(document);
    },
  };
}
