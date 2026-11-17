import type { ButtonHTMLAttributes } from "react";

type Variant = "tactile" | "solid" | "ghost";

const VARIANTS: Record<Variant, string> = {
  // A physical key: a face sitting on a darker edge that compresses when pressed.
  tactile:
    "bg-press text-background shadow-[0_4px_0_var(--press-edge)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--press-edge)] transition-[translate,box-shadow] duration-100 ease-out",
  solid:
    "bg-foreground text-background transition-[scale] duration-100 ease-out active:scale-[0.97]",
  ghost:
    "border border-rule bg-surface text-foreground transition-[scale,border-color] duration-100 ease-out hover:border-muted/40 active:scale-[0.97]",
};

export function Button({
  variant = "solid",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium ${VARIANTS[variant]} ${className}`}
    />
  );
}
