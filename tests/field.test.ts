import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { bearing, interpolatePosition } from "../src/lib/geo";
import {
  parseVehicleCredential,
  vehicleCredential,
} from "../src/lib/vehicle-credential";
import {
  createVault,
  unlockVault,
  readVault,
  writeVault,
  vaultMeta,
} from "../src/lib/offline-vault";

describe("vehicle fuel pass boundary", () => {
  const token = "68be9fea-1841-4dc9-9e85-1209dc2176cd";
  it("accepts issued and legacy passes but rejects payment links and plates", () => {
    expect(parseVehicleCredential(vehicleCredential(token))).toBe(token);
    expect(parseVehicleCredential(token.toUpperCase())).toBe(token);
    for (const input of [
      "KHI-102",
      `https://example.com/${token}`,
      `payment:${token}`,
      "not-a-pass",
    ])
      expect(() => parseVehicleCredential(input)).toThrow("owner-issued");
  });
});
describe("reported truck positions", () => {
  it("crosses the antimeridian along the shortest path and never extrapolates", () => {
    const a = { latitude: 10, longitude: 179 },
      b = { latitude: 12, longitude: -179 };
    expect(interpolatePosition(a, b, 0.5)).toEqual({
      latitude: 11,
      longitude: -180,
    });
    expect(interpolatePosition(a, b, 2)).toEqual(b);
    expect(interpolatePosition(a, b, -2)).toEqual(a);
    expect(
      bearing({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }),
    ).toBeCloseTo(90);
  });
});

async function rawStore(action: (store: IDBObjectStore) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("pumpshield-field-v1", 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("vault", "readwrite");
      action(tx.objectStore("vault"));
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}
describe("encrypted field storage", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  it("requires the separate passphrase and preserves an existing workspace", async () => {
    const session = await createVault(
      "four uncommon words together",
      "user-a",
      "workspace-a",
      { station: "Station A" },
    );
    await writeVault(session, "draft:one", {
      vehicle: "KHI-123",
      photo: "private camera data",
    });
    await expect(unlockVault("an incorrect offline phrase")).rejects.toThrow(
      "did not unlock",
    );
    await expect(
      createVault(
        "another sufficiently long phrase",
        "user-b",
        "workspace-b",
        {},
      ),
    ).rejects.toThrow("already has");
    const unlocked = await unlockVault("four uncommon words together");
    expect(await readVault(unlocked, "draft:one")).toEqual({
      vehicle: "KHI-123",
      photo: "private camera data",
    });
    expect(unlocked.key.extractable).toBe(false);
    expect((await vaultMeta())?.user_id).toBe("user-a");
  });
  it("detects ciphertext replacement across records and tenant identities", async () => {
    const session = await createVault(
      "separate offline station phrase",
      "user-a",
      "workspace-a",
      { station: "Station A" },
    );
    await writeVault(session, "draft:one", { private: "photo" });
    await rawStore((store) => {
      const r = store.get("draft:one");
      r.onsuccess = () => store.put(r.result, "draft:two");
    });
    await expect(readVault(session, "draft:two")).rejects.toThrow();
    await expect(
      readVault(
        { ...session, meta: { ...session.meta, workspace_id: "workspace-b" } },
        "draft:one",
      ),
    ).rejects.toThrow();
  });
});
