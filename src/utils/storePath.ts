export function storePath(storeId: number, path: string): string {
  return `/api/v1/stores/${storeId}${path}`;
}
