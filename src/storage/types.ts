export type Storage<T> = {
  get: (key: string) => Promise<T | null> | T | null;
  getMany: (
    keys: string[]
  ) => Promise<Record<string, T | null>> | Record<string, T | null>;
  query: (query: Record<string, unknown>) => Promise<T[]> | T[];
  set: (key: string, value: T) => Promise<void> | void;
  setMany: (data: Record<string, T>) => Promise<void> | void;
  delete: (key: string) => Promise<void> | void;
};
