export interface SaveStore<T> {
  has(key: string): Promise<boolean>;
  load(key: string): Promise<T | null>;
  save(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export const localSaveStore: SaveStore<unknown> = {
  async has(key) {
    try {
      return window.localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },

  async load(key) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? null : JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  },

  async save(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key) {
    window.localStorage.removeItem(key);
  },
};
