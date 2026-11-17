import { createHash, timingSafeEqual } from "node:crypto";

/** Cookie set once the visitor has entered the shared passcode. */
export const COOKIE = "picker-pass";

/** Without EDIT_PASSWORD set, nobody can make changes. */
export const passcode = () => process.env.EDIT_PASSWORD || null;

// The cookie holds a hash of the passcode, so changing EDIT_PASSWORD signs
// everyone out and the passcode itself is never stored in the browser.
export const token = (value: string) =>
  createHash("sha256").update(`ideo-alum-host-picker:${value}`).digest("hex");

export function matches(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
