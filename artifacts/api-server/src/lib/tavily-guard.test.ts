import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { fakeStore, makeFakeDb } = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const cache = new Map<string, Row>();
  const usage = new Map<string, Row>();

  const cacheKeyOf = (r: Row) => `${r["endpoint"] as string}|${r["normalizedQuery"] as string}`;
  const usageKeyOf = (r: Row) => `${r["kind"] as string}|${r["key"] as string}`;

  type Cond =
    | { type: "eq"; name: string; val: unknown }
    | { type: "and"; conds: Cond[] }
    | null
    | undefined;

  const evalCond = (cond: Cond, row: Row): boolean => {
    if (!cond) return true;
    if (cond.type === "and") return cond.conds.every((c) => evalCond(c, row));
    if (cond.type === "eq") return row[cond.name] === cond.val;
    return true;
  };

  type State = {
    op: "select" | "insert" | "delete" | "update";
    table: { __t: string } | null;
    where: Cond;
    limit?: number;
    values?: Row | Row[];
    set?: Row;
    returning: boolean;
    onConflict: null | "nothing" | { type: "update"; set: Row };
  };

  const storeFor = (table: { __t: string } | null) =>
    table?.__t === "cache" ? cache : usage;
  const keyOf = (table: { __t: string } | null, r: Row) =>
    table?.__t === "cache" ? cacheKeyOf(r) : usageKeyOf(r);

  const execute = (s: State): unknown => {
    const store = storeFor(s.table);
    if (s.op === "select") {
      const rows = [...store.values()].filter((r) => evalCond(s.where, r));
      return s.limit !== undefined ? rows.slice(0, s.limit) : rows;
    }
    if (s.op === "insert") {
      const vals = Array.isArray(s.values) ? s.values : [s.values as Row];
      for (const v of vals) {
        const k = keyOf(s.table, v);
        const existing = store.get(k);
        const row: Row = { ...v };
        if (s.table?.__t === "cache" && row["createdAt"] === undefined) {
          row["createdAt"] = new Date();
        }
        if (s.table?.__t === "usage" && row["updatedAt"] === undefined) {
          row["updatedAt"] = new Date();
        }
        if (existing) {
          if (s.onConflict === "nothing") continue;
          if (s.onConflict && typeof s.onConflict === "object") {
            store.set(k, { ...existing, ...s.onConflict.set });
          } else {
            store.set(k, row);
          }
        } else {
          store.set(k, row);
        }
      }
      return undefined;
    }
    if (s.op === "delete") {
      for (const [k, r] of [...store.entries()]) {
        if (evalCond(s.where, r)) store.delete(k);
      }
      return undefined;
    }
    if (s.op === "update") {
      const out: Row[] = [];
      for (const [k, r] of store.entries()) {
        if (!evalCond(s.where, r)) continue;
        const updated: Row = { ...r };
        for (const [field, fv] of Object.entries(s.set ?? {})) {
          if (fv && typeof fv === "object" && (fv as { __sql?: boolean }).__sql) {
            updated[field] = ((updated[field] as number) ?? 0) + 1;
          } else {
            updated[field] = fv as unknown;
          }
        }
        store.set(k, updated);
        out.push(updated);
      }
      return s.returning ? out : undefined;
    }
    return undefined;
  };

  const makeBuilder = (op: State["op"], table: { __t: string } | null) => {
    const state: State = {
      op,
      table,
      where: null,
      returning: false,
      onConflict: null,
    };
    const builder: Record<string, unknown> = {
      from(t: { __t: string }) {
        state.table = t;
        return builder;
      },
      where(c: Cond) {
        state.where = c;
        return builder;
      },
      limit(n: number) {
        state.limit = n;
        return builder;
      },
      for(_mode: string) {
        return builder;
      },
      values(v: Row | Row[]) {
        state.values = v;
        return builder;
      },
      set(v: Row) {
        state.set = v;
        return builder;
      },
      onConflictDoNothing(_o: unknown) {
        state.onConflict = "nothing";
        return builder;
      },
      onConflictDoUpdate(o: { set: Row }) {
        state.onConflict = { type: "update", set: o.set };
        return builder;
      },
      returning(_o?: unknown) {
        state.returning = true;
        return builder;
      },
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        try {
          resolve(execute(state));
        } catch (e) {
          reject(e);
        }
      },
    };
    return builder;
  };

  const makeFakeDb = () => {
    const fakeDb = {
      select: (_cols?: unknown) => makeBuilder("select", null),
      insert: (t: { __t: string }) => makeBuilder("insert", t),
      delete: (t: { __t: string }) => makeBuilder("delete", t),
      update: (t: { __t: string }) => makeBuilder("update", t),
      transaction: async <T,>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(fakeDb),
    };
    return fakeDb;
  };

  return { fakeStore: { cache, usage }, makeFakeDb };
});

