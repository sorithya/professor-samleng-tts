/**
 * IndexedDB-based history store for TTS generations.
 * No external dependencies — uses the raw IndexedDB API.
 */

export interface HistoryEntry {
  id: string; // crypto.randomUUID()
  text: string;
  language: string;
  voiceId: string;
  voiceName: string;
  style: string;
  rate: number;
  pitch: number;
  volume: number;
  audioBlob: Blob;
  audioDurationMs: number;
  createdAt: number; // Date.now()
}

const DB_NAME = 'professor-somleng-tts-history';
const STORE_NAME = 'generations';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = callback(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      })
  );
}

export async function saveToHistory(entry: HistoryEntry): Promise<void> {
  await withStore('readwrite', (store) => store.put(entry) as IDBRequest<unknown>) as unknown as void;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const db = await openDB();
  return new Promise<HistoryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const entries: HistoryEntry[] = [];

    // Open a cursor in reverse (prev) to get newest first
    const request = index.openCursor(null, 'prev');
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        entries.push(cursor.value as HistoryEntry);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getHistoryEntry(id: string): Promise<HistoryEntry | null> {
  const result = await withStore<HistoryEntry | undefined>('readonly', (store) =>
    store.get(id) as IDBRequest<HistoryEntry | undefined>
  );
  return result ?? null;
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id) as IDBRequest<unknown>) as unknown as void;
}

export async function clearHistory(): Promise<void> {
  await withStore('readwrite', (store) => store.clear() as IDBRequest<unknown>) as unknown as void;
}

export async function getHistoryCount(): Promise<number> {
  return withStore<number>('readonly', (store) => store.count());
}
