import { createHash, timingSafeEqual } from "node:crypto";

/** Cookie set once the visitor has entered the shared passcode. */
export const COOKIE = "picker-pass";

/** Without PICKER_PASSCODE set, nobody can make changes. */
export const passcode = () => process.env.PICKER_PASSCODE || null;

// The cookie holds a hash of the passcode, so changing PICKER_PASSCODE signs
// everyone out and the passcode itself is never stored in the browser.
export const token = (value: string) =>
  createHash("sha256").update(`ideo-alum-host-picker:${value}`).digest("hex");

export function matches(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