vi.mock("drizzle-orm", () => ({
  eq: (col: { __c: string }, val: unknown) => ({ type: "eq", name: col.__c, val }),
  and: (...conds: unknown[]) => ({ type: "and", conds }),
  sql: (strings: TemplateStringsArray, ...vals: unknown[]) => ({
    __sql: true,
    strings: [...strings],
    vals,
  }),
}));

vi.mock("@workspace/db", () => {
  const liveSearchCacheTable: Record<string, unknown> = { __t: "cache" };
  for (const c of ["endpoint", "normalizedQuery", "result", "createdAt"]) {
    liveSearchCacheTable[c] = { __c: c };
  }
  const liveSearchUsageTable: Record<string, unknown> = { __t: "usage" };
  for (const c of ["kind", "key", "lastCallAt", "count", "updatedAt"]) {
    liveSearchUsageTable[c] = { __c: c };
  }
  return {
    db: makeFakeDb(),
    liveSearchCacheTable,
    liveSearchUsageTable,
  };
});

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import type { Request } from "express";
import type { TavilyResult } from "./tavily";

type GuardModule = typeof import("./tavily-guard");
let guard: GuardModule;

const sampleResult: TavilyResult = {
  answer: "hello",
  citations: [{ url: "https://example.com", title: "Example" }],
};

const makeReq = (id: string): Request =>
  ({ user: { id } }) as unknown as Request;

beforeAll(async () => {
  // DAILY_CAP is captured at module load — set before importing.
  process.env["TAVILY_DAILY_CAP"] = "2";
  guard = await import("./tavily-guard");
});

beforeEach(() => {
  fakeStore.cache.clear();
  fakeStore.usage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("guardedTavilyCall", () => {
  it("returns cached result on identical second query without invoking Tavily", async () => {
    const call = vi.fn(async () => sampleResult);
    const opts = {
      req: makeReq("u1"),
      endpoint: "search",
      cacheKey: "  Best  Coffee in Tokyo ",
      call,
    };

    const first = await guard.guardedTavilyCall(opts);
    expect(first.ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(1);

    // Same normalized query from a *different* user — should still be a cache hit
    // (cache is keyed by endpoint + normalized query, not user) and must not
    // trigger the cooldown for u1.
    const second = await guard.guardedTavilyCall({
      ...opts,
      req: makeReq("u2"),
      cacheKey: "best coffee in tokyo",
    });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.result).toEqual(sampleResult);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when the same user calls again within the 10s cooldown", async () => {
    const call = vi.fn(async () => sampleResult);
    const req = makeReq("u1");

    const first = await guard.guardedTavilyCall({
      req,
      endpoint: "search",
      cacheKey: "query one",
      call,
    });
    expect(first.ok).toBe(true);

    // Different cacheKey to avoid cache hit; advance only 5s — still in cooldown.
    vi.setSystemTime(new Date("2026-01-15T12:00:05.000Z"));
    const second = await guard.guardedTavilyCall({
      req,
      endpoint: "search",
      cacheKey: "query two",
      call,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.status).toBe(429);
      expect(second.error).toMatch(/wait/i);
    }
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("returns 429 once the daily cap is exceeded", async () => {
    const call = vi.fn(async () => sampleResult);

    // Cap is 2 (set in beforeAll). Use distinct users so each call passes the
    // per-user cooldown check, and distinct cache keys to force live calls.
    const r1 = await guard.guardedTavilyCall({
      req: makeReq("u1"),
      endpoint: "search",
      cacheKey: "alpha",
      call,
    });
    expect(r1.ok).toBe(true);

    const r2 = await guard.guardedTavilyCall({
      req: makeReq("u2"),
      endpoint: "search",
      cacheKey: "beta",
      call,
    });
    expect(r2.ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);

    const r3 = await guard.guardedTavilyCall({
      req: makeReq("u3"),
      endpoint: "search",
      cacheKey: "gamma",
      call,
    });
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.status).toBe(429);
      expect(r3.error).toMatch(/daily/i);
    }
    // Tavily must not have been called for the over-cap request.
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("rolls the cap over after 24h (new UTC day)", async () => {
    const call = vi.fn(async () => sampleResult);

    // Burn the daily cap of 2 on day 1.
    await guard.guardedTavilyCall({
      req: makeReq("u1"),
      endpoint: "search",
      cacheKey: "alpha",
      call,
    });
    await guard.guardedTavilyCall({
      req: makeReq("u2"),
      endpoint: "search",
      cacheKey: "beta",
      call,
    });
    const blocked = await guard.guardedTavilyCall({
      req: makeReq("u3"),
      endpoint: "search",
      cacheKey: "gamma",
      call,
    });
    expect(blocked.ok).toBe(false);
    expect(call).toHaveBeenCalledTimes(2);

    // Advance > 24h to cross into the next UTC calendar day. This also moves
    // every user past the 10s cooldown.
    vi.setSystemTime(new Date("2026-01-16T12:00:01.000Z"));

    const next = await guard.guardedTavilyCall({
      req: makeReq("u3"),
      endpoint: "search",
      cacheKey: "delta",
      call,
    });
    expect(next.ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(3);
  });
});
