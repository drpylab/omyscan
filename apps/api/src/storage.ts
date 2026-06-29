import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hostOf } from "./analytics.js";

// `node:sqlite` is a newer builtin some bundlers don't recognize; load it via the
// runtime builtin registry so it never goes through a module resolver.
const { DatabaseSync } = process.getBuiltinModule("node:sqlite");

export interface LeadInput {
  email: string;
  target?: string | undefined;
  total_findings?: number | undefined;
  visible_findings?: number | undefined;
  locked_findings?: number | undefined;
  is_demo?: boolean | undefined;
  ip?: string | undefined;
  user_agent?: string | undefined;
}

export interface EventInput {
  event: string;
  target?: string | undefined;
  total_findings?: number | undefined;
  visible_findings?: number | undefined;
  locked_findings?: number | undefined;
  is_demo?: boolean | undefined;
  ip?: string | undefined;
  user_agent?: string | undefined;
}

export interface Metrics {
  total_events: number;
  total_leads: number;
  scan_started: number;
  scan_completed: number;
  demo_scan_completed: number;
  unlock_clicked: number;
  early_access_submitted: number;
  unlock_to_email_conversion: number;
  avg_total_findings: number;
  avg_locked_findings: number;
  top_hosts: { host: string; count: number }[];
}

export interface Storage {
  insertLead(r: LeadInput): void;
  insertEvent(e: EventInput): void;
  metrics(): Metrics;
  leadsCsv(): string;
  close(): void;
}

export interface StorageOpts {
  dbPath?: string;
  salt?: string;
}

export function createStorage(opts: StorageOpts = {}): Storage {
  const dbPath = opts.dbPath ?? `${process.env.DATA_DIR ?? "./data"}/omyscan.sqlite`;
  const salt = opts.salt ?? process.env.OMYSCAN_HASH_SALT ?? "omyscan-dev-salt";

  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS early_access_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      target_host TEXT,
      target_url_hash TEXT,
      total_findings INTEGER,
      visible_findings INTEGER,
      locked_findings INTEGER,
      is_demo INTEGER,
      created_at TEXT NOT NULL,
      ip_hash TEXT,
      user_agent_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      target_host TEXT,
      total_findings INTEGER,
      visible_findings INTEGER,
      locked_findings INTEGER,
      is_demo INTEGER,
      created_at TEXT NOT NULL,
      ip_hash TEXT,
      user_agent_hash TEXT
    );
  `);

  const hash = (v: string | undefined): string | null =>
    v == null || v === "" ? null : createHash("sha256").update(`${salt}:${v}`).digest("hex");
  const now = () => new Date().toISOString();
  const bool = (b: boolean | undefined) => (b ? 1 : 0);
  const num = (n: number | undefined) => (typeof n === "number" ? n : null);

  const leadStmt = db.prepare(
    `INSERT INTO early_access_leads
       (email, target_host, target_url_hash, total_findings, visible_findings, locked_findings, is_demo, created_at, ip_hash, user_agent_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const eventStmt = db.prepare(
    `INSERT INTO analytics_events
       (event, target_host, total_findings, visible_findings, locked_findings, is_demo, created_at, ip_hash, user_agent_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  return {
    insertLead(r) {
      leadStmt.run(
        r.email.trim().toLowerCase(),
        hostOf(r.target ?? "") ?? null,
        hash(r.target), // full URL hashed, never stored raw
        num(r.total_findings), num(r.visible_findings), num(r.locked_findings),
        bool(r.is_demo), now(), hash(r.ip), hash(r.user_agent),
      );
    },
    insertEvent(e) {
      eventStmt.run(
        e.event,
        hostOf(e.target ?? "") ?? null, // hostname only — never raw URL/query
        num(e.total_findings), num(e.visible_findings), num(e.locked_findings),
        bool(e.is_demo), now(), hash(e.ip), hash(e.user_agent),
      );
    },
    metrics() {
      const count = (sql: string, ...p: unknown[]) =>
        Number((db.prepare(sql).get(...(p as never[])) as { c: number }).c);
      const total_events = count("SELECT COUNT(*) c FROM analytics_events");
      const total_leads = count("SELECT COUNT(*) c FROM early_access_leads");
      const byEvent = (ev: string) => count("SELECT COUNT(*) c FROM analytics_events WHERE event = ?", ev);
      const scan_started = byEvent("scan_started");
      const scan_completed = byEvent("scan_completed");
      const demo_scan_completed = count(
        "SELECT COUNT(*) c FROM analytics_events WHERE event = 'scan_completed' AND is_demo = 1",
      );
      const unlock_clicked = byEvent("unlock_clicked");
      const early_access_submitted = byEvent("early_access_submitted");
      const avg = (col: string) =>
        Math.round(
          ((db.prepare(`SELECT AVG(${col}) a FROM analytics_events WHERE event = 'scan_completed'`).get() as { a: number | null }).a ?? 0) * 10,
        ) / 10;
      const top_hosts = (
        db.prepare(
          "SELECT target_host host, COUNT(*) count FROM analytics_events WHERE target_host IS NOT NULL GROUP BY target_host ORDER BY count DESC LIMIT 10",
        ).all() as { host: string; count: number }[]
      ).map((r) => ({ host: r.host, count: Number(r.count) }));
      return {
        total_events, total_leads, scan_started, scan_completed, demo_scan_completed,
        unlock_clicked, early_access_submitted,
        unlock_to_email_conversion: unlock_clicked > 0 ? Math.round((early_access_submitted / unlock_clicked) * 100) / 100 : 0,
        avg_total_findings: avg("total_findings"),
        avg_locked_findings: avg("locked_findings"),
        top_hosts,
      };
    },
    leadsCsv() {
      const rows = db.prepare(
        "SELECT id, email, target_host, total_findings, visible_findings, locked_findings, is_demo, created_at FROM early_access_leads ORDER BY id",
      ).all() as Record<string, unknown>[];
      const cols = ["id", "email", "target_host", "total_findings", "visible_findings", "locked_findings", "is_demo", "created_at"];
      const esc = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    },
    close() {
      db.close();
    },
  };
}
