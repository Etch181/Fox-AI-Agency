export async function completeRegistration<T>(
  register: () => Promise<T | null>,
  onSuccess: (created: T) => void | Promise<void>,
): Promise<T | null> {
  const created = await register();

  if (created === null) {
    return null;
  }

  await onSuccess(created);
  return created;
}
