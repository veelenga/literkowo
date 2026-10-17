export type PersistentStorageManager = Pick<StorageManager, 'persist' | 'persisted'>;

export async function requestPersistentStorage(
  manager: PersistentStorageManager | undefined = deviceStorage(),
): Promise<boolean> {
  if (!manager) return false;
  try {
    return (await manager.persisted()) || (await manager.persist());
  } catch {
    return false;
  }
}

function deviceStorage(): PersistentStorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage;
}
