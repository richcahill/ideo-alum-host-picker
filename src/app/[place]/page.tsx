import { Suspense } from "react";
import { Picker } from "@/components/picker";

/** A location someone added. London is at the root. */
export default function PlacePage({ params }: PageProps<"/[place]">) {
  return (
    <Suspense fallback={<p className="text-muted">Reading the list…</p>}>
      <Picker slug={params.then(({ place }) => place)} />
    </Suspense>
  );
}
