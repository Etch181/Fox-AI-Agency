import type { RequestHandler } from "express";

export function secureAsyncRoute(
  label: string,
  handler: RequestHandler,
): RequestHandler {
  return (request, response, next) => {
    void Promise.resolve(handler(request, response, next)).catch((error) => {
      console.error(
        `[FOX Integration] ${label} failed:`,
        error instanceof Error ? error.message : "unknown error",
      );
      next(error);
    });
  };
}
