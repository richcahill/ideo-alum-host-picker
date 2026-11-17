import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Submit, TextSubmit } from "@/components/submit";
import {
  EMPTY,
  newestFirst,
  standings,
  type Meetup,
  type State,
} from "@/lib/picker";
import { unlocked } from "@/lib/session";
import { getStore } from "@/lib/store";
import {
  addPerson,
  clearPick,
  deleteMeetup,
  lock,
  pick,
  removePerson,
  saveMeetup,
} from "./actions";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-muted">Reading the list…</p>}>
      <Picker />
    </Suspense>
  );
}

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

/** The whole page, read fresh from the store on every visit. */
async function Picker() {
  await connection();
  const store = getStore();
  const editing = await unlocked();
  let state: State = EMPTY;
  let failed = false;
  try {
    if (store) state = await store.read();
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

  const rows = standings(state, state.next?.name);
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  const history = newestFirst(state.meetups);
  const names = state.people.map((person) => person.name);

  return (
    <>
      <section className={`${card} p-1.5`}>
        <div className="rounded-well bg-well px-6 py-12 text-center">
          <p className={label}>Organizing the next meetup</p>
          {state.next ? (
            <h1
              key={state.next.at}
              className="reveal mt-4 text-4xl font-medium tracking-tight sm:text-5xl"
            >
              {state.next.name}
            </h1>
          ) : (
            <h1 className="mt-4 text-4xl font-medium tracking-tight text-muted sm:text-5xl">
              Nobody yet
            </h1>
          )}
          {editing && state.people.length > 0 && (
            <form action={pick} className="mt-8">
              <Submit variant="tactile">
                {state.next ? "Pick again" : "Pick someone"}
              </Submit>
            </form>
          )}
          {editing && state.people.length === 0 && (
            <p className="mt-6 text-muted">
              Add some people below, then pick.
            </p>
          )}
          {!editing && (
            <p className="mt-6 text-sm text-muted">
              <Link
                href="/unlock"
                className="underline decoration-rule underline-offset-4 hover:decoration-current"
              >
                Enter the passcode
              </Link>{" "}
              to pick or change anything.
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
                names={names}
                organizer={state.next.name}
                settles
                submit="Add to history"
              />
            </details>
            <form action={clearPick} className="mt-3">
              <TextSubmit>Clear the pick</TextSubmit>
            </form>
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-medium tracking-tight">In the hat</h2>
        <p className="mt-2 text-muted">
          The longer since someone last organized, the likelier they are to be
          picked. Whoever organized last sits the next one out.
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
                  <details className="mt-2">
                    <summary className="cursor-pointer list-none text-sm text-muted underline decoration-rule underline-offset-4 hover:text-foreground [&::-webkit-details-marker]:hidden">
                      Edit
                    </summary>
                    <MeetupForm names={names} meetup={meetup} submit="Save" />
                    <form action={deleteMeetup} className="mt-3">
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
          <details className="mt-4">
            <summary className="cursor-pointer list-none text-sm text-muted underline decoration-rule underline-offset-4 hover:text-foreground [&::-webkit-details-marker]:hidden">
              Add a past meetup
            </summary>
            <MeetupForm names={names} submit="Add to history" />
          </details>
        )}
      </section>

      {editing && (
        <form action={lock} className="mt-16">
          <TextSubmit>Lock editing on this device</TextSubmit>
        </form>
      )}
    </>
  );
}

/** Adds a meetup, or edits the one given. */
function MeetupForm({
  names,
  meetup,
  organizer,
  settles,
  submit,
}: {
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
        <span className={label}>Location</span>
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
