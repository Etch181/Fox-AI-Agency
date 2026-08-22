import { auth } from "./firebase";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const idToken = await user.getIdToken();

  const headers = new Headers(
    init.headers || {}
  );

  headers.set(
    "Authorization",
    `Bearer ${idToken}`
  );

  if (
    init.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
