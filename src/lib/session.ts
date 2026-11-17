import "server-only";
import { cookies } from "next/headers";
import { COOKIE, matches, passcode, token } from "@/lib/passcode";

/** Whether this visitor has entered the shared passcode. */
export async function unlocked() {
  const secret = passcode();
  const cookie = (await cookies()).get(COOKIE)?.value;
  return Boolean(secret && cookie && matches(cookie, token(secret)));
}
