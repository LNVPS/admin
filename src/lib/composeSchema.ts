import { parse as parseYaml } from "yaml";

/** Input type of a customer-supplied config field (compose `config[].type`). */
export type ComposeFieldType = "string" | "int" | "bool" | "file";

/** A customer-provided config field declared by an app's compose document. */
export interface ComposeConfigField {
  /** Env var name (referenced as `${name}` in the compose). */
  name: string;
  /** Human-readable form label; falls back to `name`. */
  label: string;
  type: ComposeFieldType;
  /** Default value applied when the customer leaves the field blank. */
  default: string | null;
  required: boolean;
}

/** An operator-generated secret declared by an app's compose (never customer-set). */
export interface ComposeSecret {
  name: string;
  generate: string;
}

/** Resource footprint of a compose service (or, summed, of the whole app). */
export interface ComposeFootprint {
  /** CPU in millicores (1500 = 1.5 cores). */
  cpu_milli: number;
  memory_bytes: number;
  /** Persistent storage — sum of `volumes[].size`. */
  storage_bytes: number;
}

/** One service's contribution to the app footprint. */
export interface ComposeServiceFootprint extends ComposeFootprint {
  name: string;
}

/** Defaults applied by the API's compose parser when `resources` is omitted. */
const DEFAULT_CPU = "250m";
const DEFAULT_MEMORY = "256Mi";

/**
 * Normalise a YAML scalar to its quantity string.
 *
 * Unquoted quantities like `cpu: 1` or `size: 20` parse as numbers, so they must
 * be coerced before suffix matching. An absent value takes the API's default;
 * anything else present but unparseable counts as zero rather than silently
 * inheriting a default it never declared.
 */
function toQuantity(value: unknown, whenAbsent: string): string {
  if (value === undefined || value === null) return whenAbsent;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "0";
}

/** Parse a Kubernetes CPU quantity to millicores: "500m" → 500, 1 / "1" → 1000, "1.5" → 1500. */
export function parseCpuMilli(value: string | number): number {
  const s = String(value).trim();
  if (s.endsWith("m")) {
    const m = Number.parseInt(s.slice(0, -1).trim(), 10);
    return Number.isFinite(m) && m >= 0 ? m : 0;
  }
  const cores = Number.parseFloat(s);
  return Number.isFinite(cores) && cores >= 0 ? Math.round(cores * 1000) : 0;
}

const BYTE_SUFFIXES: [string, number][] = [
  ["Ki", 1024],
  ["Mi", 1024 ** 2],
  ["Gi", 1024 ** 3],
  ["Ti", 1024 ** 4],
  ["k", 1_000],
  ["M", 1_000_000],
  ["G", 1_000_000_000],
  ["T", 1_000_000_000_000],
];

/** Parse a Kubernetes memory/storage quantity to bytes (binary + SI suffixes, or bare bytes). */
export function parseQuantityBytes(value: string | number): number {
  const s = String(value).trim();
  for (const [suffix, multiplier] of BYTE_SUFFIXES) {
    if (s.endsWith(suffix)) {
      const n = Number.parseInt(s.slice(0, -suffix.length).trim(), 10);
      return Number.isFinite(n) && n >= 0 ? n * multiplier : 0;
    }
  }
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const FIELD_TYPES: ComposeFieldType[] = ["string", "int", "bool", "file"];

function asFieldType(value: unknown): ComposeFieldType {
  const t = typeof value === "string" ? value.toLowerCase() : "";
  return (FIELD_TYPES as string[]).includes(t) ? (t as ComposeFieldType) : "string";
}

function asOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

/**
 * Parse the `config:` (and `secrets:`) declarations out of an app's compose YAML.
 *
 * Used to render the deployment config form from the catalog schema rather than
 * only from the keys a deployment happens to have stored. Returns empty lists
 * for compose documents that are unparseable or declare no config.
 */
export function parseComposeSchema(compose: string): { config: ComposeConfigField[]; secrets: ComposeSecret[] } {
  let doc: unknown;
  try {
    doc = parseYaml(compose);
  } catch {
    return { config: [], secrets: [] };
  }
  if (typeof doc !== "object" || doc === null) return { config: [], secrets: [] };

  const raw = doc as { config?: unknown; secrets?: unknown };

  const config: ComposeConfigField[] = Array.isArray(raw.config)
    ? raw.config
        .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
        .map((entry) => ({
          name: String(entry.name ?? ""),
          label: typeof entry.label === "string" && entry.label ? entry.label : String(entry.name ?? ""),
          type: asFieldType(entry.type),
          default: asOptionalString(entry.default),
          required: entry.required === true,
        }))
        .filter((field) => field.name.length > 0)
    : [];

  const secrets: ComposeSecret[] = Array.isArray(raw.secrets)
    ? raw.secrets
        .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
        .map((entry) => ({
          name: String(entry.name ?? ""),
          generate: typeof entry.generate === "string" ? entry.generate : "password",
        }))
        .filter((secret) => secret.name.length > 0)
    : [];

  return { config, secrets };
}

/**
 * Compute an app's resource footprint from its compose, mirroring the API's
 * `Compose::footprint`: CPU/memory summed across services (defaults applied when
 * `resources` is omitted) plus the sizes of every declared volume.
 *
 * Used to price a catalog app before the server has computed its footprint
 * (i.e. while the compose is still being edited in the form).
 */
export function parseComposeFootprint(compose: string): {
  total: ComposeFootprint;
  services: ComposeServiceFootprint[];
} {
  const empty = { total: { cpu_milli: 0, memory_bytes: 0, storage_bytes: 0 }, services: [] };
  let doc: unknown;
  try {
    doc = parseYaml(compose);
  } catch {
    return empty;
  }
  const services = (doc as { services?: unknown } | null)?.services;
  if (typeof services !== "object" || services === null) return empty;

  const perService: ComposeServiceFootprint[] = Object.entries(services as Record<string, unknown>)
    .map(([name, raw]) => {
      const svc = (typeof raw === "object" && raw !== null ? raw : {}) as {
        resources?: { cpu?: unknown; memory?: unknown };
        volumes?: unknown;
      };
      const cpu = toQuantity(svc.resources?.cpu, DEFAULT_CPU);
      const memory = toQuantity(svc.resources?.memory, DEFAULT_MEMORY);
      const volumes = Array.isArray(svc.volumes) ? svc.volumes : [];
      const storage_bytes = volumes.reduce((sum: number, v: unknown) => {
        const size = (v as { size?: unknown })?.size;
        return sum + parseQuantityBytes(toQuantity(size, "0"));
      }, 0);
      return { name, cpu_milli: parseCpuMilli(cpu), memory_bytes: parseQuantityBytes(memory), storage_bytes };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const total = perService.reduce<ComposeFootprint>(
    (acc, s) => ({
      cpu_milli: acc.cpu_milli + s.cpu_milli,
      memory_bytes: acc.memory_bytes + s.memory_bytes,
      storage_bytes: acc.storage_bytes + s.storage_bytes,
    }),
    { cpu_milli: 0, memory_bytes: 0, storage_bytes: 0 },
  );

  return { total, services: perService };
}
