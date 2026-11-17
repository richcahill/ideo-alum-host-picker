export type Person = { id: string; name: string };

export type Meetup = {
  id: string;
  /** Kept as a name, so history survives someone leaving the list. */
  organizer: string;
  /** The day of the meetup, as YYYY-MM-DD. */
  date: string;
  location?: string;
  notes?: string;
};

export type State = {
  people: Person[];
  meetups: Meetup[];
  /** Whoever has been picked for the next meetup, until it is recorded. */
  next: { name: string; at: string } | null;
};

export const EMPTY: State = { people: [], meetups: [], next: null };

// Who is in the hat before anyone has changed anything. Once the list has
// been saved, the saved one is used and this is never read again.
const FIRST_NAMES = [
  "Aaron",
  "Bex",
  "Bobbie",
  "Dave",
  "Ger",
  "Ivo",
  "Jack",
  "Kathir",
  "Konstantinos",
  "Luca",
  "Lydia",
  "Marta",
  "Masi",
  "Mathilde",
  "Milly",
  "Nelson",
  "Rich",
  "Stina",
  "Suneil",
  "Will",
];

export const SEED: State = {
  ...EMPTY,
  people: FIRST_NAMES.map((name) => ({ id: name.toLowerCase(), name })),
};

export const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** Meetups newest first. */
export const newestFirst = (meetups: Meetup[]) =>
  [...meetups].sort((a, b) => b.date.localeCompare(a.date));

export type Standing = {
  person: Person;
  /** How many meetups they have organized. */
  count: number;
  /** The date they last organized, if ever. */
  last: string | null;
  /** Their share of the draw; 0 means they sit this one out. */
  weight: number;
};

/**
 * Everyone's standing in the next draw. A person's weight is the number of
 * meetups since they last organized, so the longer ago, the likelier; someone
 * who never has counts as longer ago than anyone. The most recent organizer
 * sits out, and so does `skip` (the current pick, when picking again), unless
 * that would leave nobody.
 */
export function standings(state: State, skip?: string): Standing[] {
  const history = newestFirst(state.meetups);
  const rows = state.people.map((person) => {
    const since = history.findIndex((m) => same(m.organizer, person.name));
    return {
      person,
      count: history.filter((m) => same(m.organizer, person.name)).length,
      last: since === -1 ? null : history[since].date,
      weight: since === -1 ? history.length + 1 : since,
    };
  });
  const without = rows.map((row) =>
    skip && same(row.person.name, skip) ? { ...row, weight: 0 } : row,
  );
  for (const candidate of [without, rows]) {
    if (candidate.some((row) => row.weight > 0)) return candidate;
  }
  // Only the last organizer is on the list: they go again.
  return rows.map((row) => ({ ...row, weight: 1 }));
}

/** Draws one person by weight. `random` returns an integer in [0, max). */
export function draw(
  rows: Standing[],
  random: (max: number) => number,
): Person | null {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  if (total === 0) return null;
  let ticket = random(total);
  for (const row of rows) {
    if (ticket < row.weight) return row.person;
    ticket -= row.weight;
  }
  return null;
}
