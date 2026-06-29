import { afterAll, beforeAll, expect, test } from "vitest";
import { createServer, type Server } from "node:http";
import { createFetcher } from "../fetcher.js";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/json") {
      res.setHeader("content-type", "application/json");
      res.end('{"ok":true}');
    } else if (req.url === "/htmlsoft404") {
      res.setHeader("content-type", "text/html");
      res.end("<html>spa</html>");
    } else if (req.url === "/big") {
      res.setHeader("content-type", "application/json");
      res.end("x".repeat(70000));
    } else if (req.url === "/redir") {
      res.statusCode = 302;
      res.setHeader("location", "/json");
      res.end();
    } else {
      res.statusCode = 404;
      res.end("nf");
    }
  });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => server.close());

test("pinning: html when json expected → no body, mismatch", async () => {
  const f = createFetcher();
  const o = await f(`${base}/htmlsoft404`, "application/json");
  expect(o.contentTypeMatch).toBe(false);
  expect(o.body).toBeNull();
});

test("match: json when json expected → body present", async () => {
  const f = createFetcher();
  const o = await f(`${base}/json`, "application/json");
  expect(o.contentTypeMatch).toBe(true);
  expect(o.body).toBe('{"ok":true}');
});

test("oversize: body over 64KiB rejected", async () => {
  const f = createFetcher();
  const o = await f(`${base}/big`, "application/json");
  expect(o.oversize).toBe(true);
  expect(o.body).toBeNull();
});

test("redirect: follows and reports finalUrl + count", async () => {
  const f = createFetcher();
  const o = await f(`${base}/redir`, "application/json");
  expect(o.redirectCount).toBe(1);
  expect(o.finalUrl).toBe(`${base}/json`);
  expect(o.body).toBe('{"ok":true}');
});
