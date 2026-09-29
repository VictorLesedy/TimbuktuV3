import { commit } from "../mock/db";
import { sleep } from "../utils";

/* Network simulation shared by every repository call. */

export const network = { failureRate: 0, minLatency: 300, maxLatency: 900 };

export class ApiError extends Error {
  constructor(
    message: string,
    public code: "network" | "validation" | "conflict" | "not_found" | "forbidden" = "validation",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function simulate() {
  await sleep(network.minLatency + Math.random() * (network.maxLatency - network.minLatency));
  if (Math.random() < network.failureRate) {
    throw new ApiError("The connection dropped before the server answered. Check your signal and try again.", "network");
  }
}

/** Read: latency, optional failure, and a deep copy so callers never mutate the store. */
export async function read<T>(fn: () => T): Promise<T> {
  await simulate();
  return structuredClone(fn());
}

/** Write: same as read, then notifies subscribers and persists. */
export async function write<T>(fn: () => T): Promise<T> {
  await simulate();
  try {
    return structuredClone(fn());
  } finally {
    // Commit even when the call throws after a partial change, such as a failed payment.
    commit();
  }
}
