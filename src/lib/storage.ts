export const storageWriteErrorEvent = "thinkleaf-storage-write-error";

export type StorageWriteErrorDetail = {
  key: string;
};

export function safeSetLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Could not save ${key} to localStorage.`, error);
    window.dispatchEvent(
      new CustomEvent<StorageWriteErrorDetail>(storageWriteErrorEvent, {
        detail: { key },
      }),
    );
    return false;
  }
}
