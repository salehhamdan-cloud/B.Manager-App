

export const generateId = (): string => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or non-secure contexts.
  // This is more robust than the previous version and less likely to collide in a single session.
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;
};