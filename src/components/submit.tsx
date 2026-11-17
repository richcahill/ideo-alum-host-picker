"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** A form's submit button; it dims and stops taking presses while sending. */
export function Submit({
  className = "",
  ...props
}: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending}
      className={`disabled:opacity-60 ${className}`}
    />
  );
}

/** A quiet text button for the small actions in a row. */
export function TextSubmit({
  className = "",
  ...props
}: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending}
      className={`text-sm text-muted underline decoration-rule underline-offset-4 transition-colors hover:text-foreground hover:decoration-current disabled:opacity-60 ${className}`}
    />
  );
}
