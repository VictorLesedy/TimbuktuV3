import { DEMO_IDS } from "./config";

/*
 * Stand-in for an auth session. The role switcher writes here; the repository
 * reads it the way a real API would read a session cookie.
 */
type Session = { signedIn: boolean; referralCode: string | null };

const session: Session = { signedIn: true, referralCode: null };

export function setSession(next: Partial<Session>) {
  Object.assign(session, next);
}

export function getSession() {
  return session;
}

export const currentFanId = () => DEMO_IDS.fan;
export const currentEntertainerId = () => DEMO_IDS.entertainer;
