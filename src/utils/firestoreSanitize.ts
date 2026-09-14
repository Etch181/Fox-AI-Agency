export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const prototype = Object.getPrototypeOf(data);

    // Firestore values such as Timestamp, FieldValue, GeoPoint,
    // Bytes, and DocumentReference must retain their prototypes.
    if (prototype !== Object.prototype && prototype !== null) {
      return data;
    }

    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }

    return cleaned as T;
  }

  return data;
}
