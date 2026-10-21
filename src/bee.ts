// Bee stream consumer and a minimal REST client.
// Adapted from Rhubarb (https://github.com/OJ-IRO/rhubarb-tools-competition, packages/core/src/bee.ts),
// Copyright (c) 2026 Rhubarb contributors, MIT License. Changes: no constructor parameter
// properties (Node's type stripping can't run them), and only the calls Carryover uses.
import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";

/** Any event `bee stream --json` emits after the connect handshake. Shapes vary by `type`. */
export type BeeEvent = { type: string } & Record<string, unknown>;

export interface BeeUtterance {
  id: number;
  sample_id?: string;
  text: string;
  spoken_at: string;
  start: number;
  end: number;
  /** Optional in the type and absent from every live event captured on 2026-09-12. */
  speaker?: string;
}

export interface BeeConversation {
  id: number;
  conversation_uuid: string;
  start_time: string | null;
  end_time: string | null;
  state: string;
  city?: string | null;
  business?: string | null;
  primary_location?: { address?: string; latitude?: number; longitude?: number } | null;
}

const DEFAULT_PROXY = "http://127.0.0.1:8787";
// The proxy 415s on bare application/json; the charset parameter is required.
const JSON_CT = "application/json; charset=utf-8";

export class BeeClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env.BEE_PROXY_URL ?? DEFAULT_PROXY) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": JSON_CT } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Bee API ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  me(): Promise<{ id: number; first_name: string; timezone: string }> {
    return this.request("GET", "/v1/me");
  }

  /** The only way to reach the wearer: a todo whose alarm fires on their (even locked) phone. */
  createTodo(text: string, alarmAtIso?: string): Promise<{ id: number }> {
    return this.request("POST", "/v1/todos", alarmAtIso ? { text, alarm_at: alarmAtIso } : { text });
  }

  /** Durable changefeed: ids changed since the cursor. The at-most-once stream's safety net. */
  changes(cursor?: string): Promise<{ conversations: number[]; next_cursor: string }> {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request("GET", `/v1/changes${q}`);
  }

  /** Full conversation, for checking whether surviving transcripts carry speaker labels. */
  getConversation(id: number): Promise<Record<string, unknown>> {
    return this.request("GET", `/v1/conversations/${id}`);
  }
}

export type StreamState = "connecting" | "connected" | "down";

export interface StreamConsumerOptions {
  onEvent: (ev: BeeEvent) => void;
  onStatus?: (msg: string) => void;
  onState?: (state: StreamState) => void;
  maxBackoffMs?: number;
}

/**
 * Runs `bee stream --json` as a child process and emits typed events. The CLI owns auth and the
 * private-CA TLS, which makes it the most robust transport. Delivery is at-most-once.
 */
export class BeeStreamConsumer {
  private readonly opts: StreamConsumerOptions;
  private child: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private stopped = false;
  private backoffMs = 1_000;

  constructor(opts: StreamConsumerOptions) {
    this.opts = opts;
  }

  start(): void {
    this.stopped = false;
    this.spawnOnce();
  }

  stop(): void {
    this.stopped = true;
    this.child?.kill("SIGTERM");
    this.child = null;
  }

  private spawnOnce(): void {
    if (this.stopped) return;
    this.opts.onStatus?.("spawning bee stream");
    this.opts.onState?.("connecting");
    const child = spawn("bee", ["stream", "--json"], { stdio: ["ignore", "pipe", "pipe"] });
    this.child = child;

    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const ev = parseEventLine(line);
      if (ev === "handshake") {
        this.backoffMs = 1_000;
        this.opts.onStatus?.("stream connected");
        this.opts.onState?.("connected");
        return;
      }
      if (!ev) return;
      // One malformed event, or a database hiccup while handling it, must not take the daemon down.
      try {
        this.opts.onEvent(ev);
      } catch (e) {
        this.opts.onStatus?.(`event dropped (${ev.type}): ${(e as Error).message}`);
      }
    });

    child.stderr.on("data", (d: Buffer) => this.opts.onStatus?.(`bee stream stderr: ${d.toString().trim()}`));

    // A spawn failure (bee not on PATH) emits "error" and may never emit "exit". Restart once per child.
    let restarted = false;
    const restart = (why: string) => {
      rl.close();
      if (this.stopped || restarted) return;
      restarted = true;
      if (this.child === child) this.child = null;
      this.opts.onState?.("down");
      this.opts.onStatus?.(`bee stream ${why}; restarting in ${this.backoffMs}ms`);
      setTimeout(() => this.spawnOnce(), this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, this.opts.maxBackoffMs ?? 60_000);
    };
    child.on("error", (e) => restart(`failed to run (${e.message})`));
    child.on("exit", (code) => restart(`exited (${code})`));
  }
}

/**
 * One line of `bee stream --json` output, or of a captured log (which prefixes a timestamp).
 * The connect handshake is a bare `{timestamp}` with no `type`; every other event has one.
 */
export function parseEventLine(line: string): BeeEvent | "handshake" | null {
  const at = line.indexOf("{");
  if (at < 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line.slice(at));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const ev = parsed as Record<string, unknown>;
  if (typeof ev.type !== "string") return "handshake";
  return ev as BeeEvent;
}
