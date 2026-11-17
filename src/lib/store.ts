import "server-only";
import { Redis } from "@upstash/redis";
import { EMPTY, SEED, type State } from "@/lib/picker";

/** Where the list, the history and the current pick live: one JSON value. */
export interface Store {
  read(): Promise<State>;
  write(state: State): Promise<void>;
}

const KEY = "picker:state";

function upstash(redis: Redis): Store {
  return {
    async read() {
      const found = await redis.get<State | string>(KEY);
      if (!found) return SEED;
      const state = typeof found === "string" ? JSON.parse(found) : found;
      return { ...EMPTY, ...(state as State) };
    },
    async write(state) {
      await redis.set(KEY, JSON.stringify(state));
    },
  };
}

// For running on a laptop with no Upstash: kept in memory, and gone when the
// server stops.
function memory(): Store {
  let state = SEED;
  return {
    async read() {
      return state;
    },
    async write(next) {
      state = next;
    },
  };
}

const globals = globalThis as { __pickerStore?: Store | null };

/** The store, or null where there is nowhere to keep anything. */
export function getStore(): Store | null {
  if (globals.__pickerStore !== undefined) return globals.__pickerStore;
  const configured =
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);
  globals.__pickerStore = configured
    ? upstash(Redis.fromEnv())
    : process.env.VERCEL
      ? null
      : memory();
  return globals.__pickerStore;
}
