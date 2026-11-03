// The whole Hollow is one versioned save, kept in the browser's database on this device.
import { emptySave, merge, migrate, type Save } from "./engine";

const DB = "thinplace", STORE = "hollow", KEY = "save", PAGES = "pages";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        if (!db.objectStoreNames.contains(PAGES)) db.createObjectStore(PAGES); // pressed pages live apart, so the save stays small
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

let memory: Save | null = null; // fallback when storage is blocked (private windows, previews)

export async function load(): Promise<Save> {
  const db = await open();
  if (!db) return memory ?? emptySave();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result ? migrate(req.result) : emptySave());
    req.onerror = () => resolve(emptySave());
  });
}

export async function save(s: Save): Promise<void> {
  memory = s;
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(JSON.parse(JSON.stringify(s)), KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// Ask the browser not to clear the Hollow under storage pressure.
export async function persist(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function backupName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `MyHollow-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.thinplace`;
}

export function exportBackup(s: Save): void {
  const blob = new Blob([JSON.stringify({ thinplace: 1, save: s })], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Opening a backup blends it into this Hollow rather than replacing it, so nothing is lost.
export async function importBackup(file: File, current: Save): Promise<Save> {
  const raw = JSON.parse(await file.text());
  const incoming = migrate(raw.save ?? raw);
  return merge(current, incoming);
}

// Pressed pages: a photo of a paper journal page, kept on this device under its day.
const pageMemory = new Map<string, string>();
export async function putPage(day: string, dataUrl: string): Promise<void> {
  pageMemory.set(day, dataUrl);
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => { const tx = db.transaction(PAGES, "readwrite"); tx.objectStore(PAGES).put(dataUrl, day); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
}
export async function getPage(day: string): Promise<string | null> {
  const db = await open();
  if (!db) return pageMemory.get(day) ?? null;
  return new Promise((resolve) => { const tx = db.transaction(PAGES, "readonly"); const r = tx.objectStore(PAGES).get(day); r.onsuccess = () => resolve(r.result ?? null); r.onerror = () => resolve(null); });
}
// Shrink a photo to a page-sized JPEG before keeping it.
export async function pressPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 1100 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.72);
  } finally { URL.revokeObjectURL(url); }
}
