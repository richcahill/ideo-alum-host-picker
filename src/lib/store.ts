import "server-only";
import { Redis } from "@upstash/redis";
import { EMPTY, HOME, SEED, type Place, type State } from "@/lib/picker";

/**
 * Where everything lives: one JSON value per location, holding its people,
 * history and current pick, and one more listing the locations people added.
 */
export interface Store {
  read(slug: string): Promise<State>;
  write(slug: string, state: State): Promise<void>;
  /** Every location, London first. */
  places(): Promise<Place[]>;
  /** Saves the locations people have added; London is never in this list. */
  savePlaces(added: Place[]): Promise<void>;
  remove(slug: string): Promise<void>;
  /** How many times the wheel has been spun, across every location. */
  spins(): Promise<number>;
  countSpin(): Promise<void>;
}

// London was the only location at first, so it keeps the original key.
const key = (slug: string) =>
  slug === HOME.slug ? "picker:state" : `picker:state:${slug}`;
const PLACES = "picker:places";
const SPINS = "picker:spins";
// Spins made before anyone was counting.
const EARLIER_SPINS = 34;

const parse = <T>(found: T | string) =>
  typeof found === "string" ? (JSON.parse(found) as T) : found;

// London starts with the group's names; anywhere else starts empty.
const fresh = (slug: string) => (slug === HOME.slug ? SEED : EMPTY);

function upstash(redis: Redis): Store {
  return {
    async read(slug) {
      const found = await redis.get<State | string>(key(slug));
      return found ? { ...EMPTY, ...parse(found) } : fresh(slug);
    },
    async write(slug, state) {
      await redis.set(key(slug), JSON.stringify(state));
    },
    async places() {
      const found = await redis.get<Place[] | string>(PLACES);
      return [HOME, ...(found ? parse(found) : [])];
    },
    async savePlaces(added) {
      await redis.set(PLACES, JSON.stringify(added));
    },
    async remove(slug) {
      await redis.del(key(slug));
    },
    async spins() {
      return EARLIER_SPINS + Number((await redis.get<number>(SPINS)) ?? 0);
    },
    async countSpin() {
      await redis.incr(SPINS);
    },
  };
}

// For running on a laptop with no Upstash: kept in memory, and gone when the
// server stops.
function memory(): Store {
  const states = new Map<string, State>();
  let added: Place[] = [];
  let spun = 0;
  return {
    async read(slug) {
      return states.get(slug) ?? fresh(slug);
    },
    async write(slug, state) {
      states.set(slug, state);
    },
    async places() {
      return [HOME, ...added];
    },
    async savePlaces(next) {
      added = next;
    },
    async remove(slug) {
      states.delete(slug);
    },
    async spins() {
      return EARLIER_SPINS + spun;
    },
    async countSpin() {
      spun += 1;
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
