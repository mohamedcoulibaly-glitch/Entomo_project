/**
 * Stockage hors-ligne IndexedDB pour la file de synchronisation locale.
 */
if (!window.OfflineStore) {
const OfflineStore = (() => {
  const DB_NAME = 'entomo-offline-db';
  const STORE_NAME = 'sync_queue';
  const DB_VERSION = 1;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'local_id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function withStore(mode, handler) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = handler(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    async list() {
      return withStore('readonly', store => new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      }));
    },
    async put(item) {
      return withStore('readwrite', store => store.put({
        ...item,
        cached_at: new Date().toISOString(),
      }));
    },
    async clear() {
      return withStore('readwrite', store => store.clear());
    },
    async remove(localId) {
      return withStore('readwrite', store => store.delete(localId));
    },
    async purgeExpired(maxAgeHours = 72) {
      const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
      const items = await this.list();
      for (const item of items) {
        const cached = item.cached_at ? Date.parse(item.cached_at) : 0;
        if (cached && cached < cutoff) {
          await this.remove(item.local_id);
        }
      }
    },
  };
})();

window.OfflineStore = OfflineStore;
}
