export function createAuditLogId(
  randomUUID: () => string = () => crypto.randomUUID(),
): string {
  return `LOG-${randomUUID()}`;
}
