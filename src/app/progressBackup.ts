import { systemClock, type Clock } from '../arena/week';
import { i18n } from '../i18n/i18n';
import type { ProfileStore } from '../profiles/ProfileStore';
import { serializeProfiles } from '../profiles/profileSchema';
import { PROGRESS_FILE_TYPE, progressFileName, readProgressFile } from '../profiles/progressFile';
import type { ProgressBackupActions } from '../ui/backupControls';
import { downloadFile } from '../ui/download';

export interface ProgressBackupHost {
  readonly store: ProfileStore;
  readonly notify: (text: string) => void;
  readonly onImported: () => void;
}

export function progressBackupActions(
  host: ProgressBackupHost,
  clock: Clock = systemClock,
): ProgressBackupActions {
  return {
    onExport: () => exportProgress(host.store, clock()),
    onImport: (file) => void importProgress(host, file),
  };
}

function exportProgress(store: ProfileStore, date: Date): void {
  downloadFile(progressFileName(date), serializeProfiles(store.all()), PROGRESS_FILE_TYPE);
}

export async function importProgress(host: ProgressBackupHost, file: Blob): Promise<void> {
  const copy = i18n.t.features.progressBackup;
  const imported = await readProgressFile(file);
  if (!imported) return host.notify(copy.importFailed);
  host.store.merge(imported);
  host.onImported();
  host.notify(copy.imported);
}
