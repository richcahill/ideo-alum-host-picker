"use server";

import { randomInt, randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, matches, passcode, token } from "@/lib/passcode";
import { draw, same, standings, type Meetup, type State } from "@/lib/picker";
import { unlocked } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function unlock(formData: FormData) {
  const secret = passcode();
  const attempt = String(formData.get("passcode") ?? "");
  if (!secret || !matches(token(attempt), token(secret))) {
    redirect("/unlock?error=1");
  }
  (await cookies()).set(COOKIE, token(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  redirect("/");
}

export async function lock() {
  (await cookies()).delete(COOKIE);
  refresh();
}

// Every change goes through here: the passcode is checked on the server, so
// hiding the controls is never what keeps the list safe.
async function change(update: (state: State) => State | null) {
  if (!(await unlocked())) redirect("/unlock");
  const store = getStore();
  if (!store) return;
  const next = update(await store.read());
  if (next) await store.write(next);
  refresh();
}

const text = (formData: FormData, name: string, max: number) =>
  String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);

export async function addPerson(formData: FormData) {
  const name = text(formData, "name", 80);
  if (!name) return;
  await change((state) =>
    state.people.some((person) => same(person.name, name))
      ? null
      : { ...state, people: [...state.people, { id: randomUUID(), name }] },
  );
}

export async function removePerson(formData: FormData) {
  const id = text(formData, "id", 64);
  await change((state) => {
    const gone = state.people.find((person) => person.id === id);
    if (!gone) return null;
    return {
      ...state,
      people: state.people.filter((person) => person.id !== id),
      next: state.next && same(state.next.name, gone.name) ? null : state.next,
    };
  });
}

/** Draws the next organizer; picking again never repeats the current pick. */
export async function pick() {
  await change((state) => {
    const person = draw(standings(state, state.next?.name), randomInt);
    return person
      ? { ...state, next: { name: person.name, at: new Date().toISOString() } }
      : null;
  });
}

export async function clearPick() {
  await change((state) => ({ ...state, next: null }));
}

/**
 * Adds a meetup to the history, or changes one when the form carries its id.
 * Recording the current pick's meetup also clears the pick.
 */
export async function saveMeetup(formData: FormData) {
  const id = text(formData, "id", 64);
  const organizer = text(formData, "organizer", 80);
  const date = text(formData, "date", 10);
  if (!organizer || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const meetup: Meetup = {
    id: id || randomUUID(),
    organizer,
    date,
    location: text(formData, "location", 120) || undefined,
    notes: text(formData, "notes", 500) || undefined,
  };
  await change((state) => ({
    ...state,
    meetups: id
      ? state.meetups.map((m) => (m.id === id ? meetup : m))
      : [...state.meetups, meetup],
    next: formData.has("settles") ? null : state.next,
  }));
}

export async function deleteMeetup(formData: FormData) {
  const id = text(formData, "id", 64);
  await change((state) => ({
    ...state,
    meetups: state.meetups.filter((m) => m.id !== id),
  }));
}
