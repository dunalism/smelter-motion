import { maskGeminiApiKey, validateGeminiApiKeyFormat } from './apiKeyRules';

export type KeyStorageMode = 'persistent' | 'session';

export interface StoredKeyState {
  hasKey: boolean;
  maskedKey: string;
  storageMode: KeyStorageMode;
  encryptedAtRest: boolean;
  savedAt?: number;
}

interface EncryptedVaultRecord {
  v: 1;
  alg: 'AES-GCM';
  iv: string;
  ct: string;
  masked: string;
  savedAt: number;
}

const LOCAL_VAULT_KEY = 'gerakcanvas_gemini_vault_v1';
const SESSION_VAULT_KEY = 'gerakcanvas_gemini_session_vault_v1';
const IDB_NAME = 'gerakcanvas-security-vault';
const IDB_STORE = 'crypto-keys';
const IDB_KEY_ID = 'gemini-api-aes-gcm-v1';

let inMemoryKey: string | null = null;
let inMemoryState: StoredKeyState = {
  hasKey: false,
  maskedKey: '',
  storageMode: 'persistent',
  encryptedAtRest: true,
};
let hydratePromise: Promise<StoredKeyState> | null = null;
const listeners = new Set<(state: StoredKeyState) => void>();

function notifyListeners() {
  for (const cb of listeners) {
    cb(inMemoryState);
  }
}

export function subscribeApiKeyState(cb: (state: StoredKeyState) => void): () => void {
  listeners.add(cb);
  cb(inMemoryState);
  return () => {
    listeners.delete(cb);
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Gagal membuka IndexedDB.'));
  });
}

async function getOrCreateDeviceCryptoKey(): Promise<CryptoKey | null> {
  if (
    typeof window === 'undefined' ||
    !window.crypto?.subtle ||
    typeof indexedDB === 'undefined'
  ) {
    return null;
  }

  try {
    const db = await openKeyDb();
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_KEY_ID);
      getReq.onsuccess = () => resolve(getReq.result as CryptoKey | undefined);
      getReq.onerror = () => reject(getReq.error);
    });

    if (existing) {
      db.close();
      return existing;
    }

    // Non-extractable AES-256-GCM key: raw key bytes cannot be exported via JS
    const created = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const putReq = store.put(created, IDB_KEY_ID);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    db.close();
    return created;
  } catch {
    return null;
  }
}

async function encryptWithDeviceKey(
  plainText: string,
  cryptoKey: CryptoKey
): Promise<{ iv: string; ct: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );
  return {
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(cipherBuf)),
  };
}

async function decryptWithDeviceKey(
  ivB64: string,
  ctB64: string,
  cryptoKey: CryptoKey
): Promise<string> {
  const iv = base64ToBytes(ivB64);
  const ct = base64ToBytes(ctB64);
  const plainBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ct
  );
  return new TextDecoder().decode(plainBuf);
}

