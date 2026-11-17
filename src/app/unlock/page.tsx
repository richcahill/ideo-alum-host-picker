import type { Metadata } from "next";
import { Suspense } from "react";
import { Submit } from "@/components/submit";
import { passcode } from "@/lib/passcode";
import { unlock } from "../actions";

export const metadata: Metadata = { title: "Enter passcode" };

export default function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  return (
    <section>
      <h1 className="text-2xl font-medium tracking-tight">Make changes</h1>
      <p className="mt-3 text-lg text-muted">
        Anyone can see the list and the history. Enter the group&apos;s passcode
        to pick an organizer or change anything.
      </p>
      <Suspense>
        <UnlockForm searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

// Rendered on the server so the form and its error work without JavaScript.
async function UnlockForm({
  searchParams,
}: {
  searchParams: PageProps<"/unlock">["searchParams"];
}) {
  const failed = "error" in (await searchParams);

  if (!passcode()) {
    return (
      <p role="alert" className="mt-8 text-muted">
        No passcode has been set for this site yet, so nothing can be changed.
        Set <code className="font-mono text-sm">EDIT_PASSWORD</code> in the
        project&apos;s environment variables.
      </p>
    );
  }

  return (
    <form action={unlock} className="mt-8 flex max-w-sm flex-col gap-3">
      <label htmlFor="passcode" className="text-sm text-muted">
        Passcode
      </label>
      <div className="flex gap-3">
        <input
          id="passcode"
          name="passcode"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          enterKeyHint="go"
          aria-invalid={failed || undefined}
          aria-describedby={failed ? "passcode-error" : undefined}
          className="min-w-0 flex-1 rounded-xl border border-rule bg-surface px-4 py-2.5 text-base shadow-card outline-none transition-colors duration-100 ease-out focus-visible:border-foreground aria-[invalid]:border-red-500"
        />
        <Submit variant="tactile" className="shrink-0">
          Enter
        </Submit>
      </div>
      {failed && (
        <p
          id="passcode-error"
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          That passcode didn&apos;t work. Try again.
        </p>
      )}
    </form>
  );
}
