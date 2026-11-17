import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Submit, TextSubmit } from "@/components/submit";
import { Wheel } from "@/components/wheel";
import {
  EMPTY,
  HOME,
  href,
  newestFirst,
  standings,
  type Meetup,
  type Place,
  type State,
} from "@/lib/picker";
import { unlocked } from "@/lib/session";
import { getStore } from "@/lib/store";
import {
  addPerson,
  addPlace,
  clearPick,
  deleteMeetup,
  lock,
  removePerson,
  removePlace,
  saveMeetup,
} from "@/app/actions";

const DAY = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const day = (date: string) => DAY.format(new Date(`${date}T00:00:00Z`));
const today = () => new Date().toISOString().slice(0, 10);

const label = "font-mono text-[11px] uppercase tracking-[0.05em] text-muted";
const field =
  "w-full min-w-0 rounded-xl border border-rule bg-surface px-4 py-2.5 text-base outline-none transition-colors duration-100 ease-out focus-visible:border-foreground";
const card = "rounded-card border border-rule bg-surface shadow-card";

/**
 * One location's page, read fresh from the store on every visit. `slug` may
 * be a promise, so a page can hand over its route params unawaited.
 */
export async function Picker({
  slug: given,
}: {
  slug: string | Promise<string>;
}) {
  await connection();
  const slug = await given;
  const store = getStore();
  const editing = await unlocked();
  let state: State = EMPTY;
  let places: Place[] = [HOME];
  let spins = 0;
  let failed = false;
  try {
    if (store) {
      places = await store.places();
      if (places.some((place) => place.slug === slug)) {
        [state, spins] = await Promise.all([store.read(slug), store.spins()]);
      }
    }
  } catch (error) {
    console.error("The list could not be read", error);
    failed = true;
  }

  if (!store || failed) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-medium tracking-tight">Not ready yet</h1>
        <p className="text-lg text-muted">
          {failed
            ? "The list couldn’t be read just now. Try again in a moment."
            : "No store is connected yet, so there is nowhere to keep the list. Connect an Upstash Redis store to the Vercel project."}
        </p>
      </section>
    );
  }

  const place = places.find((candidate) => candidate.slug === slug);
  if (!place) notFound();

  const rows = standings(state);
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  const history = newestFirst(state.meetups);
  const names = state.people.map((person) => person.name);

  return (
    <>
      <nav
        aria-label="Locations"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm"
      >
        {places.map((candidate) => (
          <Link
            key={candidate.slug}
            href={href(candidate)}
            aria-current={candidate.slug === slug ? "page" : undefined}
            className="rounded-full border border-rule bg-surface px-3.5 py-1.5 text-muted transition-colors hover:text-foreground aria-[current]:border-foreground aria-[current]:bg-foreground aria-[current]:text-background"
          >
            {candidate.name}
          </Link>
        ))}
        {editing && (
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full border border-dashed border-muted/50 px-3.5 py-1.5 text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              + Add a location
            </summary>
            <form
              action={addPlace}
              className={`${card} absolute left-0 top-full z-20 mt-2 flex w-72 max-w-[calc(100vw-3rem)] gap-2 p-2`}
            >
              <input
                name="name"
                required
                maxLength={40}
                placeholder="City"
                aria-label="Location to add"
                autoComplete="off"
                enterKeyHint="done"
                className={field}
              />
              <Submit variant="solid" className="shrink-0">
                Add
              </Submit>
            </form>
          </details>
        )}
      </nav>

      <section className={`${card} p-1.5`}>
        <div className="overflow-hidden rounded-well bg-well px-6 py-12 text-center">
          <p className={label}>Organizing the next {place.name} meetup</p>
          <Wheel
            segments={rows
              .filter((row) => row.weight > 0)
              .map((row) => ({ name: row.person.name, weight: row.weight }))}
            current={state.next?.name ?? null}
            editing={editing}
            place={slug}
            spins={spins}
          />
          {editing && state.people.length === 0 && (
            <p className="mt-6 text-muted">Add some people below, then spin.</p>
          )}
          {!editing && (
            <p className="mt-6 text-sm text-muted">
              <Link
                href="/unlock"
                className="underline decoration-rule underline-offset-4 hover:decoration-current"
              >
                Enter the passcode
              </Link>{" "}
              to spin or change anything.
            </p>
          )}
        </div>
        {editing && state.next && (
          <div className="px-4 pt-5 pb-4">
            <details className="group">
              <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                It happened: add it to the history{" "}
                <span
                  aria-hidden
                  className="inline-block text-muted transition-transform duration-200 ease-out group-open:rotate-90"
                >
                  →
                </span>
              </summary>
              <MeetupForm
                place={slug}
                names={names}
                organizer={state.next.name}
                settles
                submit="Add to history"
              />
            </details>
            <form action={clearPick} className="mt-3">
              <input type="hidden" name="place" value={slug} />
              <TextSubmit>Clear the pick</TextSubmit>
            </form>
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-medium tracking-tight">In the hat</h2>
        <p className="mt-2 text-muted">
          The longer since someone last organized, the likelier they are to be
          picked, and the wider their slice of the wheel. Whoever organized last
          sits the next one out.
        </p>
        {rows.length > 0 && (
          <ul className={`${card} mt-6 divide-y divide-rule`}>
            {rows.map(({ person, count, last, weight }) => (
              <li
                key={person.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3"
              >
                <span className="font-medium">{person.name}</span>
                <span className="text-sm text-muted">
                  {count === 0
                    ? "Hasn’t organized yet"
                    : `${count === 1 ? "Once" : `${count} times`}, last on ${day(last!)}`}
                </span>
                <span className="ml-auto flex items-baseline gap-4">
                  <span
                    className="text-sm tabular-nums text-muted"
                    title="Chance of being picked next"
                  >
                    {weight === 0
                      ? "Sitting out"
                      : `${Math.round((weight / total) * 100)}%`}
                  </span>
                  {editing && (
                    <form action={removePerson}>
                      <input type="hidden" name="place" value={slug} />
                      <input type="hidden" name="id" value={person.id} />
                      <TextSubmit aria-label={`Remove ${person.name}`}>
                        Remove
                      </TextSubmit>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {rows.length === 0 && !editing && (
          <p className="mt-6 text-muted">Nobody is on the list yet.</p>
        )}
        {editing && (
          <form action={addPerson} className="mt-4 flex gap-3">
            <input type="hidden" name="place" value={slug} />
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Add a name"
              aria-label="Name to add"
              autoComplete="off"
              enterKeyHint="done"
              className={field}
            />
            <Submit variant="ghost" className="shrink-0">
              Add
            </Submit>
          </form>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-medium tracking-tight">History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-muted">No meetups recorded yet.</p>
        ) : (
          <ol className={`${card} mt-6 divide-y divide-rule`}>
            {history.map((meetup) => (
              <li key={meetup.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-medium">{meetup.organizer}</span>
                  <span className="text-sm text-muted">
                    {day(meetup.date)}
                    {meetup.location && ` · ${meetup.location}`}
                  </span>
                </div>
                {meetup.notes && (
                  <p className="mt-1 text-sm text-muted">{meetup.notes}</p>
                )}
                {editing && (
                  // Keyed by its contents, so a saved edit folds the form away.
                  <details key={JSON.stringify(meetup)} className="mt-2">
                    <summary className="cursor-pointer list-none text-sm text-muted underline decoration-rule underline-offset-4 hover:text-foreground [&::-webkit-details-marker]:hidden">
                      Edit
                    </summary>
                    <MeetupForm
                      place={slug}
                      names={names}
                      meetup={meetup}
                      submit="Save"
                    />
                    <form action={deleteMeetup} className="mt-3">
                      <input type="hidden" name="place" value={slug} />
                      <input type="hidden" name="id" value={meetup.id} />
                      <TextSubmit>Delete this meetup</TextSubmit>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
        {editing && (
          <details key={history.length} className="mt-4">
            <summary className="cursor-pointer list-none text-sm text-muted underline decoration-rule underline-offset-4 hover:text-foreground [&::-webkit-details-marker]:hidden">
              Add a past meetup
            </summary>
            <MeetupForm place={slug} names={names} submit="Add to history" />
          </details>
        )}
      </section>

      {editing && (
        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-2">
          <form action={lock}>
            <TextSubmit>Lock editing on this device</TextSubmit>
          </form>
          {slug !== HOME.slug && history.length === 0 && (
            <form action={removePlace}>
              <input type="hidden" name="place" value={slug} />
              <TextSubmit>Remove {place.name} as a location</TextSubmit>
            </form>
          )}
        </div>
      )}
    </>
  );
}

/** Adds a meetup, or edits the one given. */
function MeetupForm({
  place,
  names,
  meetup,
  organizer,
  settles,
  submit,
}: {
  place: string;
  names: string[];
  meetup?: Meetup;
  /** Fixes the organizer, when recording the current pick. */
  organizer?: string;
  /** Recording this meetup clears the current pick. */
  settles?: boolean;
  submit: string;
}) {
  const list = `names-${meetup?.id ?? (settles ? "pick" : "new")}`;
  return (
    <form action={saveMeetup} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="place" value={place} />
      {meetup && <input type="hidden" name="id" value={meetup.id} />}
      {settles && <input type="hidden" name="settles" value="1" />}
      {organizer ? (
        <input type="hidden" name="organizer" value={organizer} />
      ) : (
        <label className="grid gap-1.5">
          <span className={label}>Organizer</span>
          <input
            name="organizer"
            required
            maxLength={80}
            defaultValue={meetup?.organizer}
            list={list}
            autoComplete="off"
            className={field}
          />
          <datalist id={list}>
            {names.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
      )}
      <label className="grid gap-1.5">
        <span className={label}>Date</span>
        <input
          name="date"
          type="date"
          required
          defaultValue={meetup?.date ?? today()}
          className={field}
        />
      </label>
      <label className={`grid gap-1.5 ${organizer ? "" : "sm:col-span-2"}`}>
        <span className={label}>Venue</span>
        <input
          name="location"
          maxLength={120}
          defaultValue={meetup?.location}
          placeholder="Optional"
          className={field}
        />
      </label>
      <label className="grid gap-1.5 sm:col-span-2">
        <span className={label}>Notes</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={meetup?.notes}
          placeholder="Optional"
          className={field}
        />
      </label>
      <div className="sm:col-span-2">
        <Submit variant="solid">{submit}</Submit>
      </div>
    </form>
  );
}