function readRawRecord(storage: Storage, key: string): EncryptedVaultRecord | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EncryptedVaultRecord;
    if (parsed && parsed.v === 1 && parsed.alg === 'AES-GCM' && parsed.iv && parsed.ct) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function ensureApiKeyVaultLoaded(): Promise<StoredKeyState> {
  if (typeof window === 'undefined') return inMemoryState;
  if (inMemoryKey) return inMemoryState;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const sessionRec = readRawRecord(window.sessionStorage, SESSION_VAULT_KEY);
      const localRec = readRawRecord(window.localStorage, LOCAL_VAULT_KEY);
      const activeRec = sessionRec || localRec;
      const mode: KeyStorageMode = sessionRec ? 'session' : 'persistent';

      if (!activeRec) {
        inMemoryState = {
          hasKey: false,
          maskedKey: '',
          storageMode: 'persistent',
          encryptedAtRest: true,
        };
        notifyListeners();
        return inMemoryState;
      }

      const cryptoKey = await getOrCreateDeviceCryptoKey();
      if (!cryptoKey) {
        return inMemoryState;
      }

      const decrypted = await decryptWithDeviceKey(activeRec.iv, activeRec.ct, cryptoKey);
      const validation = validateGeminiApiKeyFormat(decrypted);
      if (!validation.valid) {
        // Corrupted or tampered record: wipe immediately
        window.localStorage.removeItem(LOCAL_VAULT_KEY);
        window.sessionStorage.removeItem(SESSION_VAULT_KEY);
        inMemoryKey = null;
        inMemoryState = {
          hasKey: false,
          maskedKey: '',
          storageMode: 'persistent',
          encryptedAtRest: true,
        };
        notifyListeners();
        return inMemoryState;
      }

      inMemoryKey = validation.normalized;
      inMemoryState = {
        hasKey: true,
        maskedKey: activeRec.masked || maskGeminiApiKey(validation.normalized),
        storageMode: mode,
        encryptedAtRest: true,
        savedAt: activeRec.savedAt,
      };
      notifyListeners();
      return inMemoryState;
    } catch {
      // Decryption failed (e.g. device key reset); remove stale ciphertext safely
      try {
        window.localStorage.removeItem(LOCAL_VAULT_KEY);
        window.sessionStorage.removeItem(SESSION_VAULT_KEY);
      } catch {
        // ignore
      }
      inMemoryKey = null;
      inMemoryState = {
        hasKey: false,
        maskedKey: '',
        storageMode: 'persistent',
        encryptedAtRest: true,
      };
      notifyListeners();
      return inMemoryState;
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export async function saveGeminiApiKey(
  rawKey: string,
  storageMode: KeyStorageMode
): Promise<StoredKeyState> {
  const check = validateGeminiApiKeyFormat(rawKey);
  if (!check.valid) {
    throw new Error(check.error || 'Format API Key Gemini tidak valid.');
  }

  const normalized = check.normalized;
  const masked = maskGeminiApiKey(normalized);
  const savedAt = Date.now();

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LOCAL_VAULT_KEY);
    window.sessionStorage.removeItem(SESSION_VAULT_KEY);

    const cryptoKey = await getOrCreateDeviceCryptoKey();
    if (cryptoKey) {
      const { iv, ct } = await encryptWithDeviceKey(normalized, cryptoKey);
      const record: EncryptedVaultRecord = {
        v: 1,
        alg: 'AES-GCM',
        iv,
        ct,
        masked,
        savedAt,
      };
      const targetStorage =
        storageMode === 'session' ? window.sessionStorage : window.localStorage;
      const targetKey = storageMode === 'session' ? SESSION_VAULT_KEY : LOCAL_VAULT_KEY;
      targetStorage.setItem(targetKey, JSON.stringify(record));

      inMemoryKey = normalized;
      inMemoryState = {
        hasKey: true,
        maskedKey: masked,
        storageMode,
        encryptedAtRest: true,
        savedAt,
      };
      notifyListeners();
      return inMemoryState;
    }
  }

  // Fallback: memory-only without writing plaintext to Web Storage
  inMemoryKey = normalized;
  inMemoryState = {
    hasKey: true,
    maskedKey: masked,
    storageMode: 'session',
    encryptedAtRest: false,
    savedAt,
  };
  notifyListeners();
  return inMemoryState;
}

export function clearGeminiApiKey(): StoredKeyState {
  inMemoryKey = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LOCAL_VAULT_KEY);
      window.sessionStorage.removeItem(SESSION_VAULT_KEY);
    } catch {
      // ignore
    }
  }
  inMemoryState = {
    hasKey: false,
    maskedKey: '',
    storageMode: 'persistent',
    encryptedAtRest: true,
  };
  notifyListeners();
  return inMemoryState;
}

export function getActiveGeminiApiKey(): string | null {
  return inMemoryKey;
}

export function getApiKeyStateSnapshot(): StoredKeyState {
  return inMemoryState;
}
