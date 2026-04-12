import type { AIMessage } from "../types";
import { safeJsonParse } from "./helpers";

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export interface AICacheSnapshot {
  messages: AIMessage[];
  input: string;
  updatedAt: number;
}

const memoryStore = new Map<string, string>();
let asyncStoragePromise: Promise<StorageLike | null> | null = null;

async function resolveStorage(): Promise<StorageLike | null> {
  if (!asyncStoragePromise) {
    asyncStoragePromise = import("@react-native-async-storage/async-storage")
      .then((module) => (module.default ?? module) as StorageLike)
      .catch(() => null);
  }

  return asyncStoragePromise;
}

async function readRaw(key: string): Promise<string | null> {
  const storage = await resolveStorage();

  if (storage) {
    return storage.getItem(key);
  }

  return memoryStore.get(key) ?? null;
}

async function writeRaw(key: string, value: string): Promise<void> {
  const storage = await resolveStorage();

  if (storage) {
    await storage.setItem(key, value);
    return;
  }

  memoryStore.set(key, value);
}

async function deleteRaw(key: string): Promise<void> {
  const storage = await resolveStorage();

  if (storage) {
    await storage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
}

export async function loadCache<T extends AICacheSnapshot>(
  key: string,
): Promise<T | null> {
  const raw = await readRaw(key);

  if (!raw) {
    return null;
  }

  return safeJsonParse<T | null>(raw, null);
}

export async function saveCache(
  key: string,
  snapshot: AICacheSnapshot,
): Promise<void> {
  await writeRaw(key, JSON.stringify(snapshot));
}

export async function clearCache(key: string): Promise<void> {
  await deleteRaw(key);
}
