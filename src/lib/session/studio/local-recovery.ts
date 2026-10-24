'use client';

import { getFirebaseAuth } from '../firebase';

// Emergency local copies of unsynced Studio text (PRD §10, DECISIONS D5).
//
// - IndexedDB `inkduel-studio-recovery`, one record per {uid, workId, draftId};
// - written only while the editor holds text the server has not confirmed;
// - deleted as soon as the server confirms the same text, after 7 days, on
//   sign-out, or when the author turns the option off;
// - never encrypted and never described as "offline mode": it is a safety
//   net on this device, and the setting says who could read it.
//
// Every call is best effort: a browser without IndexedDB (private mode, old
// engines) simply has no local copy, and the UI never claims one.

const DB_NAME = 'inkduel-studio-recovery';
const STORE = 'drafts';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREF_KEY = (uid: string) => `inkduel-studio-recovery-off:${uid}`;

export type RecoveryRecord = {
  key: string;
  uid: string;
  workId: string;
  draftId: string;
  /** The server revision the local text was typed on top of. */
  baseRevision: number;
  title: string;
  body: string;
  savedAt: number;
};

export const recoveryKey = (uid: string, workId: string, draftId: string) => `${uid}:${workId}:${draftId}`;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('uid', 'uid');
        }
      };
      request.onsuccess = () => {
        sweepExpired(request.result);
        resolve(request.result);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** Drops every copy older than the TTL (once per page, on open). */
function sweepExpired(db: IDBDatabase) {
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const request = tx.objectStore(STORE).openCursor();
    const cutoff = Date.now() - TTL_MS;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const value = cursor.value as Partial<RecoveryRecord>;
      if (typeof value.savedAt !== 'number' || value.savedAt < cutoff) cursor.delete();
      cursor.continue();
    };
  } catch {
    // Best effort: getRecovery still ignores expired copies.
  }
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | null): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const request = work(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(request ? (request.result as T) : null);
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export function recoveryEnabled(uid: string): boolean {
  try {
    return localStorage.getItem(PREF_KEY(uid)) !== '1';
  } catch {
    return true;
  }
}

export async function setRecoveryEnabled(uid: string, enabled: boolean): Promise<void> {
  try {
    if (enabled) localStorage.removeItem(PREF_KEY(uid));
    else localStorage.setItem(PREF_KEY(uid), '1');
  } catch {
    // The preference only lives for this visit.
  }
  if (!enabled) await clearRecoveryFor(uid);
}

/** Resolves true only when the copy really reached IndexedDB. */
export async function putRecovery(record: Omit<RecoveryRecord, 'key' | 'savedAt'>): Promise<boolean> {
  // Never write for an account that is no longer the signed-in one (a timer
  // that fires after sign-out) or that turned the option off.
  if (!recoveryEnabled(record.uid) || getFirebaseAuth()?.currentUser?.uid !== record.uid) return false;
  const full: RecoveryRecord = { ...record, key: recoveryKey(record.uid, record.workId, record.draftId), savedAt: Date.now() };
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(full);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getRecovery(uid: string, workId: string, draftId: string): Promise<RecoveryRecord | null> {
  const record = await run<RecoveryRecord | undefined>('readonly', (s) => s.get(recoveryKey(uid, workId, draftId)));
  if (!record || record.uid !== uid) return null;
  if (Date.now() - record.savedAt > TTL_MS) {
    void removeRecovery(uid, workId, draftId);
    return null;
  }
  return record;
}

export async function removeRecovery(uid: string, workId: string, draftId: string): Promise<void> {
  await run('readwrite', (s) => s.delete(recoveryKey(uid, workId, draftId)));
}

/** Every copy of one account (turning the option off). */
export async function clearRecoveryFor(uid: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const index = tx.objectStore(STORE).index('uid');
      const request = index.openCursor(IDBKeyRange.only(uid));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Sign-out: nothing of anyone stays on the device. */
export async function clearAllRecovery(): Promise<void> {
  await run('readwrite', (s) => s.clear());
}
