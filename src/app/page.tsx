import { Suspense } from "react";
import { Picker } from "@/components/picker";
import { HOME } from "@/lib/picker";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-muted">Reading the list…</p>}>
      <Picker slug={HOME.slug} />
    </Suspense>
  );
}
