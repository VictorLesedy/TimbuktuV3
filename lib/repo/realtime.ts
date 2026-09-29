import { getVersion, type LiveEvent, liveEvents, resetDb, subscribe } from "../mock/db";
import { simulateCrowdTick } from "./activations";

/*
 * Stand-in for a websocket. A real back-end would push these events;
 * here the client drives the simulation on a timer.
 */

export type { LiveEvent };

export function subscribeToChanges(listener: () => void) {
  return subscribe(listener);
}

export function latestLiveEvent(): LiveEvent | null {
  return liveEvents[0] ?? null;
}

export function changeVersion() {
  return getVersion();
}

export function tickCrowd() {
  return simulateCrowdTick();
}

export function resetDemoData() {
  resetDb();
}
