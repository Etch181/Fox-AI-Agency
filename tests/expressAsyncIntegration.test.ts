import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";

import "express-async-errors";
import express from "express";

test("bare Express 4 async route reaches sanitized error middleware", async () => {
  const app = express();
  app.get("/failure", async () => {
    throw new Error("sensitive provider detail");
  });
  app.use((error: unknown, _req: any, res: any, _next: any) => {
    assert.equal((error as Error).message, "sensitive provider detail");
    res.status(500).json({ error: "Internal server error" });
  });

  const server = http.createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/failure`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal server error" });
  } finally {
    server.close();
    await once(server, "close");
  }
});
