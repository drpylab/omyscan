import { expect, test } from "vitest";
import { docsAreaProbe } from "../docsArea.js";
import type { FetchOutcome, ProbeContext } from "../../types.js";

const html200: FetchOutcome = {
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: "text/html", contentTypeMatch: true, bytes: 1000, body: "<html>", oversize: false,
};
const nf: FetchOutcome = {
  url: "u", finalUrl: "u", httpStatus: 404, redirectCount: 0,
  contentTypeActual: "text/html", contentTypeMatch: false, bytes: 0, body: null, oversize: false,
};

test("FP=0: catch-all site (baseline 200) detects NO docs areas", async () => {
  const ctx: ProbeContext = { origin: "https://x", baseUrl: "https://x", fetch: async () => html200 };
  const r = await docsAreaProbe.run(ctx);
  expect(r.signals).toHaveLength(0);
});

test("proper 404 baseline + real /docs → documentation area detected", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async (u) => {
      if (u.includes("__omyscan_nonexistent")) return nf; // baseline = real 404
      if (u.endsWith("/docs")) return html200;
      return nf;
    },
  };
  const r = await docsAreaProbe.run(ctx);
  expect(r.signals.some((s) => s.label === "docs_area" && s.verdict === "detected")).toBe(true);
});
