// Only encrypted context/drafts and non-secret KDF metadata are persisted.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export type VaultMeta = {
  version: 1;
  user_id: string;
  workspace_id: string;
  salt: string;
  iterations: number;
  check: Sealed;
};
type Sealed = { iv: string; body: string };
export type VaultSession = { key: CryptoKey; meta: VaultMeta };
const DB = "pumpshield-field-v1";
const STORE = "vault";
function encode(bytes: Uint8Array) {
  let value = "";
  for (let i = 0; i < bytes.length; i += 8192)
    value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
function decode(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Encrypted device storage is unavailable. Check private browsing or available space.",
        ),
      );
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(
        new Error(
          "Unable to save encrypted data. Free device storage, then try again.",
        ),
      );
    };
    transaction.onabort = () => {
      db.close();
      reject(
        new Error(
          "Device storage could not complete the save. Your previous records were kept.",
        ),
      );
    };
  });
}
function aad(meta: VaultMeta, id: string) {
  return encoder.encode(
    `PumpShield|1|${meta.user_id}|${meta.workspace_id}|${id}`,
  );
}
async function derive(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function seal(
  value: unknown,
  key: CryptoKey,
  additionalData: Uint8Array,
): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData as BufferSource },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return { iv: encode(iv), body: encode(new Uint8Array(body)) };
}
async function open<T>(
  value: Sealed,
  key: CryptoKey,
  additionalData: Uint8Array,
): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decode(value.iv) as BufferSource,
      additionalData: additionalData as BufferSource,
    },
    key,
    decode(value.body) as BufferSource,
  );
  return JSON.parse(decoder.decode(plain)) as T;
}
export const vaultMeta = () =>
  operation<VaultMeta | undefined>("readonly", (s) => s.get("meta"));
export async function createVault(
  passphrase: string,
  user_id: string,
  workspace_id: string,
  context: unknown,
): Promise<VaultSession> {
  if (passphrase.length < 12)
    throw new Error("Use an offline passphrase of at least 12 characters.");
  if (await vaultMeta())
    throw new Error(
      "This device already has an offline workspace. Unlock it or remove it first.",
    );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 600000;
  const key = await derive(passphrase, salt, iterations);
  const meta: VaultMeta = {
    version: 1,
    user_id,
    workspace_id,
    salt: encode(salt),
    iterations,
    check: { iv: "", body: "" },
  };
  meta.check = await seal(
    "PumpShield offline workspace",
    key,
    aad(meta, "check"),
  );
  const encrypted = await seal(context, key, aad(meta, "context"));
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.add(meta, "meta");
    store.add(encrypted, "context");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Could not prepare this device. No existing workspace was overwritten.",
        ),
      );
    };
  });
  return { key, meta };
}
export async function unlockVault(passphrase: string): Promise<VaultSession> {
  const meta = await vaultMeta();
  if (!meta || meta.version !== 1)
    throw new Error("Prepare this device online first.");
  if (meta.iterations !== 600000)
    throw new Error(
      "Unsupported offline workspace. Connect and review this device.",
    );
  try {
    const key = await derive(passphrase, decode(meta.salt), meta.iterations);
    if (
      (await open<string>(meta.check, key, aad(meta, "check"))) !==
      "PumpShield offline workspace"
    )
      throw new Error();
    return { key, meta };
  } catch {
    throw new Error("The offline passphrase did not unlock this device.");
  }
}
export async function readVault<T>(
  session: VaultSession,
  id: string,
): Promise<T | undefined> {
  const value = await operation<Sealed | undefined>("readonly", (s) =>
    s.get(id),
  );
  return value ? open<T>(value, session.key, aad(session.meta, id)) : undefined;
}
export async function writeVault(
  session: VaultSession,
  id: string,
  value: unknown,
) {
  const encrypted = await seal(value, session.key, aad(session.meta, id));
  if (encrypted.body.length > 12000000)
    throw new Error(
      "This record contains too many large photos. Capture smaller photos or submit it online.",
    );
  await operation("readwrite", (s) => s.put(encrypted, id));
}
export async function deleteVaultRecord(id: string) {
  await operation("readwrite", (s) => s.delete(id));
}
export async function vaultDrafts<T>(session: VaultSession): Promise<T[]> {
  const keys = await operation<IDBValidKey[]>("readonly", (s) =>
    s.getAllKeys(),
  );
  const items = [];
  for (const id of keys.filter((k) => String(k).startsWith("draft:"))) {
    const value = await readVault<T>(session, String(id));
    if (value) items.push(value);
  }
  return items;
}
export async function forgetVault() {
  await operation("readwrite", (s) => s.clear());
}
