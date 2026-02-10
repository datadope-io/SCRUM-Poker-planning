export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function isValidUuid(id: string): boolean {
  return id && typeof id === 'string' && id.length > 0;
}
