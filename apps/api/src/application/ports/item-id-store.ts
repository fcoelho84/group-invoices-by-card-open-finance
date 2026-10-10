export const ITEM_ID_STORE = Symbol('ITEM_ID_STORE');

export interface ItemIdStore {
  get(userId: string): Promise<string | null>;
  save(userId: string, itemId: string): Promise<void>;
}
