// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '../i18n/i18n';
import { createProfile } from '../profiles/Profile';
import { PROFILES_KEY, ProfileStore } from '../profiles/ProfileStore';
import { serializeProfiles } from '../profiles/profileSchema';
import { removeStorage } from '../storage';
import { importProgress, progressBackupActions } from './progressBackup';

const OBJECT_URL = 'blob:literkowo/progress';

function setup() {
  const store = new ProfileStore();
  const notify = vi.fn();
  const onImported = vi.fn();
  return { store, notify, onImported, host: { store, notify, onImported } };
}

describe('progressBackup', () => {
  afterEach(() => {
    removeStorage(PROFILES_KEY);
    i18n.set('pl');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('export', () => {
    let saved: Blob | undefined;
    const revokeObjectURL = vi.fn();

    beforeEach(() => {
      vi.useFakeTimers();
      saved = undefined;
      vi.stubGlobal('URL', {
        createObjectURL: (blob: Blob) => {
          saved = blob;
          return OBJECT_URL;
        },
        revokeObjectURL,
      });
    });

    afterEach(() => vi.useRealTimers());

    it('downloads every profile as a dated JSON file', async () => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();
      const { store, host } = setup();
      const ola = createProfile('Ola', 'a');
      store.add(ola);
      progressBackupActions(host, () => new Date(2026, 9, 17)).onExport();
      const [link] = click.mock.contexts;
      if (!(link instanceof HTMLAnchorElement)) throw new Error('Missing download link');
      expect(link.download).toBe('literkowo-2026-10-17.json');
      expect(link.href).toBe(OBJECT_URL);
      expect(link.isConnected).toBe(false);
      expect(saved?.type).toBe('application/json');
      expect(await saved?.text()).toBe(serializeProfiles([ola]));
      vi.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
    });
  });

  describe('import', () => {
    it('merges the file, refreshes the app and says so', async () => {
      const { store, notify, onImported, host } = setup();
      const ola = createProfile('Ola', 'a');
      store.add(ola);
      const jan = createProfile('Jan', 'b');
      await importProgress(host, new Blob([serializeProfiles([{ ...ola, xp: 90 }, jan])]));
      expect(store.all()).toEqual([{ ...ola, xp: 90 }, jan]);
      expect(onImported).toHaveBeenCalledOnce();
      expect(notify).toHaveBeenCalledWith('Postęp wczytany');
    });

    it('keeps the progress here when the file is not a progress file', async () => {
      const { store, notify, onImported, host } = setup();
      const ola = createProfile('Ola', 'a');
      store.add(ola);
      i18n.set('uk');
      await importProgress(host, new Blob(['{"id":"x"}']));
      expect(store.all()).toEqual([ola]);
      expect(onImported).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith('Цей файл не вдається завантажити');
    });
  });
});
