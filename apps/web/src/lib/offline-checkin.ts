const DB_NAME = 'ticketchain-scanner';
const STORE_NAME = 'offline-snapshots';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheOfflineSnapshot(eventId: string, snapshot: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(snapshot, eventId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getOfflineSnapshot<T>(eventId: string): Promise<T | null> {
  const db = await openDb();
  const result = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(eventId);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function fetchAndCacheSnapshot(
  eventId: string,
  apiUrl: string
): Promise<void> {
  const res = await fetch(
    `${apiUrl}/api/volunteer/checkin/offline-snapshot?eventId=${eventId}`,
    { credentials: 'include' }
  );
  if (!res.ok) return;
  const json = await res.json();
  if (json.success && json.data) {
    await cacheOfflineSnapshot(eventId, json.data);
  }
}
