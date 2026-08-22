/**
 * Diffing helpers for VM history state blobs.
 *
 * Mirrors the `JsonDiff` logic in the customer site (`lnvps_web`,
 * `src/pages/vm-history.tsx`), but takes already-parsed JSON: the admin API
 * returns `previous_state` / `new_state` / `metadata` as JSON values, whereas
 * the customer API returns them as JSON strings.
 */

export type StateChangeType = "added" | "removed" | "changed";

export interface StateChange {
  key: string;
  /** `undefined` for an `added` key. */
  from: unknown;
  /** `undefined` for a `removed` key. */
  to: unknown;
  type: StateChangeType;
}

type JsonObject = Record<string, unknown>;

/**
 * Compute the top-level changed keys between two state blobs.
 *
 * Keys with deep-equal values are omitted; keys present on only one side are
 * reported as `added` / `removed`.
 */
export function diffStates(previous?: JsonObject | null, next?: JsonObject | null): StateChange[] {
  const prevObj = previous ?? {};
  const currObj = next ?? {};
  const allKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(currObj)])).sort();

  const changes: StateChange[] = [];
  for (const key of allKeys) {
    const from = prevObj[key];
    const to = currObj[key];

    if (!(key in prevObj)) {
      changes.push({ key, from: undefined, to, type: "added" });
    } else if (!(key in currObj)) {
      changes.push({ key, from, to: undefined, type: "removed" });
    } else if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ key, from, to, type: "changed" });
    }
  }
  return changes;
}

/** Format a JSON value for display in a diff row. */
export function formatDiffValue(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value.length === 0 ? '""' : value;
  return JSON.stringify(value) ?? String(value);
}

/** Flatten a metadata blob into sorted key/value rows. */
export function metadataEntries(metadata?: JsonObject | null): Array<{ key: string; value: unknown }> {
  if (!metadata) return [];
  return Object.keys(metadata)
    .sort()
    .map((key) => ({ key, value: metadata[key] }));
}
