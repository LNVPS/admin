import { base64 } from "@scure/base";
import { EventKind } from "@snort/system";
import ISO3166 from "iso-3166-1";
import { handleApiError } from "./errorHandler";
import { LoginState } from "./login";

// Enum types from API documentation
export enum DiskType {
  HDD = "hdd",
  SSD = "ssd",
}

export enum DiskInterface {
  SATA = "sata",
  SCSI = "scsi",
  PCIE = "pcie",
}

export enum VmState {
  PENDING = "pending",
  RUNNING = "running",
  STOPPED = "stopped",
  FAILED = "failed",
}

export enum VmRunningStates {
  UNKNOWN = "unknown",
  RUNNING = "running",
  STOPPED = "stopped",
  CREATING = "creating",
}

export enum VmHostKind {
  PROXMOX = "proxmox",
  LIBVIRT = "libvirt",
}

export enum ApiOsDistribution {
  UBUNTU = "ubuntu",
  DEBIAN = "debian",
  CENTOS = "centos",
  FEDORA = "fedora",
  FREEBSD = "freebsd",
  OPENSUSE = "opensuse",
  ARCHLINUX = "archlinux",
  REDHAT_ENTERPRISE = "redhatenterprise",
  ALMALINUX = "almalinux",
  ROCKYLINUX = "rockylinux",
  ALPINE = "alpine",
  NIXOS = "nixos",
  OPENBSD = "openbsd",
  NETBSD = "netbsd",
  GENTOO = "gentoo",
  VOIDLINUX = "voidlinux",
}

export enum IpRangeAllocationMode {
  RANDOM = "random",
  SEQUENTIAL = "sequential",
  SLAAC_EUI64 = "slaac_eui64",
}

export enum DnsServerKind {
  CLOUDFLARE = "cloudflare",
  OVH = "ovh",
}

export enum NetworkAccessPolicyKind {
  STATIC_ARP = "static_arp",
}

export enum RouterKind {
  MIKROTIK = "mikrotik",
  OVH_ADDITIONAL_IP = "ovh_additional_ip",
  LINUX_SSH = "linux_ssh",
}

export enum AdminUserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  READ_ONLY = "read_only",
}

export enum AdminUserStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

export enum AdminVmHistoryActionType {
  CREATED = "created",
  STARTED = "started",
  STOPPED = "stopped",
  RESTARTED = "restarted",
  DELETED = "deleted",
  EXPIRED = "expired",
  RENEWED = "renewed",
  REINSTALLED = "reinstalled",
  STATE_CHANGED = "state_changed",
  PAYMENT_RECEIVED = "payment_received",
  CONFIGURATION_CHANGED = "configuration_changed",
  TRANSFERRED = "transferred",
  /**
   * VM moved to a different host. Recorded both for an admin-requested
   * migration and for a move made outside the API that the periodic
   * `ReconcileVmHosts` job noticed (`metadata.detected === true`).
   */
  MIGRATED = "migrated",
}

export enum AdminPaymentMethod {
  LIGHTNING = "lightning",
  REVOLUT = "revolut",
  PAYPAL = "paypal",
  STRIPE = "stripe",
  // NOTE: payment method configs and refund requests use "onchain", but VM/subscription
  // payment records serialize this value as "on_chain" - handle both when displaying.
  ONCHAIN = "onchain",
}

export enum PaymentProviderType {
  LND = "lnd",
  BITVORA = "bitvora",
  REVOLUT = "revolut",
  STRIPE = "stripe",
  PAYPAL = "paypal",
  ONCHAIN = "onchain",
}

export enum SubscriptionPaymentType {
  PURCHASE = "purchase",
  RENEWAL = "renewal",
  UPGRADE = "upgrade",
  /**
   * Money returned to the customer. `amount`/`tax` are magnitudes to SUBTRACT
   * from earnings, not another sale — anything totalling payment rows must
   * branch on this (api#193).
   */
  REFUND = "refund",
}

/** `true` when a payment row reverses money rather than collecting it. */
export function isRefundPayment(paymentType: SubscriptionPaymentType | undefined): boolean {
  return paymentType === SubscriptionPaymentType.REFUND;
}

/** `+1` for a sale, `-1` for a refund — multiply any amount by this before summing. */
export function paymentSign(paymentType: SubscriptionPaymentType | undefined): 1 | -1 {
  return isRefundPayment(paymentType) ? -1 : 1;
}

export enum SubscriptionType {
  IP_RANGE = "ip_range",
  ASN_SPONSORING = "asn_sponsoring",
  DNS_HOSTING = "dns_hosting",
  /** VM — links to the vm table via `vm.subscription_line_item_id`. */
  VPS = "vps",
  /** Managed app deployment — links via `app_deployment.subscription_line_item_id`. */
  APP = "app",
}

export enum CostPlanIntervalType {
  DAY = "day",
  MONTH = "month",
  YEAR = "year",
}

export enum InternetRegistry {
  ARIN = 0,
  RIPE = 1,
  APNIC = 2,
  LACNIC = 3,
  AFRINIC = 4,
}

export enum CpuMfg {
  UNKNOWN = "unknown",
  INTEL = "intel",
  AMD = "amd",
  APPLE = "apple",
  NVIDIA = "nvidia",
  ARM = "arm",
}

export enum CpuArch {
  UNKNOWN = "unknown",
  X86_64 = "x86_64",
  ARM64 = "arm64",
}

export enum CpuFeature {
  SSE = "SSE",
  SSE2 = "SSE2",
  SSE3 = "SSE3",
  SSSE3 = "SSSE3",
  SSE4_1 = "SSE4_1",
  SSE4_2 = "SSE4_2",
  AVX = "AVX",
  AVX2 = "AVX2",
  FMA = "FMA",
  F16C = "F16C",
  AVX512F = "AVX512F",
  AVX512VNNI = "AVX512VNNI",
  AVX512BF16 = "AVX512BF16",
  AVXVNNI = "AVXVNNI",
  NEON = "NEON",
  SVE = "SVE",
  SVE2 = "SVE2",
  AES = "AES",
  SHA = "SHA",
  SHA512 = "SHA512",
  PCLMULQDQ = "PCLMULQDQ",
  RNG = "RNG",
  GFNI = "GFNI",
  VAES = "VAES",
  VPCLMULQDQ = "VPCLMULQDQ",
  VMX = "VMX",
  NESTED_VIRT = "NestedVirt",
  AMX = "AMX",
  SME = "SME",
  SGX = "SGX",
  SEV = "SEV",
  TDX = "TDX",
  ENCODE_H264 = "EncodeH264",
  ENCODE_HEVC = "EncodeHEVC",
  ENCODE_AV1 = "EncodeAV1",
  ENCODE_VP9 = "EncodeVP9",
  ENCODE_JPEG = "EncodeJPEG",
  DECODE_H264 = "DecodeH264",
  DECODE_HEVC = "DecodeHEVC",
  DECODE_AV1 = "DecodeAV1",
  DECODE_VP9 = "DecodeVP9",
  DECODE_JPEG = "DecodeJPEG",
  DECODE_MPEG2 = "DecodeMPEG2",
  DECODE_VC1 = "DecodeVC1",
  VIDEO_SCALING = "VideoScaling",
  VIDEO_DEINTERLACE = "VideoDeinterlace",
  VIDEO_CSC = "VideoCSC",
  VIDEO_COMPOSITION = "VideoComposition",
}

export enum GpuMfg {
  NONE = "none",
  NVIDIA = "nvidia",
  AMD = "amd",
}

// Helper function to get registry name from number
export function getRegistryName(registry: number): string {
  const names = ["ARIN", "RIPE", "APNIC", "LACNIC", "AFRINIC"];
  return names[registry] || "Unknown";
}

// Export iso-3166-1 library for country codes
export { ISO3166 };

// Helper function to get country name from code
export function getCountryName(countryCode: string): string {
  const country = ISO3166.whereAlpha3(countryCode);
  return country?.country || countryCode;
}

// Helper function to get all countries for dropdown
export function getAllCountries(): Array<{ code: string; name: string }> {
  return ISO3166.all()
    .map((country) => ({
      code: country.alpha3,
      name: country.country,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Countries keyed by alpha-2.
 *
 * Regions carry alpha-2 (what flag rendering needs), while users carry alpha-3.
 * The two are not interchangeable, so they get separate helpers rather than one
 * that silently returns the wrong width of code.
 */
export function getAllCountriesAlpha2(): Array<{ code: string; name: string }> {
  return ISO3166.all()
    .map((country) => ({
      code: country.alpha2,
      name: country.country,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Country name for an alpha-2 code, falling back to the code itself. */
export function getCountryNameAlpha2(countryCode: string): string {
  return ISO3166.whereAlpha2(countryCode)?.country ?? countryCode;
}

/**
 * The flag emoji for an alpha-2 code, built from regional indicator symbols.
 *
 * Returns an empty string for anything that is not two ASCII letters, so a
 * stored value the library does not know cannot render as stray glyphs.
 */
export function countryFlagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export interface ApiResponseBase {
  error?: string;
}

// Single item response
export interface ApiResponse<T> extends ApiResponseBase {
  data: T;
}

/**
 * Short-lived credential for endpoints a browser cannot send an
 * `Authorization` header to — currently just the job-feedback WebSocket.
 *
 * Minted by `POST /api/admin/v1/auth/ticket` and passed as `?ticket=`. Good for
 * one use, on one path, for `expires_in` seconds, so a copy left in an access
 * log or browser history is inert.
 */
export interface AuthTicket {
  ticket: string;
  /** Lifetime in seconds. */
  expires_in: number;
}

// Paginated list response
export interface PaginatedApiResponse<T> extends ApiResponseBase {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Response models based on API docs
export interface AdminUserInfo {
  id: number;
  pubkey: string;
  created: string;
  email: string | null;
  email_verified: boolean;
  contact_nip17: boolean;
  contact_email: boolean;
  country_code: string | null;
  billing_name: string | null;
  billing_address_1: string | null;
  billing_address_2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postcode: string | null;
  billing_tax_id: string | null;
  /** ISO 3166-1 alpha-3 country resolved from the client IP (VAT place-of-supply evidence) */
  geo_country_code: string | null;
  /** Last client IP geolocation was resolved from */
  geo_ip: string | null;
  /** When the geolocation was last resolved (auto-updated on admin edit) */
  geo_updated: string | null;
  vm_count: number;
  last_login: string | null;
  is_admin: boolean;
  has_nwc: boolean;
  /** How the user authenticates. Only 'nostr' has a usable Nostr key. */
  account_type: AccountType;
  /** Number of registered WebAuthn passkeys */
  passkey_count: number;
}

export type AccountType = "nostr" | "oauth" | "webauthn";

export interface AdminPasskeyInfo {
  /** passkey database id (used to revoke it) */
  id: number;
  /** optional user-facing device label */
  name: string | null;
  /** hex-encoded raw credential id */
  cred_id: string;
  /** registration time */
  created: string;
  /** last authentication time (null if never used) */
  last_used: string | null;
}

export interface VmRunningState {
  timestamp: number;
  state: VmRunningStates;
  cpu_usage: number;
  mem_usage: number;
  uptime: number;
  net_in: number;
  net_out: number;
  disk_write: number;
  disk_read: number;
}

/**
 * Body for `POST /api/admin/v1/vms/custom` — an arbitrary VM spec ordered on a
 * user's behalf against a custom pricing plan.
 *
 * The spec fields are flattened into the body, matching the shape of the
 * customer endpoint `POST /api/v1/vm/custom-template`. Optional `cpu_*` fields
 * mean "any" when omitted; misspelled optional keys are silently dropped by the
 * server rather than rejected, so they must match exactly.
 */
export interface AdminCreateCustomVmRequest {
  user_id: number;
  /** Custom pricing plan id — decides the region and the billing currency. */
  pricing_id: number;
  cpu: number;
  /** Memory in bytes. */
  memory: number;
  /** Disk size in bytes. */
  disk: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  /** e.g. "intel", "amd"; omit for any. */
  cpu_mfg?: string;
  /** e.g. "x86_64", "arm64"; omit for any. */
  cpu_arch?: string;
  /** Required CPU features, e.g. ["AVX2"]; omit or empty for any. */
  cpu_feature?: string[];
  /** IPv4 addresses to assign (default 1); must sit within the plan's range. */
  ip4_count?: number;
  /** IPv6 addresses to assign (default 1); must sit within the plan's range. */
  ip6_count?: number;
  image_id: number;
  /** Must belong to `user_id`. */
  ssh_key_id: number;
  ref_code?: string;
  reason?: string;
}

export interface AdminVmInfo {
  id: number;
  created: string;
  expires: string | null;
  mac_address: string;
  image_id: number;
  image_name: string;
  template_id: number;
  template_name: string;
  custom_template_id: number | null;
  is_standard_template: boolean;
  ssh_key_id: number;
  ssh_key_name: string;
  ip_addresses: {
    id: number;
    ip: string;
    range_id: number;
  }[];
  running_state: VmRunningState | null;
  auto_renewal_enabled: boolean;
  cpu: number;
  cpu_mfg: string | null;
  cpu_arch: string | null;
  cpu_features: string[];
  memory: number;
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  host_id: number;
  user_id: number;
  user_pubkey: string;
  user_email: string | null;
  host_name: string;
  region_id: number;
  region_name: string;
  deleted: boolean;
  disabled: boolean;
  ref_code: string | null;
  /**
   * Free-form admin-only notes, never exposed to the customer API.
   * Omitted by the API when empty, so treat `undefined` as "no notes".
   */
  admin_notes?: string | null;
  subscription: AdminSubscriptionInfo | null;
  /**
   * Outbound/inbound transfer for the *current* calendar month plus the plan's
   * allowance. Omitted by older API builds, so treat `undefined` as unknown.
   */
  traffic?: VmTrafficSummary;
}

/**
 * Transfer usage for the current calendar month. `transfer_gb` is the plan's
 * monthly OUTBOUND allowance and is omitted when the plan is unmetered.
 * Exceeding the allowance has no automatic effect today — display only.
 */
export interface VmTrafficSummary {
  transfer_gb?: number | null;
  /** Inclusive UTC date, YYYY-MM-DD. */
  period_start: string;
  /** Inclusive UTC date, YYYY-MM-DD. */
  period_end: string;
  bytes_out: number;
  bytes_in: number;
}

export interface VmTrafficDay {
  /** UTC date, YYYY-MM-DD. */
  day: string;
  bytes_in: number;
  bytes_out: number;
}

export interface AdminVmTraffic {
  vm_id: number;
  user_id: number;
  /** Always the current calendar month, whatever range was requested. */
  summary: VmTrafficSummary;
  /** Days with no traffic are omitted. */
  days: VmTrafficDay[];
}

/** One row of the fleet traffic report, ordered by `bytes_out` descending. */
export interface FleetTrafficRow {
  vm_id: number;
  user_id: number;
  bytes_in: number;
  bytes_out: number;
}

export interface CalculatedHostLoad {
  overall_load: number;
  cpu_load: number;
  memory_load: number;
  disk_load: number;
  available_cpu: number;
  available_memory: number;
  active_vms: number;
}

export interface AdminHostRegion {
  id: number;
  name: string;
  enabled: boolean;
}

export interface ReferralReport {
  vm_id: number;
  ref_code: string;
  created: string;
  amount: number;
  currency: string;
  rate: number;
  base_currency: string;
}

export interface ReferralTimeSeriesReportData {
  start_date: string;
  end_date: string;
  referrals: ReferralReport[];
}

export interface AdminRoleInfo {
  id: number;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permissions: string[];
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserRoleInfo {
  role: {
    id: number;
    name: string;
    description: string | null;
    is_system_role: boolean;
    permissions: string[];
    user_count: number;
    created_at: string;
    updated_at: string;
  };
  assigned_by: number | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface AdminHostInfo {
  id: number;
  name: string;
  kind: VmHostKind;
  region: {
    id: number;
    name: string;
    enabled: boolean;
  };
  ip: string;
  cpu: number;
  cpu_mfg: string | null;
  cpu_arch: string | null;
  cpu_features: string[];
  memory: number;
  enabled: boolean;
  load_cpu: number; // CPU load factor: 0-1 (e.g., 0.75 = 75% load)
  load_memory: number; // Memory load factor: 0-1 (e.g., 0.75 = 75% load)
  load_disk: number; // Disk load factor: 0-1 (e.g., 0.75 = 75% load)
  vlan_id: number | null;
  mtu: number | null;
  /**
   * Decommission date (ISO 8601). When set, the host is forced disabled (takes no new VMs)
   * while existing VMs keep running and can be renewed only up to this date. Omitted when not sunsetting.
   */
  sunset_date?: string | null;
  disks: {
    id: number;
    name: string;
    size: number;
    kind: DiskType;
    interface: DiskInterface;
    enabled: boolean;
    /** Bytes consumed by VM disks placed on this disk (null if capacity was not calculated) */
    usage: number | null;
    /** usage as a fraction of the load-adjusted disk size, 0.0-1.0 (null if capacity was not calculated) */
    load: number | null;
  }[];
  calculated_load: {
    overall_load: number; // Overall load percentage (0.0-1.0)
    cpu_load: number; // CPU load percentage (0.0-1.0)
    memory_load: number; // Memory load percentage (0.0-1.0)
    disk_load: number; // Disk load percentage (0.0-1.0)
    available_cpu: number; // Available CPU cores
    available_memory: number; // Available memory in bytes
    active_vms: number; // Number of active VMs on this host
  };
  ssh_user: string | null;
  ssh_key_configured: boolean;
}

export interface AdminRegionInfo {
  id: number;
  name: string;
  enabled: boolean;
  company_id: number | null;
  /** ISO 3166-1 alpha-2 country code of the region's location, if known. */
  country_code: string | null;
  host_count: number;
  total_vms: number; // Count of active (non-deleted) VMs only
  total_cpu_cores: number;
  total_memory_bytes: number; // Total memory in bytes (not GB)
  total_ip_assignments: number; // IP assignments from active VMs only
  ipv4_assignments: number; // Assignments whose IP range is an IPv4 CIDR
  /**
   * Unassigned usable IPv4 addresses across the region's *enabled* ranges.
   * Disabled ranges, gateways and (unless the range is use_full_range)
   * network/broadcast addresses are excluded.
   */
  ipv4_available: number;
  /** Assignments whose IP range is an IPv6 CIDR. IPv6 has no "available" figure — it is effectively unbounded. */
  ipv6_assignments: number;
  /** IP ranges configured here, enabled or not. */
  ip_ranges: number;
  /** VM templates sold here, enabled or not. */
  vm_templates: number;
  /** App clusters here. */
  app_clusters: number;
  /** Live app deployments on those clusters; soft-deleted ones are excluded. */
  app_deployments: number;
  /** Tunnel pools terminating here. */
  tunnel_pools: number;
  /** VPN services sold here, counted once each however many interfaces they use. */
  vpn_services: number;
  /**
   * Routers serving the region. Derived, not stored: a router has no region, so
   * this counts those reached through the region's tunnel pools and the access
   * policies its IP ranges use.
   */
  routers: number;
}

export interface AdminHostDisk {
  id: number;
  name: string;
  size: number;
  kind: string;
  interface: string;
  enabled: boolean;
  /** Bytes consumed by VM disks on this disk. Null when no capacity calculation was done (disk CRUD endpoints). */
  usage: number | null;
  /** usage as a fraction of the load-adjusted disk size (0.0-1.0). Null as above. */
  load: number | null;
}

/** A VM discovered on a host that is not tracked in the database (import candidate). */
export interface AdminUnmanagedVm {
  /** Raw host VM id (e.g. Proxmox vmid). */
  host_vm_id: number;
  /** Database id this VM would map to on import (vmid - 100). */
  mapped_vm_id: number | null;
  name: string | null;
  /** Allocated CPU cores. */
  cpu: number;
  /** Allocated memory in bytes. */
  memory: number;
  /** Primary disk size in bytes. */
  disk_size: number;
  /** Storage pool backing the primary disk. */
  disk_storage: string | null;
  mac_address: string | null;
  running: boolean;
}

export interface RegionDeleteResponse {
  success: boolean;
  message: string;
}

export interface AdminVmOsImageInfo {
  id: number;
  distribution: ApiOsDistribution;
  flavour: string;
  version: string;
  enabled: boolean;
  release_date: string;
  url: string;
  /**
   * CPU architecture (`x86_64` / `arm64`); null when unspecified, which means
   * "any". Provisioning REJECTS an image whose arch is incompatible with the
   * chosen template's arch (api#183), so this is not cosmetic.
   */
  cpu_arch: string | null;
  default_username: string | null;
  active_vm_count: number;
  sha2: string | null;
  sha2_url: string | null;
}

export interface AdminVmTemplateInfo {
  id: number;
  name: string;
  enabled: boolean;
  created: string;
  expires: string | null;
  cpu: number;
  cpu_mfg: string | null;
  cpu_arch: string | null;
  cpu_features: string[];
  memory: number;
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  cost_plan_id: number;
  region_id: number;
  /** IPv4 addresses included in the offer (default 1). */
  ip4_count: number;
  /** IPv6 addresses included in the offer (default 1); assignment is best-effort. */
  ip6_count: number;
  region_name: string | null; // Populated with region name
  cost_plan_name: string | null; // Populated with cost plan name
  active_vm_count: number;
  disk_iops_read: number | null;
  disk_iops_write: number | null;
  disk_mbps_read: number | null;
  disk_mbps_write: number | null;
  network_mbps: number | null;
  cpu_limit: number | null;
  /** Monthly outbound transfer allowance in GB; null = unmetered. */
  transfer_gb: number | null;
}

export interface AdminCustomPricingInfo {
  id: number;
  name: string;
  enabled: boolean;
  created: string;
  expires: string | null;
  region_id: number;
  region_name: string | null;
  currency: string;
  cpu_mfg: string | null;
  cpu_arch: string | null;
  cpu_features: string[];
  cpu_cost: number;
  memory_cost: number;
  ip4_cost: number;
  ip6_cost: number;
  min_cpu: number;
  max_cpu: number;
  min_memory: number;
  max_memory: number;
  /** Selectable IPv4 address range for an order on this plan (default 1–1). */
  min_ip4: number;
  max_ip4: number;
  /** Selectable IPv6 address range for an order on this plan (default 1–1). */
  min_ip6: number;
  max_ip6: number;
  disk_pricing: {
    id: number;
    kind: DiskType;
    interface: DiskInterface;
    cost: number;
    min_disk_size: number;
    max_disk_size: number;
  }[];
  template_count: number;
  disk_iops_read: number | null;
  disk_iops_write: number | null;
  disk_mbps_read: number | null;
  disk_mbps_write: number | null;
  network_mbps: number | null;
  cpu_limit: number | null;
  /** Monthly outbound transfer allowance in GB; null = unmetered. */
  transfer_gb: number | null;
}

/**
 * A single VM's custom spec. One of these exists per custom VM, so editing it
 * edits that VM's hardware and its renewal price.
 */
export interface AdminCustomTemplateInfo {
  id: number;
  cpu: number;
  /** Memory in bytes. */
  memory: number;
  /** Disk size in bytes. */
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  pricing_id: number;
  pricing_name: string;
  region_id: number;
  region_name: string | null;
  currency: string;
  /**
   * Monthly renewal cost in smallest currency units. `0` when the current plan
   * cannot price this spec (a grandfathered VM).
   */
  price: number;
  ip4_count: number;
  ip6_count: number;
  cpu_mfg?: string;
  cpu_arch?: string;
  cpu_features?: string[];
  disk_iops_read: number | null;
  disk_iops_write: number | null;
  disk_mbps_read: number | null;
  disk_mbps_write: number | null;
  network_mbps: number | null;
  cpu_limit: number | null;
  /** Maximum user firewall rules for this VM; null = global default. */
  firewall_rule_limit: number | null;
  /** Monthly outbound transfer allowance in GB; null = unmetered. */
  transfer_gb: number | null;
  /**
   * VMs using this template — normally exactly one. Empty means the template is
   * orphaned and editing it changes nothing that is running.
   */
  vm_ids: number[];
}

/**
 * Patch a custom template. Omitted keys are unchanged; an explicit `null`
 * clears the field (uncapped / any / global default).
 *
 * `cpu`, `memory` and `disk_size` may only increase — the server rejects a
 * downgrade with 400.
 */
export interface UpdateCustomTemplateRequest {
  cpu?: number;
  memory?: number;
  disk_size?: number;
  disk_type?: DiskType;
  disk_interface?: DiskInterface;
  pricing_id?: number;
  ip4_count?: number;
  ip6_count?: number;
  cpu_mfg?: string | null;
  cpu_arch?: string | null;
  cpu_features?: string[] | null;
  disk_iops_read?: number | null;
  disk_iops_write?: number | null;
  disk_mbps_read?: number | null;
  disk_mbps_write?: number | null;
  network_mbps?: number | null;
  cpu_limit?: number | null;
  firewall_rule_limit?: number | null;
  transfer_gb?: number | null;
}

export interface AdminCustomTemplateUpdateResult {
  template: AdminCustomTemplateInfo;
  /** New monthly renewal amount written to each VM's line item. */
  renewal_amount: number;
  /** One job per VM that needed host work; empty when nothing had to be applied. */
  job_ids: string[];
}

export interface AdminCostPlanInfo {
  id: number;
  name: string;
  created: string;
  amount: number;
  currency: string;
  interval_amount: number;
  interval_type: "day" | "month" | "year";
  template_count: number;
}

export interface AdminCompanyInfo {
  id: number;
  created: string;
  name: string;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  tax_id: string | null;
  base_currency: string;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  /** Default referral commission (whole %) applied to a referred VM's first payment. */
  referral_rate: number;
  /** Max prepay window in days bounding renewals. 0 = inherit the global default. */
  max_prepay_days: number;
  /**
   * One-off fee charged per marketplace node before an admin can approve it,
   * in this company's `base_currency`. 0 requires no fee.
   */
  marketplace_node_fee: number;
  region_count: number;
}

export interface AdminIpRangeInfo {
  id: number;
  cidr: string;
  gateway: string;
  enabled: boolean;
  region_id: number;
  region_name: string | null;
  reverse_zone_id: string | null;
  access_policy_id: number | null;
  access_policy_name: string | null;
  allocation_mode: IpRangeAllocationMode;
  use_full_range: boolean;
  assignment_count: number;
  available_ips?: number;
  /** dns_server id used for forward (A/AAAA) records */
  forward_dns_server_id: number | null;
  /** dns_server id used for reverse (PTR) records */
  reverse_dns_server_id: number | null;
  /** Forward DNS zone id (provider specific, e.g. Cloudflare forward zone id) */
  forward_zone_id: string | null;
  /** Routers that route this range, resolved via its access policy. Empty when none. */
  routers: { id: number; name: string }[];
}

export interface AdminDnsServerDetail {
  id: number;
  name: string;
  enabled: boolean;
  kind: DnsServerKind;
  url: string;
  /** Number of IP ranges referencing this DNS server (forward or reverse) */
  ip_range_count: number;
}

/** Billing interval type used across the managed app catalog and subscriptions */
export type AppIntervalType = "day" | "month" | "year";

/**
 * A predefined managed app in the catalog. Apps are deployed on shared
 * Kubernetes infra and defined by a docker-compose-style `compose` YAML.
 */
export interface AdminAppInfo {
  id: number;
  /** DNS-safe slug (lowercase letters, digits, hyphens), unique */
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  /** Canonical source repository URL */
  repo_url: string | null;
  /**
   * Short class of software (e.g. "Nostr relay"); free text, always set.
   * The public site templates `{display_name} Hosting — Managed {category}`
   * around it, so whatever is stored here is what search engines show.
   */
  category: string;
  /** Per-app override for the public page `<title>` (English only) */
  seo_title: string | null;
  /** Per-app override for the public page meta description (English only) */
  seo_description: string | null;
  /** docker-compose-style YAML (image/ports/env/volumes) */
  compose: string;
  /** Recurring price in smallest currency units (cents for fiat, milli-sats for BTC) */
  amount: number;
  currency: string;
  interval_amount: number;
  interval_type: AppIntervalType;
  /** One-off setup fee in smallest currency units */
  setup_amount: number;
  enabled: boolean;
  created: string;
  /**
   * Grouping labels currently assigned, ordered by slug. Returned so an editor
   * is never a blind edit: `tags` on create/update is a **replace-set** of
   * slugs, so a form that sends a partial list silently drops the rest.
   */
  tags: AdminAppTagRef[];
  /** Computed resource footprint (Σ service resources + volume sizes) */
  cpu_milli?: number;
  memory_bytes?: number;
  storage_bytes?: number;
}

/** A tag as it appears on an app (the assignment view). */
export interface AdminAppTagRef {
  id: number;
  slug: string;
  display_name: string;
}

/** A tag in the controlled vocabulary, with usage count. */
export interface AdminAppTagInfo {
  id: number;
  /** URL-safe slug (lowercase letters, digits, hyphens), unique. */
  slug: string;
  display_name: string;
  description: string | null;
  /**
   * Number of **enabled** apps carrying this tag — the same count the public
   * facet endpoint reports. A disabled app carrying the tag is not counted.
   */
  app_count: number;
  created: string;
}

/** One service's share of a deployment's observed CPU and memory. */
export interface AppDeploymentServiceUsage {
  /** Compose service name. */
  service: string;
  cpu_milli: number;
  memory_bytes: number;
}

/** One volume's observed use. */
export interface AppDeploymentVolumeUsage {
  /** Compose service this volume belongs to; a volume name is only unique within one. */
  service: string;
  /** Compose volume name. */
  name: string;
  storage_bytes: number;
}

/** What a deployment is consuming, as last observed. */
export interface AppDeploymentUsage {
  cpu_milli: number;
  memory_bytes: number;
  /**
   * `null` for a deployment with no volumes, or when the metrics source carries
   * no kubelet volume statistics — CPU and memory are still reported then.
   */
  storage_bytes: number | null;
  /**
   * When the reading was taken. Usage is sampled on the operator's reconcile
   * interval, not on request, so it is always somewhat behind — render it with
   * the age rather than as a live figure.
   */
  collected: string;
  /**
   * Per-service CPU and memory behind the totals. Empty when nothing has been
   * observed yet. Worth rendering beside the totals rather than instead of
   * them: limits are enforced per container, so a total cannot say which
   * service is the one at its limit.
   */
  services: AppDeploymentServiceUsage[];
  /**
   * Per-volume storage behind `storage_bytes`. Empty when nothing has been
   * observed yet. The size limit is per volume, so a deployment well under its
   * total can still have one volume that is full.
   */
  volumes: AppDeploymentVolumeUsage[];
}

/**
 * A single deployed app instance (across all users/clusters), for admin oversight.
 * Excludes the encrypted per-deployment config blob.
 */
export interface AdminAppDeploymentInfo {
  id: number;
  user_id: number;
  app_id: number;
  cluster_id: number;
  /**
   * Size as a multiple of the catalog app's base footprint and price (`1` = base).
   * Customers raise this via the app upgrade endpoint; it is read-only to admins.
   */
  resource_multiplier: number;
  subscription_line_item_id: number;
  name: string;
  /** Kubernetes namespace the deployment runs in */
  namespace: string;
  /** Public hostname ("{name}.{cluster ingress_domain}"); null until provisioned */
  hostname: string | null;
  /** Customer-owned domain CNAME'd to `hostname`, served alongside it */
  custom_domain: string | null;
  /**
   * Whether that domain is served yet. `false` means held: stored, but never
   * seen resolving to `hostname`, so no ingress rule and no certificate.
   */
  custom_domain_verified: boolean;
  /** Operator-requested state (e.g. "running", "stopped") */
  desired_state: string;
  /** Observed state (e.g. "pending", "running", "stopped", "error", "deleting") */
  status: string;
  /** Human-readable detail on the current status (e.g. an error) */
  status_message: string | null;
  /**
   * Decrypted customer-supplied config (may hold secret values — admin only).
   * Only populated by the single-deployment GET; omitted on the list endpoint.
   */
  config?: Record<string, string> | null;
  /**
   * What the workload is consuming, in the same shape and units the customer
   * API serves. `null` when nothing has been observed: a deployment that has
   * never run, or a cluster with no metrics source.
   */
  usage: AppDeploymentUsage | null;
  created: string;
  /**
   * Soft-deleted: the workload is torn down and the row is retained only for
   * accounting. Only ever `true` in listings requested with `include_deleted`.
   */
  deleted: boolean;
}

/** Observed deployment status, as accepted by the list endpoint's `status` filter. */
export const APP_DEPLOYMENT_STATUSES = ["pending", "running", "stopped", "error", "deleting"] as const;
export type AppDeploymentStatus = (typeof APP_DEPLOYMENT_STATUSES)[number];

/** Desired run state, as accepted by the list endpoint's `desired_state` filter. */
export const APP_DEPLOYMENT_DESIRED_STATES = ["running", "stopped"] as const;
export type AppDeploymentDesiredState = (typeof APP_DEPLOYMENT_DESIRED_STATES)[number];

/**
 * A cluster that managed apps run on. References a region (which provides the
 * billing company) and a wildcard ingress domain.
 */
export interface AdminAppClusterInfo {
  id: number;
  name: string;
  /** References an existing region (drives billing company) */
  region_id: number;
  /** Wildcard base for deployment hostnames ("{name}.{ingress_domain}") */
  ingress_domain: string;
  enabled: boolean;
  /** Static total capacity available for deployments (millicores / bytes / bytes) */
  capacity_cpu_milli: number;
  capacity_memory_bytes: number;
  capacity_storage_bytes: number;
  created: string;
}

/** A DNS zone available on a DNS server (provider specific, e.g. a Cloudflare zone) */
export interface AdminDnsZone {
  /** Provider specific zone id (e.g. Cloudflare zone id) */
  id: string;
  /** Human readable zone name (e.g. example.com) */
  name: string;
}

export interface AdminVmHistoryInfo {
  id: number;
  vm_id: number;
  action_type: AdminVmHistoryActionType;
  timestamp: string;
  initiated_by_user: number | null;
  initiated_by_user_pubkey: string | null;
  initiated_by_user_email: string | null;
  description: string | null;
  /** VM state before the action, as recorded by the API (null when not recorded). */
  previous_state?: Record<string, unknown> | null;
  /** VM state after the action (null when not recorded). */
  new_state?: Record<string, unknown> | null;
  /** Extra context for the action, e.g. reason/admin_action flags (null when not recorded). */
  metadata?: Record<string, unknown> | null;
}

/**
 * The discount applied to one payment, as seen from the payment.
 *
 * Absent when the payment carried no discount. The payment's `amount` is
 * already net of `amount_off` — this only records which code was used.
 */
export interface AdminPaymentDiscountInfo {
  discount_id: number;
  /** The code the customer entered; null for a code-less (automatic) discount. */
  code: string | null;
  /** What was taken off, in minor units of `currency`. */
  amount_off: number;
  currency: string;
  /** False while the discounted invoice is unpaid: it has cost the campaign nothing yet. */
  settled: boolean;
}

export interface AdminVmPaymentInfo {
  id: string;
  vm_id: number;
  created: string;
  expires: string;
  amount: number;
  tax: number;
  processing_fee: number;
  currency: string;
  payment_method: AdminPaymentMethod;
  external_id: string | null;
  is_paid: boolean;
  paid_at: string | null;
  rate: number;
  company_base_currency: string;
  /**
   * What this row is. A `refund` row's `amount`/`tax` are the magnitude returned
   * to the customer, so anything totalling a VM's payments must subtract it.
   */
  payment_type: SubscriptionPaymentType;
  /** For a `refund` row, the hex id of the payment it reverses; null otherwise. */
  refunded_payment_id: string | null;
  /** The discount applied to this payment; omitted when there was none. */
  discount?: AdminPaymentDiscountInfo;
}

export interface AdminRefundAmountInfo {
  amount: number;
  currency: string;
  rate: number;
  expires: string;
  seconds_remaining: number;
}

/** Refunds recorded against one payment, with what is still refundable on it. */
export interface AdminPaymentRefundsInfo {
  /** Hex id of the payment these refunds reverse. */
  payment_id: string;
  /** Currency of the payment and of every amount in this response. */
  currency: string;
  /** Gross amount originally charged, in the smallest unit. */
  amount: number;
  /** Sum of the refunds already recorded against it. */
  refunded_total: number;
  /** `amount - refunded_total`: the ceiling on the next refund. */
  refundable_remaining: number;
  /** The refund rows themselves, oldest first. */
  refunds: AdminVmPaymentInfo[];
}

/** Body for recording a refund that has already been paid out by hand. */
export interface AdminRecordRefundRequest {
  /**
   * Gross magnitude refunded (net + tax), in the refunded payment's own currency
   * and smallest unit. Omit to refund everything still refundable.
   */
  amount?: number;
  /** Why the money was returned. Stored on the refund row and the VM history. */
  reason?: string;
  /** Proof the money moved — Lightning preimage, processor refund id, bank reference. */
  external_ref?: string;
  /**
   * When the money left, unix seconds. Defaults to now. This is the period the
   * refund lands in for reports, so backdating is deliberate.
   */
  refunded_at?: number;
}

export interface AdminAccessPolicyInfo {
  id: number;
  name: string;
  kind: NetworkAccessPolicyKind;
  router_id: number | null;
  interface: string | null;
}

export interface AdminAccessPolicyDetail {
  id: number;
  name: string;
  kind: NetworkAccessPolicyKind;
  router_id: number | null;
  router_name: string | null;
  interface: string | null;
  ip_range_count: number;
}

export interface AdminRouterDetail {
  id: number;
  name: string;
  enabled: boolean;
  kind: RouterKind;
  url: string;
  access_policy_count: number;
}

export type RouterTunnelKind = "gre" | "vxlan" | "wireguard";

export interface AdminRouterTunnelInfo {
  id: number;
  router_id: number;
  name: string;
  kind: RouterTunnelKind;
  local_addr: string | null;
  remote_addr: string | null;
  enabled: boolean;
  last_seen: string | null;
}

export interface RouterTunnelTrafficSample {
  tunnel_name: string;
  rx_bytes: number;
  tx_bytes: number;
  sampled_at: string;
}

export type BgpSessionDirection = "upstream" | "downstream" | "peer" | "unknown";

export interface AdminBgpSessionInfo {
  id: number;
  router_id: number;
  /** Backend session id used for toggling (protocol name / RouterOS .id) */
  name: string;
  peer_ip: string | null;
  peer_asn: number | null;
  local_asn: number | null;
  state: string;
  prefixes_received: number | null;
  prefixes_sent: number | null;
  enabled: boolean;
  direction: BgpSessionDirection;
  last_seen: string | null;
}

export interface AdminRouterBgpRoute {
  router_id: number;
  prefix: string;
  next_hop: string | null;
  is_default: boolean;
  last_seen: string | null;
}

export interface TimeSeriesPeriodSummary {
  period: string;
  currency: string;
  payment_count: number;
  net_total: number;
  tax_total: number;
  base_currency_net: number;
  base_currency_tax: number;
}

export interface TimeSeriesPayment {
  id: string;
  vm_id: number;
  created: string;
  expires: string;
  amount: number;
  currency: string;
  payment_method: AdminPaymentMethod;
  /**
   * A `refund` row's `amount`/`tax` are the magnitude returned to the customer,
   * so any total built from these rows must subtract them (api#193). Use
   * {@link paymentSign}.
   */
  payment_type: SubscriptionPaymentType;
  /** For a refund row, the hex id of the payment it reverses; null otherwise. */
  refunded_payment_id: string | null;
  external_id: string | null;
  is_paid: boolean;
  rate: number;
  time_value: number;
  tax: number;
  company_id: number;
  company_name: string;
  company_base_currency: string;
  user_id: number;
  host_id: number;
  host_name: string;
  region_id: number;
  region_name: string;
}

export interface TimeSeriesReportData {
  start_date: string;
  end_date: string;
  payments: TimeSeriesPayment[];
}

export interface ReferralPeriodSummary {
  period: string;
  ref_code: string;
  currency: string;
  referral_count: number;
  total_amount: number;
}

export interface ReferralRecord {
  vm_id: number;
  ref_code: string;
  created: string;
  amount: number;
  currency: string;
  rate: number;
  base_currency: string;
}

export interface ReferralUsageTimeSeriesReportData {
  start_date: string;
  end_date: string;
  referrals: ReferralRecord[];
}

// Referral Program Management

/** Payout method for a referral enrollment. */
export type ReferralMode = "lightning_address" | "nwc" | "account_credit" | "on_chain";

/**
 * A referral enrollment as seen by admins. Never exposes NWC secrets
 * (the NWC connection lives on the user's payment method, not here).
 */
export interface AdminReferralInfo {
  id: number;
  user_id: number;
  /** Owner's Nostr pubkey (hex), for cross-referencing with users. */
  user_pubkey: string;
  code: string;
  /** Payout destination for the mode (Lightning address, on-chain address, etc.). */
  address: string | null;
  mode: ReferralMode;
  /** Per-referrer commission override (whole %); null = use company default. */
  referral_rate: number | null;
  /** User-chosen payout threshold (satoshis); null = use the system minimum. */
  payout_threshold: number | null;
  created: string;
}

/** Per-currency earned commission for a referral. */
export interface AdminReferralEarning {
  currency: string;
  /** Commission earned = sum of (first payment * effective_rate%) in this currency. */
  amount: number;
}

/**
 * What a referral is still owed in one settled currency, and what that is worth
 * in millisats — the unit the payout threshold is expressed in.
 */
export interface AdminReferralBalance {
  currency: string;
  /** Commission earned in this currency (smallest unit). */
  earned: number;
  /** Already paid **or reserved** against this currency (amount + fee). */
  settled: number;
  /** Still owed = earned - settled, in the currency's smallest unit. */
  outstanding: number;
  /** `outstanding` in millisats at the current rate; null when no rate exists. */
  outstanding_msat: number | null;
}

/**
 * A payout record for a referral (admin view; includes preimage for audit).
 *
 * A payout has a settled side (`amount`, `fee`, `currency`) — what it discharges
 * against the earned balance — and a sent side (`sent_amount`, `sent_fee`,
 * `sent_currency`) — what actually left the wallet. They are equal, with `rate`
 * 1 and `rate_collected` null, when no conversion happened.
 */
export interface AdminReferralPayoutInfo {
  id: number;
  amount: number;
  currency: string;
  created: string;
  is_paid: boolean;
  /** Network/routing fee charged to the referrer, debited from their balance. */
  fee: number;
  /** Amount actually transferred, in the smallest unit of `sent_currency`. */
  sent_amount: number;
  /** Fee as the network charged it, in the smallest unit of `sent_currency`. */
  sent_fee: number;
  /** Currency actually transferred. */
  sent_currency: string;
  /** Settled-currency units per one sent-currency unit; 1 when not converted. */
  rate: number;
  /** When `rate` was quoted; null when no conversion happened. */
  rate_collected: string | null;
  /** Payout mode used for this payout. */
  mode: ReferralMode;
  /** BOLT11 invoice for Lightning payouts, or on-chain outpoint "{txid}:{vout}". */
  output: string | null;
  /** Payment preimage (hex), when the payout has been settled. */
  pre_image: string | null;
}

/** Full referral detail: enrollment + earnings + payout history + counts. */
export interface AdminReferralDetail extends AdminReferralInfo {
  earned: AdminReferralEarning[];
  /** Outstanding (unpaid, unreserved) commission per settled currency. */
  balances: AdminReferralBalance[];
  /**
   * Everything still owed valued in millisats at current rates — the figure the
   * payout threshold is judged against, so it compares directly with
   * `payout_threshold * 1000`. Currencies with no rate are excluded.
   */
  outstanding_total_msat: number;
  payouts: AdminReferralPayoutInfo[];
  /** Referred VMs that made at least one payment. */
  referrals_success: number;
  /** Referred VMs that never made a payment. */
  referrals_failed: number;
}

export interface AdminVmIpAssignmentInfo {
  id: number;
  vm_id: number;
  ip_range_id: number;
  region_id: number;
  user_id: number;
  ip: string;
  deleted: boolean;
  arp_ref: string | null;
  dns_forward: string | null;
  dns_forward_ref: string | null;
  dns_reverse: string | null;
  dns_reverse_ref: string | null;
  ip_range_cidr: string | null;
  region_name: string | null;
}

export interface AdminSshKeyInfo {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  created: string;
}

export interface AdminAvailableIpSpaceInfo {
  id: number;
  /** Owning/selling company for this block. */
  company_id: number;
  cidr: string;
  min_prefix_size: number;
  max_prefix_size: number;
  registry: {
    value: number;
    name: string;
  };
  external_id: string | null;
  is_available: boolean;
  is_reserved: boolean;
  metadata: Record<string, any> | null;
  pricing_count: number;
}

export interface AdminIpSpacePricingInfo {
  id: number;
  available_ip_space_id: number;
  prefix_size: number;
  price_per_month: number;
  currency: string;
  setup_fee: number;
  cidr: string | null;
}

export interface AdminIpRangeSubscriptionInfo {
  id: number;
  subscription_line_item_id: number;
  available_ip_space_id: number;
  cidr: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, any> | null;
  subscription_id: number | null;
  user_id: number | null;
  parent_cidr: string | null;
}

export type AdminSubscriptionType = "ip_range" | "asn_sponsoring" | "dns_hosting" | "vps";

// Typed reference to the resource a line item bills for, resolved from subscription_type.
// `null` when the type has no linkable resource (asn_sponsoring/dns_hosting) or the back-ref is missing.
export type AdminSubscriptionLineItemResource =
  | { type: "vps"; vm_id: number }
  | { type: "ip_range"; ip_range_subscription_id: number };

export interface AdminSubscriptionLineItemInfo {
  id: number;
  subscription_id: number;
  subscription_type: AdminSubscriptionType;
  name: string;
  description: string | null;
  amount: number;
  setup_amount: number;
  // Raw JSON for upgrade bookkeeping only (e.g. { new_cpu, new_memory, new_disk }); NOT a resource link.
  configuration: Record<string, any> | null;
  resource: AdminSubscriptionLineItemResource | null;
}

export interface AdminSubscriptionInfo {
  id: number;
  user_id: number;
  user_pubkey: string;
  name: string;
  description: string | null;
  created: string;
  expires: string | null;
  is_active: boolean;
  is_setup: boolean;
  currency: string;
  interval_amount: number;
  interval_type: "day" | "month" | "year";
  setup_fee: number;
  auto_renewal_enabled: boolean;
  external_id: string | null;
  line_items: AdminSubscriptionLineItemInfo[];
  payment_count: number;
}

export interface AdminSubscriptionPaymentInfo {
  id: string;
  subscription_id: number;
  user_id: number;
  created: string;
  expires: string | null;
  amount: number;
  currency: string;
  payment_method: AdminPaymentMethod;
  payment_type: SubscriptionPaymentType;
  is_paid: boolean;
  paid_at: string | null;
  rate: number | null;
  time_value: number;
  /**
   * Free-form payment metadata. For a refund row this carries
   * `refund.reason`, `refund.external_ref` and `refund.recorded_by_admin_user_id`.
   */
  metadata: Record<string, unknown> | null;
  tax: number;
  processing_fee: number;
  external_id: string | null;
  /** The discount applied to this payment; omitted when there was none. */
  discount?: AdminPaymentDiscountInfo;
  company_id: number | null;
  company_name: string | null;
  company_base_currency: string | null;
}

export type UserPaymentMethodProvider = "nwc" | "revolut";

export interface AdminUserPaymentMethodInfo {
  id: number;
  user_id: number;
  provider: UserPaymentMethodProvider;
  name: string | null;
  created: string;
  has_external_customer_id: boolean;
  card_brand: string | null;
  card_last_four: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
  enabled: boolean;
}

export type ResourceCostResourceType = "vm_host" | "ip_range" | "generic";
export type ResourceCostType = "recurring" | "one_time";
export type ResourceCostIntervalType = "day" | "month" | "year";

export interface AdminResourceCostDetail {
  id: number;
  resource_type: ResourceCostResourceType;
  resource_id: number;
  label: string | null;
  cost_type: ResourceCostType;
  amount: number;
  currency: string;
  interval_amount: number | null;
  interval_type: ResourceCostIntervalType | null;
  billing_start: string | null;
  billing_end: string | null;
  /** Useful life in months for a one-time cost (straight-line depreciation in the P/L report). */
  depreciation_months: number | null;
  created: string;
  updated: string;
}

export interface CreateResourceCostRequest {
  resource_type: ResourceCostResourceType;
  resource_id?: number;
  label?: string | null;
  cost_type: ResourceCostType;
  amount: number;
  currency: string;
  interval_amount?: number | null;
  interval_type?: ResourceCostIntervalType | null;
  billing_start?: string | null;
  billing_end?: string | null;
  /** One-time costs only; null/omitted expenses the purchase immediately. */
  depreciation_months?: number | null;
}

export interface ProfitLossPeriod {
  period: string;
  revenue_net: number;
  revenue_tax: number;
  /** Recurring operating costs (opex). */
  cost_recurring: number;
  /** Accrual charge for capital assets: straight-line depreciation, plus any one-time cost with no useful life set. */
  cost_depreciation: number;
  /** Capex cash paid out this period. Below the line — not part of cost_total or profit. */
  cost_one_time: number;
  /** cost_recurring + cost_depreciation (accrual expense total). */
  cost_total: number;
  /** Accrual profit: revenue_net - cost_total. */
  profit: number;
  /** revenue_net - cost_recurring - cost_one_time (money that actually moved). */
  cash_flow: number;
}

export interface ProfitLossReportData {
  start_date: string;
  end_date: string;
  group_by: "month" | "year";
  currency: string;
  periods: ProfitLossPeriod[];
}

/**
 * One month of renewal activity: what is due, what renewed, and what churned.
 *
 * `subscription.expires` advances on renewal, so a subscription still sitting
 * in a finished month never came back — that is the churn event. The same count
 * in the current or a future month is just the outlook.
 */
export interface RenewalsPeriod {
  /** "2026-09" */
  period: string;
  /** True once the month is over, i.e. its counts are final. */
  complete: boolean;
  /** Subscriptions expiring in this period (per subscription, not per VM). */
  due: number;
  /** Auto-renewal on AND a saved payment method — the worker will charge these. */
  due_auto_capable: number;
  /** Auto-renewal on but no saved method: looks safe, will not auto-charge. */
  due_auto_without_method: number;
  /** Auto-renewal off; renews only if the customer acts. */
  due_manual: number;
  /** Expired more than 7 days ago and never renewed: a settled loss. */
  lapsed: number;
  /** Expired within the last 7 days, decision still in flight (grace period). */
  pending: number;
  /** Expired without ever paying: abandoned signup, excluded from churn. */
  lapsed_never_paid: number;
  /** Distinct subscriptions that renewed in this month. */
  renewed_subscriptions: number;
  /**
   * lapsed / (lapsed + renewed_subscriptions) as a %. Null when nothing has
   * settled. Running rather than final while `complete` is false.
   */
  churn_rate: number | null;
  /** Paid renewal payments created in this period (payments, not subscriptions). */
  renewed: number;
  renewed_auto: number;
  renewed_manual: number;
  /** Created before renewal_source was recorded; not attributable either way. */
  renewed_unknown: number;
}

/** One signup cohort and how much of it is still paid up over time. */
export interface RetentionCohort {
  /** Month the cohort started paying, "2026-02". */
  cohort: string;
  size: number;
  /** retained[n] = still paid through the end of month cohort+n. Truncated at today. */
  retained: number[];
  retained_pct: number[];
}

export interface RenewalsReportData {
  start_date: string;
  end_date: string;
  /** Date renewal_source began being recorded; the split is unavailable before it. */
  source_tracking_since: string | null;
  periods: RenewalsPeriod[];
  /** Signup cohorts, oldest first. */
  cohorts: RetentionCohort[];
}

export type OssReportPeriod = "quarter" | "bimonthly";

export interface OssReportRow {
  /** Filing period bucket, e.g. "2026-Q1" or "2026-B1". */
  period: string;
  company_id: number;
  company_name: string;
  /** Seller company base currency. */
  currency: string;
  /** Destination member state (ISO 3166-1 alpha-3). */
  country_code: string;
  /** Applied VAT rate (whole %). */
  vat_rate: number;
  /** Net sales total in smallest currency units. */
  net_total: number;
  /** VAT total in smallest currency units. */
  tax_total: number;
  transaction_count: number;
}

export interface OssReportData {
  start_date: string;
  end_date: string;
  period: OssReportPeriod;
  rows: OssReportRow[];
}

// Payment Method Config Provider Types for CREATE/UPDATE requests (with actual secrets)
export interface LndProviderConfig {
  type: "lnd";
  url: string;
  cert_path?: string | null;
  macaroon_path?: string | null;
}

export interface BitvoraProviderConfig {
  type: "bitvora";
  token?: string;
  webhook_secret?: string | null;
}

export interface RevolutProviderConfig {
  type: "revolut";
  url: string;
  token?: string;
  api_version?: string | null;
  public_key?: string | null;
  webhook_secret?: string | null;
}

export interface StripeProviderConfig {
  type: "stripe";
  secret_key?: string;
  publishable_key?: string | null;
  webhook_secret?: string | null;
}

export interface PaypalProviderConfig {
  type: "paypal";
  client_id: string;
  client_secret?: string;
  mode?: string | null;
}

export type OnChainAddressType = "witness_pubkey_hash" | "nested_pubkey_hash" | "taproot_pubkey";

export interface OnChainProviderConfig {
  type: "onchain";
  url: string;
  cert_path?: string | null;
  macaroon_path?: string | null;
  address_type?: OnChainAddressType | null;
  account?: string | null;
  min_confirmations?: number | null;
}

export type ProviderConfig =
  | LndProviderConfig
  | BitvoraProviderConfig
  | RevolutProviderConfig
  | StripeProviderConfig
  | PaypalProviderConfig
  | OnChainProviderConfig;

// Sanitized Provider Config Types (what API returns - secrets replaced with boolean indicators)
export interface SanitizedLndProviderConfig {
  type: "lnd";
  url: string;
  cert_path: string | null;
  has_macaroon: boolean;
}

export interface SanitizedBitvoraProviderConfig {
  type: "bitvora";
  has_token: boolean;
  has_webhook_secret: boolean;
}

export interface SanitizedRevolutProviderConfig {
  type: "revolut";
  url: string;
  has_token: boolean;
  api_version: string | null;
  public_key: string | null;
  has_webhook_secret: boolean;
}

export interface SanitizedStripeProviderConfig {
  type: "stripe";
  has_secret_key: boolean;
  publishable_key: string | null;
  has_webhook_secret: boolean;
}

export interface SanitizedPaypalProviderConfig {
  type: "paypal";
  client_id: string;
  has_client_secret: boolean;
  mode: string | null;
}

export interface SanitizedOnChainProviderConfig {
  type: "on_chain";
  url: string;
  cert_path: string;
  macaroon_path: string;
  // Debug-formatted variant name, e.g. "WitnessPubkeyHash", "NestedPubkeyHash", "TaprootPubkey"
  address_type: string;
  account?: string | null;
  min_confirmations: number;
}

export type SanitizedProviderConfig =
  | SanitizedLndProviderConfig
  | SanitizedBitvoraProviderConfig
  | SanitizedRevolutProviderConfig
  | SanitizedStripeProviderConfig
  | SanitizedPaypalProviderConfig
  | SanitizedOnChainProviderConfig;

export interface AdminPaymentMethodConfigInfo {
  id: number;
  company_id: number;
  company_name: string | null;
  payment_method: AdminPaymentMethod;
  name: string;
  enabled: boolean;
  provider_type: PaymentProviderType;
  config: SanitizedProviderConfig | null;
  processing_fee_rate: number | null;
  processing_fee_base: number | null;
  processing_fee_currency: string | null;
  supported_currencies: string[];
  /** Minimum gross payment amount (smallest currency units). null = no minimum. */
  min_amount: number | null;
  /** Currency for min_amount. */
  min_amount_currency: string | null;
  created: string;
  modified: string;
}

// Marketplace

/** Lifecycle state of a marketplace node. */
export type MarketplaceNodeStatus = "pending" | "approved" | "suspended" | "draining";

/** Trust tier of a marketplace node's backing host. */
export type MarketplaceTrustTier = "untrusted" | "verified" | "partner";

/** Payout rail for a marketplace operator. */
export type MarketplaceOperatorMode = "lightning_address" | "nwc" | "account_credit" | "on_chain";

/**
 * A registered marketplace node as an admin sees it.
 *
 * Node tokens are never returned — LNVPS keeps no copy of them. `tls_fingerprint`
 * is `null` when the node cannot be reached (and therefore cannot be approved).
 */
export interface AdminMarketplaceNodeInfo {
  id: number;
  operator_id: number;
  /** The account behind the operator enrolment, so an admin can see whose hardware it is. */
  operator_user_id: number;
  operator_pubkey: string;
  name: string;
  status: MarketplaceNodeStatus;
  trust_tier: MarketplaceTrustTier;
  tls_fingerprint: string | null;
  /** The node's data-plane tunnel, once one is allocated. */
  tunnel_id: number | null;
  /** The backing host row, created by approval. `null` before then. */
  host_id: number | null;
  /** Whether the one-off listing fee has settled. */
  fee_paid: boolean;
  /** The subscription billing the listing fee, once started. */
  fee_subscription_id: number | null;
  last_seen: string | null;
  created: string;
}

/** A marketplace operator enrolment as an admin sees it. */
export interface AdminMarketplaceOperatorInfo {
  id: number;
  user_id: number;
  user_pubkey: string;
  /** Payout target; meaning depends on `mode`. */
  address: string | null;
  mode: MarketplaceOperatorMode;
  /** Minimum accrued earnings (satoshis) before an automated payout runs. */
  payout_threshold: number | null;
  /** Revenue-share override as a whole percentage; `null` = company default. */
  rate: number | null;
  enabled: boolean;
  /** How many nodes this operator has registered. */
  node_count: number;
  created: string;
}

/** Body for approving a marketplace node. */
export interface AdminApproveNodeRequest {
  /** Region the backing host is created in. Required for a first approval. */
  region_id?: number;
  /** Host name; defaults to the operator's own label for the node. */
  name?: string;
  /** Trust tier to grant; omitted leaves the node's current tier. */
  trust_tier?: MarketplaceTrustTier;
  /** Total CPU cores the host may sell. Defaults to 0. */
  cpu?: number;
  /** Total memory in bytes the host may sell. Defaults to 0. */
  memory?: number;
  /** Overcommit factors, default 1.0. */
  load_cpu?: number;
  load_memory?: number;
  load_disk?: number;
}

/** Body for updating a marketplace node (suspend / drain / trust tier). */
export interface AdminUpdateNodeRequest {
  /** `suspended` or `draining` — `approved` is rejected here. */
  status?: MarketplaceNodeStatus;
  trust_tier?: MarketplaceTrustTier;
}

/** Body for updating a marketplace operator's revenue share / payout. */
export interface AdminUpdateOperatorRequest {
  /** Set (0-100) or clear (`null`) the per-operator revenue-share override. */
  rate?: number | null;
  /** Set or clear (in satoshis) the automated-payout threshold. */
  payout_threshold?: number | null;
  /** Payout target address; set or clear. */
  address?: string | null;
  mode?: MarketplaceOperatorMode;
  /** Stop / resume placement across this operator's nodes. */
  enabled?: boolean;
}

/** A marketplace node's packet filter, as the node reports it. */
export interface AdminMarketplaceNodeFirewall {
  available: boolean;
  present: boolean;
  /** Layer-2 isolation between guests. */
  isolated: boolean;
  bindings: number;
  /** The ruleset tag the kernel is enforcing. */
  ruleset: string | null;
  /** Packets dropped for claiming an address the guest was not assigned. */
  spoofed_packets: number;
}

/** A marketplace node's data plane, as the node reports it. */
export interface AdminMarketplaceNodeDataPlane {
  tunnel_up: boolean;
  /** Seconds since the last handshake with the route server. */
  last_handshake_secs: number | null;
  tunnel_mtu: number | null;
  bridge_up: boolean;
  forwarding4: boolean;
  forwarding6: boolean;
  routed_guests: number;
  firewall: AdminMarketplaceNodeFirewall;
}

/** What a marketplace node says about itself right now. */
export interface AdminMarketplaceNodeStatus {
  version: string;
  dataplane: AdminMarketplaceNodeDataPlane;
}

/**
 * How a sale to this user is treated for tax.
 *
 * Read this rather than the rate alone: a `0.0` from `reverse_charge` and one
 * from `out_of_scope` are unrelated situations, and `undetermined_default`
 * means no customer country was known and the seller's own rate was applied.
 */
export type TaxTreatment = "domestic" | "oss_b2c" | "reverse_charge" | "out_of_scope" | "undetermined_default";

/** What one seller company would charge this user, and why. */
export interface AdminUserTaxDetermination {
  company_id: number;
  company_name: string;
  /** Seller country (ISO alpha-3), from the company's VAT number or its configured country. */
  seller_country: string | null;
  /** Whole percentage, e.g. 23.0. */
  rate: number;
  treatment: TaxTreatment;
  /** Determined place of supply (ISO alpha-3). */
  place_of_supply: string | null;
  /** The customer VAT number the determination used. */
  vat_number: string | null;
  /** Evidence: self-declared country. */
  declared_country: string | null;
  /** Evidence: country resolved from their IP. */
  geo_country: string | null;
}

/** A user's tax treatment across every seller company. */
export interface AdminUserTaxInfo {
  /**
   * `false` when the EU rate table has not loaded. Every `rate` is then 0.0
   * because an unknown country falls back to zero — which must not be shown as
   * "this customer pays no VAT". Treatments stay correct regardless.
   */
  rates_loaded: boolean;
  /** One per company: the seller's country is half of the rule. */
  determinations: AdminUserTaxDetermination[];
}

/** The namespace a support thread hangs off. `nostr` is the publicly readable one. */
export const AGENT_CONVERSATION_KINDS = ["user", "email", "pubkey", "nostr", "unknown"] as const;
export type AgentConversationKind = (typeof AGENT_CONVERSATION_KINDS)[number];

/** Who produced a message. `tool` rows are the results the agent's tool calls returned. */
export type AgentMessageRole = "user" | "assistant" | "tool";

/** How a message travelled. Held per message: one private thread mixes channels. */
export type AgentMessageChannel = "email" | "nostr" | "webchat";

/**
 * A support-agent conversation thread.
 *
 * `summary` and `compacted_upto` are the agent's *memory*, which is a different
 * thing from the transcript: the summary stands in for everything at or below
 * the watermark, and messages above it are replayed to the model verbatim.
 */
export interface AdminAgentConversationInfo {
  id: number;
  /** Namespaced sender identity: `user:<id>`, `email:<addr>`, `pubkey:<hex>`, `nostr:<hex>`. */
  conversation_key: string;
  /** The namespace part of the key. `nostr` threads are publicly readable; the rest are private. */
  kind: AgentConversationKind;
  /** Resolved account, when the sender matched one. A thread can start anonymous and become linked. */
  user_id: number | null;
  /** The agent's running memory — model-written text about the customer, not a customer message. */
  summary: string | null;
  /** Highest message id folded into `summary`; 0 when nothing is compacted. */
  compacted_upto: number;
  /** Total messages, ignoring the watermark. */
  message_count: number;
  /** `null` for a thread that has never carried a message. */
  last_message_at: string | null;
  created: string;
  /** Touched on every append and every compaction. */
  updated: string;
}

/** One message in a transcript. */
export interface AdminAgentMessageInfo {
  id: number;
  conversation_id: number;
  role: AgentMessageRole;
  channel: AgentMessageChannel;
  /** Decrypted text. `null` for an assistant turn that only requested tools — not the same as empty. */
  content: string | null;
  /** `[{id, name, arguments}]` for an assistant turn that requested tools. */
  tool_calls: AgentToolCall[] | null;
  /** For a `tool` row, the `tool_calls[].id` it answers. */
  tool_call_id: string | null;
  /** At or below the watermark: the agent no longer replays it and sees the summary instead. */
  compacted: boolean;
  created: string;
}

/** A tool the assistant asked for. `arguments` is a JSON string as the model emitted it. */
export interface AgentToolCall {
  id: string;
  name: string;
  arguments: string;
}

/** Body for rewriting a conversation's memory. Omitting a field leaves it alone. */
export interface AdminUpdateAgentConversationRequest {
  /** Replace the summary, or clear it with `null`. */
  summary?: string | null;
  /** Move the watermark. Must not exceed the last message id; 0 replays the whole transcript. */
  compacted_upto?: number;
}

/**
 * One probe run against a marketplace node.
 *
 * The measurement fields are `null` when the probe never got far enough to take
 * them — a failed run usually carries only `failure`.
 */
export interface AdminNodeHealthInfo {
  id: number;
  created: string;
  passed: boolean;
  /** Why it failed, verbatim from whatever failed. `null` when it passed. */
  failure: string | null;
  /** Asking for the VM to being able to log in — what a customer waits. */
  provision_ms: number | null;
  /** Memory the guest allocated *and touched*, in MB. */
  memory_mb: number | null;
  disk_write_mb: number | null;
  disk_read_mb: number | null;
  /** What was asked for, so the numbers above can be read against a shape. */
  cpu: number;
  memory_bytes: number;
  disk_bytes: number;
  image: string;
}

/** A tunnel pool: where tunnel inner addresses are allocated from. */
export interface AdminTunnelPoolInfo {
  id: number;
  router_id: number;
  router_name: string;
  region_id: number;
  region_name: string;
  name: string;
  /** The WireGuard interface LNVPS configures on the route server, named `wgln<id>`. */
  interface: string;
  /** The address peers send to. */
  listen_addr: string;
  /** The UDP port the interface listens on. */
  listen_port: number;
  /** Derived from `listen_addr` and `listen_port`. */
  endpoint: string;
  /** The interface's public key, hex. The private half is never returned. */
  public_key: string;
  cidr4: string | null;
  cidr6: string | null;
  keepalive: number | null;
  mtu: number;
  enabled: boolean;
  /** Links already carved out of this pool. */
  links_used: number;
  /** Links the smaller of the two blocks can supply. */
  links_total: number;
  created: string;
}

/** Body for creating a tunnel pool. */
export interface CreateTunnelPoolRequest {
  router_id: number;
  region_id: number;
  name: string;
  listen_addr: string;
  /** Defaults to 51820. Unique per route server. */
  listen_port?: number;
  /** Optional existing private key (base64) to adopt an interface that already exists. */
  private_key?: string;
  /** Inner IPv4 block; at least one of the two blocks is required. */
  cidr4?: string;
  /** Inner IPv6 block. */
  cidr6?: string;
  keepalive?: number;
  /** Defaults to 1420. */
  mtu?: number;
  enabled?: boolean;
}

/** Body for updating a tunnel pool. `router_id` is deliberately absent. */
export interface UpdateTunnelPoolRequest {
  region_id?: number;
  name?: string;
  listen_addr?: string;
  listen_port?: number;
  /** Omit to leave alone; blank to generate a fresh keypair. */
  private_key?: string;
  cidr4?: string | null;
  cidr6?: string | null;
  keepalive?: number | null;
  mtu?: number;
  enabled?: boolean;
}

// VPN Services

/**
 * One region a VPN service is sold in, which is one interface a device may
 * dial. A device holds the same key and address in every region, so the region
 * a customer connects to is only a choice of endpoint.
 */
export interface AdminVpnServiceRegion {
  tunnel_pool_id: number;
  region_id: number;
  region_name: string;
  /** What a client dials for this region. */
  endpoint: string;
  /** The interface's public key, hex. */
  public_key: string;
  /** False while the interface is administratively down: devices keep their addresses. */
  enabled: boolean;
}

/** A VPN product: one price, one device allowance, and a set of regions. */
export interface AdminVpnServiceInfo {
  id: number;
  company_id: number;
  name: string;
  currency: string;
  /** Recurring price, in the currency's smallest unit. */
  amount: number;
  interval_amount: number;
  interval_type: "day" | "month" | "year";
  /** One-off charge on the first payment, in the same unit as `amount`. */
  setup_amount: number;
  /** Resolvers handed to clients, comma-separated. */
  dns: string | null;
  /** Devices a plan may register. Lowering it does not disconnect anyone already over it. */
  default_device_limit: number;
  /** False takes the service off sale without touching plans already paid for. */
  enabled: boolean;
  regions: AdminVpnServiceRegion[];
  /** Plans sold against it. Deleting the service is refused while this is non-zero. */
  subscriptions: number;
  created: string;
}

/** Body for creating a VPN service. Created off sale unless `enabled` is passed. */
export interface CreateVpnServiceRequest {
  company_id: number;
  name: string;
  currency: string;
  amount: number;
  /** Defaults to 1 month. */
  interval_amount?: number;
  interval_type?: "day" | "month" | "year";
  /** Defaults to 0. */
  setup_amount?: number;
  dns?: string;
  /** Defaults to 5. */
  default_device_limit?: number;
  enabled?: boolean;
}

/** Body for updating a VPN service. `company_id` is deliberately absent. */
export interface UpdateVpnServiceRequest {
  name?: string;
  currency?: string;
  amount?: number;
  interval_amount?: number;
  interval_type?: "day" | "month" | "year";
  setup_amount?: number;
  dns?: string | null;
  default_device_limit?: number;
  enabled?: boolean;
}

// VPN Subscriptions

/** A device registered against a plan. The private key never leaves the customer. */
export interface AdminVpnDeviceInfo {
  id: number;
  /** Which of the plan's slots it occupies, counted from zero. */
  slot: number;
  /** The customer's label for it. Not an identifier. */
  name: string;
  tunnel_id: number;
  /** The device's public key, hex. */
  public_key: string | null;
  /** The address it holds in every region. */
  address4: string | null;
  address6: string | null;
  /** False while the peer is administratively down: it keeps its address. */
  enabled: boolean;
  created: string;
}

/** A customer VPN plan. Read and revoke only; plans exist because a line item was paid for. */
export interface AdminVpnSubscriptionInfo {
  id: number;
  user_id: number;
  vpn_service_id: number;
  vpn_service_name: string;
  /** The line item billing for it, stable for the plan's life. */
  subscription_line_item_id: number;
  /** Whether the plan is currently paid for. Devices on an unpaid plan stay allocated. */
  active: boolean;
  /** When the billing period ends, if the subscription has an expiry. */
  expires: string | null;
  /** Devices this plan may register, from the service. */
  device_limit: number;
  devices: AdminVpnDeviceInfo[];
  created: string;
}

// Discount Management

/**
 * A discount campaign as seen by admins.
 *
 * Eligibility and effect are one CEL expression (`rule`) that returns a
 * decision map. The server clamps the result (percent 0..=100, amount >= 0 and
 * never more than the order total), so a badly written rule cannot over-
 * discount an order. `{}`, `null` and `false` from a rule mean "does not
 * apply".
 */
export interface AdminDiscountInfo {
  id: number;
  company_id: number;
  /**
   * Customer-facing code. Unique across all companies — a customer types a code
   * without choosing a company — and matched exactly (surrounding whitespace
   * trimmed).
   */
  code: string;
  /** Human-readable campaign name. */
  name: string | null;
  /** CEL expression, e.g. `order.amount >= 5000 ? {'percent': 10} : {}`. */
  rule: string;
  /** ISO 8601. Defaults to now at creation. */
  valid_from: string;
  /** ISO 8601. Null = no expiry. Must be after `valid_from`. */
  valid_to: string | null;
  /** Max redemptions; null = unlimited. */
  usage_limit: number | null;
  /** Owned by redemption, not editable. */
  used_count: number;
  /** Max redemptions per customer; null = unlimited. */
  per_user_limit: number | null;
  active: boolean;
  created: string;
  /** What the campaign has cost so far, per currency, in minor units. */
  given_away: { currency: string; amount: number }[];
}

/** One redemption of a discount, newest first in listings. */
export interface AdminDiscountRedemptionInfo {
  id: number;
  discount_id: number;
  user_id: number;
  /** Hex payment hash the discount was redeemed against. */
  subscription_payment_id: string;
  /** Magnitude of the discount in the payment's own currency, minor units. */
  amount_off: number;
  currency: string;
  /** False while the discounted invoice is unpaid. Unsettled rows consume no limit. */
  settled: boolean;
  /** ISO 8601. When the discounted invoice was created. */
  created: string;
  /** ISO 8601. When the payment settled, if it has. */
  settled_at: string | null;
}

/**
 * Body for `POST /api/admin/v1/discounts`.
 *
 * `valid_from` defaults to now; `valid_to` is optional and must be after
 * `valid_from`. `usage_limit` / `per_user_limit` are `null` for unlimited.
 * `active` defaults to `true`.
 */
export interface CreateDiscountRequest {
  company_id: number;
  code: string;
  name?: string;
  rule: string;
  valid_from?: string;
  valid_to?: string | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  active?: boolean;
}

/** Body for `PATCH /api/admin/v1/discounts/{id}` — all fields optional. */
export interface UpdateDiscountRequest {
  code?: string;
  name?: string | null;
  rule?: string;
  valid_from?: string;
  valid_to?: string | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  active?: boolean;
}

/**
 * A sample order for the rule preview endpoint. Every field is optional;
 * omitted fields fall back to a representative sample (a new 100.00 EUR
 * monthly order for an Irish customer with no order history, one standard
 * 2-core VM line).
 */
export interface DiscountPreviewOrder {
  /** Order total, minor units. Use for a minimum-spend threshold. */
  amount?: number;
  currency?: string;
  intervals?: number;
  interval_type?: "day" | "month" | "year";
  is_new?: boolean;
  /** Customer country (ISO alpha-3). */
  country?: string | null;
  /** Customer's settled payment count. */
  orders?: number;
  items?: Record<string, unknown>[];
}

/** Preview response: the decision the rule makes against the sample order. */
/** Recipient selector for a bulk message; populated fields are unioned and de-duplicated by user. */
export interface AdminBulkMessageTarget {
  /** Exactly these users, whether or not they currently own a VM. */
  user_ids?: number[];
  /** Owners of these VMs (deleted VMs select nobody). */
  vm_ids?: number[];
  /** Owners of any non-deleted VM on these hosts. */
  host_ids?: number[];
  /** Owners of any non-deleted VM in these regions. */
  region_ids?: number[];
}

export interface AdminBulkMessageUnreachableUser {
  user_id: number;
  billing_name?: string | null;
}

export interface AdminBulkMessageResult {
  /** False on a dry run, or if the job could not be dispatched. */
  job_dispatched: boolean;
  job_id: string | null;
  /** Users the target resolved to. */
  recipient_count: number;
  /** How many of those have at least one usable contact method. */
  reachable_count: number;
  /** Recipients per contact method; a user opted into several channels counts once per channel. */
  channel_counts: Record<string, number>;
  /** Matched users with no contact method at all — reported, never messaged. */
  unreachable_users: AdminBulkMessageUnreachableUser[];
}

export interface AdminDiscountPreviewResult {
  applies: boolean;
  percent: number | null;
  amount: number | null;
  currency: string | null;
  /** The reduction the sample order would actually get, after clamping. */
  amount_off: number | null;
  /** Set when the rule fails to evaluate or returns a non-decision type. */
  error: string | null;
}

function getConfiguredServerUrl(): string {
  try {
    const saved = localStorage.getItem("lnvps_admin_server_config");
    if (saved) {
      const config = JSON.parse(saved);
      if (config.currentServer) {
        return config.currentServer;
      }
    }
  } catch (e) {
    console.warn("Failed to load server config:", e);
  }
  return window.location.origin;
}

/**
 * Per-tab random prefix for {@link nextAuthSeq}.
 *
 * The counter alone restarts at zero on reload, while the server keeps
 * remembering burnt ids for the whole auth window — so a reload could re-emit
 * an id it had already spent. A prefix per page load (and so per tab) keeps the
 * sequences from ever overlapping.
 */
const AUTH_SEQ_PREFIX = Math.random().toString(36).slice(2, 10);
let authSeqCounter = 0;

/**
 * A value unique to every NIP-98 auth event this tab signs.
 *
 * The API burns auth events by event id (single-use replay protection), and our
 * events otherwise carry only `u`, `method`, the pubkey and a *second*-
 * granularity `created_at`. Two concurrent requests to the same URL therefore
 * signed a byte-identical event, collided on id, and the second was rejected
 * with "Credential has already been used" — which is why a page that issued
 * parallel requests failed to load. Perturbing the event with this makes each
 * id distinct.
 *
 * Tagged `seq` rather than `nonce` because NIP-13 already defines a `nonce` tag
 * with proof-of-work semantics. The server reads only `u`, `method` and
 * `payload`, so any other tag name is simply ignored.
 */
function nextAuthSeq(): string {
  return `${AUTH_SEQ_PREFIX}-${authSeqCounter++}`;
}

export class AdminApi {
  readonly url: string;
  readonly timeout?: number;

  constructor(url?: string, timeout?: number) {
    this.url = url || getConfiguredServerUrl();
    this.timeout = timeout;
  }

  private async handleResponse<T extends ApiResponseBase>(rsp: Response) {
    if (rsp.ok) {
      return (await rsp.json()) as T;
    } else {
      const text = await rsp.text();
      let error: Error;

      // First try to parse as JSON
      try {
        const obj = JSON.parse(text);

        // Handle the nested error structure: { "error": { "code": 403, "reason": "Forbidden", "description": "..." } }
        if (obj.error && typeof obj.error === "object") {
          const errorInfo = obj.error;
          const message = errorInfo.description || errorInfo.reason || `HTTP ${errorInfo.code || rsp.status}`;
          error = new Error(message);

          // Preserve the original error structure for better error detection
          (error as any).errorCode = errorInfo.code || rsp.status;
          (error as any).errorReason = errorInfo.reason;
        } else {
          // Fallback for simple error responses
          error = new Error(obj.error || `HTTP ${rsp.status}: ${rsp.statusText}`);
          (error as any).errorCode = rsp.status;
        }
      } catch (jsonError) {
        // If JSON parsing fails, check if it's HTML
        const isHtml =
          text.trim().toLowerCase().startsWith("<!doctype html") || text.trim().toLowerCase().startsWith("<html");

        if (isHtml) {
          // For HTML responses, use a generic message based on status code
          const statusMessages: Record<number, string> = {
            400: "Bad request - the server could not understand the request",
            401: "Authentication required - please log in again",
            403: "Access forbidden - you do not have permission to access this resource",
            404: "Resource not found - the requested endpoint does not exist",
            500: "Internal server error - please try again later",
            502: "Bad gateway - the server is temporarily unavailable",
            503: "Service unavailable - the server is temporarily down",
          };

          const message = statusMessages[rsp.status] || `Server error (${rsp.status}) - please try again later`;
          error = new Error(message);
          (error as any).errorCode = rsp.status;
          (error as any).isHtmlError = true;
        } else {
          // If it's not JSON and not HTML, treat as plain text error.
          // Keep the body (truncated) - it usually contains the actual failure reason.
          const trimmed = text.trim();
          const snippet = trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
          error = new Error(`HTTP ${rsp.status}: ${snippet || rsp.statusText}`);
          (error as any).errorCode = rsp.status;
        }
      }

      // Just log and throw - let components handle the errors
      handleApiError(error);
      throw error;
    }
  }

  private async authEvent(url: string, method: string) {
    const signer = LoginState.getSigner();
    const seq = nextAuthSeq();
    return await signer?.generic((eb) => {
      return eb.kind(EventKind.HttpAuthentication).tag(["u", url]).tag(["method", method]).tag(["seq", seq]);
    });
  }

  private async auth(url: string, method: string) {
    const auth = await this.authEvent(url, method);
    if (auth) {
      return `Nostr ${base64.encode(new TextEncoder().encode(JSON.stringify(auth)))}`;
    }
  }

  private async req(
    path: string,
    method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH",
    body?: object,
    params?: Record<string, string | number | boolean | undefined>,
  ) {
    // Build URL with query parameters
    const url = new URL(`${this.url}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const controller = new AbortController();
    let timeoutId: number | undefined;

    if (this.timeout) {
      timeoutId = setTimeout(() => controller.abort(), this.timeout);
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: (await this.auth(url.toString(), method)) ?? "",
        },
        signal: controller.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }

  // User Management
  async getUsers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    region_id?: number;
    role?: AdminUserRole;
    has_vms?: boolean;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminUserInfo>>(
      await this.req("/api/admin/v1/users", "GET", undefined, params),
    );
  }

  async getUser(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminUserInfo>>(
      await this.req(`/api/admin/v1/users/${id}`, "GET"),
    );
    return result.data;
  }

  /**
   * Mint a single-use ticket for an endpoint that cannot carry an
   * `Authorization` header (the job-feedback WebSocket).
   *
   * `path` must be the exact path the ticket will be used on — the server binds
   * it and refuses the ticket anywhere else. Mint immediately before use:
   * tickets expire in ~30s and die on first use, so they cannot be cached.
   *
   * Requires the same permission the target endpoint does, so this is never a
   * way to widen access — only to carry existing access through a handshake
   * that cannot send a header.
   */
  async issueAuthTicket(path: string) {
    const result = await this.handleResponse<ApiResponse<AuthTicket>>(
      await this.req("/api/admin/v1/auth/ticket", "POST", { path }),
    );
    return result.data.ticket;
  }

  async getUserByEmail(email: string) {
    const result = await this.handleResponse<ApiResponse<AdminUserInfo>>(
      await this.req("/api/admin/v1/users/by-email", "GET", undefined, { email }),
    );
    return result.data;
  }

  async updateUser(
    id: number,
    data: Partial<{
      email: string;
      contact_nip17: boolean;
      contact_email: boolean;
      country_code: string;
      billing_name: string;
      billing_address_1: string;
      billing_address_2: string;
      billing_city: string;
      billing_state: string;
      billing_postcode: string;
      billing_tax_id: string;
      /** ISO 3166-1 alpha-3; empty string clears. Editing geo bumps geo_updated */
      geo_country_code: string;
      /** empty string clears */
      geo_ip: string;
      /** Free-form admin-only note on the account. */
      notes: string;
      status: AdminUserStatus;
      admin_role: string;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminUserInfo>>(
      await this.req(`/api/admin/v1/users/${id}`, "PATCH", data),
    );
    return result.data;
  }

  /**
   * Permanently purge a user and all of their associated data (irreversible).
   * Rejected if the user still has live (non-deleted) VMs.
   */
  async deleteUser(id: number) {
    return await this.handleResponse<ApiResponse<null>>(await this.req(`/api/admin/v1/users/${id}`, "DELETE"));
  }

  /**
   * TODO(upstream): `GET /api/admin/v1/users/{id}/ssh_keys` is NOT mounted in
   * the admin router — this call always 404s, so the SSH-key picker in
   * CreateVmModal is permanently empty even though `POST /vms` and
   * `POST /vms/custom` both require a valid `ssh_key_id`. Until an endpoint is
   * added in LNVPS/api, CreateVmModal falls back to a manual `ssh_key_id`
   * input whenever this returns nothing.
   */
  async getUserSshKeys(userId: number) {
    const result = await this.handleResponse<ApiResponse<AdminSshKeyInfo[]>>(
      await this.req(`/api/admin/v1/users/${userId}/ssh_keys`, "GET"),
    );
    return result.data;
  }

  /** List the WebAuthn passkeys registered to a user. */
  async getUserPasskeys(userId: number) {
    const result = await this.handleResponse<ApiResponse<AdminPasskeyInfo[]>>(
      await this.req(`/api/admin/v1/users/${userId}/passkeys`, "GET"),
    );
    return result.data;
  }

  /** Revoke a single passkey from a user's account. */
  async revokeUserPasskey(userId: number, passkeyId: number) {
    return await this.handleResponse<ApiResponse<null>>(
      await this.req(`/api/admin/v1/users/${userId}/passkeys/${passkeyId}`, "DELETE"),
    );
  }

  // VM Management
  async getVMs(params?: {
    limit?: number;
    offset?: number;
    user_id?: number;
    host_id?: number;
    pubkey?: string;
    region_id?: number;
    include_deleted?: boolean;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminVmInfo>>(
      await this.req("/api/admin/v1/vms", "GET", undefined, params as any),
    );
  }

  async getVM(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminVmInfo>>(
      await this.req(`/api/admin/v1/vms/${id}`, "GET"),
    );
    return result.data;
  }

  /**
   * Load specific VMs by id in one call, returning the same `AdminVmInfo`
   * objects as `getVM`.
   *
   * Max 100 ids per request; duplicates are collapsed and ids that no longer
   * resolve are omitted, so the result may be shorter than `ids` and callers
   * must match on `id` rather than position.
   */
  async getVmStatuses(ids: number[]) {
    if (ids.length === 0) return [];
    const result = await this.handleResponse<ApiResponse<AdminVmInfo[]>>(
      await this.req("/api/admin/v1/vms/status", "POST", { ids }),
    );
    return result.data;
  }

  /**
   * Daily traffic for one VM over an inclusive UTC date range (max 400 days).
   * Defaults to the current calendar month when the bounds are omitted.
   */
  async getVmTraffic(id: number, params?: { start?: string; end?: string }) {
    const result = await this.handleResponse<ApiResponse<AdminVmTraffic>>(
      await this.req(`/api/admin/v1/vms/${id}/traffic`, "GET", undefined, params),
    );
    return result.data;
  }

  async createVM(data: {
    user_id: number;
    template_id: number;
    image_id: number;
    ssh_key_id: number;
    ref_code?: string;
    reason?: string;
  }) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req("/api/admin/v1/vms", "POST", data),
    );
    return result.data;
  }

  /**
   * Create a VM from an arbitrary spec (rather than a fixed template), billed
   * against a custom pricing plan. The region comes from `pricing_id`.
   *
   * Unknown `disk_type`/`disk_interface`/`cpu_mfg`/`cpu_arch`/`cpu_feature`
   * values are rejected with 400 up front; spec range limits, plan
   * enabled/expiry, image architecture and host capacity are only checked when
   * the async job runs, so those failures surface on the job, not here.
   */
  async createCustomVM(data: AdminCreateCustomVmRequest) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req("/api/admin/v1/vms/custom", "POST", data),
    );
    return result.data;
  }

  async startVM(id: number) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}/start`, "POST"),
    );
    return result.data;
  }

  async stopVM(id: number) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}/stop`, "POST"),
    );
    return result.data;
  }

  /**
   * Patch a VM. Only the fields sent are touched.
   *
   * `admin_notes` is tri-state: a string sets the notes, an explicit `null`
   * clears them, and omitting the key leaves them unchanged. A notes-only
   * change is persisted without reconfiguring the VM on its host, so the
   * returned `job_id` is empty in that case.
   *
   * `mac_address` accepts colon-, dash- or dot-separated or bare hex and is
   * stored normalised as lowercase colon-separated. The server rejects
   * multicast/broadcast and all-zero addresses with 400 and a MAC held by
   * another live VM with 409. An explicit `null` unsets it back to the
   * `ff:ff:ff:ff:ff:ff` sentinel and is only allowed on a deleted VM.
   * Changing it dispatches an `UpdateVmIp` job per IPv4 assignment (so
   * static-ARP routers follow the new address) plus the `ConfigureVm` job
   * whose id is returned. **IPv6 assignments are not recalculated** — an
   * address derived from the old MAC by SLAAC EUI-64 keeps its value.
   */
  async updateVM(
    id: number,
    updates: {
      disabled?: boolean;
      admin_notes?: string | null;
      mac_address?: string | null;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteVM(id: number, reason?: string, purge?: boolean) {
    const body = { reason, ...(purge && { purge: true }) };
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}`, "DELETE", body),
    );
    return result.data;
  }

  /**
   * Move a VM to another host.
   *
   * Dispatches a `MigrateVm` job: the endpoint only rejects the obvious cases
   * (409 when the VM is deleted, already on the target, or the target is
   * disabled; 404 when the host does not exist). Region/architecture/hypervisor
   * mismatches and capacity shortfalls are checked by the worker, so those
   * failures surface on the job rather than here.
   *
   * `live` attempts an online migration; without it a running VM is stopped,
   * moved and started again on the destination. Proxmox hosts only.
   */
  async migrateVM(id: number, data: { target_host_id: number; live?: boolean; reason?: string }) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}/migrate`, "POST", data),
    );
    return result.data;
  }

  async transferVM(id: number, userId: number, reason?: string) {
    const body = { user_id: userId, ...(reason && { reason }) };
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/vms/${id}/transfer`, "POST", body));
  }

  async extendVM(id: number, days: number, reason?: string) {
    const body = { days, ...(reason && { reason }) };
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/vms/${id}/extend`, "PUT", body));
  }

  /**
   * Extend **every active VM** by `days` (1–365) in one request — the
   * compensate-customers-for-downtime action.
   *
   * "Active" is set-up and not deleted, which *includes already-expired VMs*,
   * so this revives lapsed ones; never-paid pending orders and deleted VMs are
   * excluded at the database level. Gated behind the dedicated
   * `virtual_machines::bulk_update` permission rather than plain update.
   */
  async extendAllVMs(days: number, reason?: string) {
    const body = { days, ...(reason && { reason }) };
    const result = await this.handleResponse<ApiResponse<{ extended: number; failed: number }>>(
      await this.req("/api/admin/v1/vms/extend-all", "POST", body),
    );
    return result.data;
  }

  async getVMHistory(vmId: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminVmHistoryInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/history`, "GET", undefined, params),
    );
  }

  async getVMHistoryEntry(vmId: number, historyId: number) {
    const result = await this.handleResponse<ApiResponse<AdminVmHistoryInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/history/${historyId}`, "GET"),
    );
    return result.data;
  }

  async getVMPayments(vmId: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminVmPaymentInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/payments`, "GET", undefined, params),
    );
  }

  async getVMPayment(vmId: number, paymentId: string) {
    const result = await this.handleResponse<ApiResponse<AdminVmPaymentInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/payments/${paymentId}`, "GET"),
    );
    return result.data;
  }

  async completeVMPayment(vmId: number, paymentId: string) {
    const result = await this.handleResponse<ApiResponse<AdminVmPaymentInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/payments/${paymentId}/complete`, "POST"),
    );
    return result.data;
  }

  async calculateVMRefund(vmId: number, method: AdminPaymentMethod, from_date?: number) {
    const params: { method: string; from_date?: number } = { method };
    if (from_date) {
      params.from_date = from_date;
    }
    const result = await this.handleResponse<ApiResponse<AdminRefundAmountInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/refund`, "GET", undefined, params),
    );
    return result.data;
  }

  /**
   * @deprecated Automated refund payout is not implemented — the API answers
   * `501` unconditionally and moves no money (api#193). Issue the refund
   * out-of-band and record it with {@link recordPaymentRefund}.
   */
  async processVMRefund(
    vmId: number,
    data: {
      payment_method: AdminPaymentMethod;
      refund_from_date?: number;
      reason?: string;
      lightning_invoice?: string;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<{ job_dispatched: boolean; job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${vmId}/refund`, "POST", data),
    );
    return result.data;
  }

  /**
   * List the refunds already recorded against one payment, with how much of it
   * is still refundable.
   */
  async getPaymentRefunds(vmId: number, paymentId: string) {
    const result = await this.handleResponse<ApiResponse<AdminPaymentRefundsInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/payments/${paymentId}/refund`, "GET"),
    );
    return result.data;
  }

  /**
   * Record a refund that has **already been paid out by hand** against the
   * payment it reverses. This moves no money — it is the accounting entry, so
   * every earnings figure stops counting the returned money as revenue.
   *
   * Resubmitting an identical refund is a `409`: the row id is derived from
   * `(payment, amount, timestamp, admin)` rather than random.
   */
  async recordPaymentRefund(vmId: number, paymentId: string, data: AdminRecordRefundRequest = {}) {
    const result = await this.handleResponse<ApiResponse<AdminVmPaymentInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/payments/${paymentId}/refund`, "POST", data),
    );
    return result.data;
  }

  // Role Management
  async getRoles(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminRoleInfo>>(
      await this.req("/api/admin/v1/roles", "GET", undefined, params),
    );
  }

  async getRole(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminRoleInfo>>(
      await this.req(`/api/admin/v1/roles/${id}`, "GET"),
    );
    return result.data;
  }

  async createRole(data: { name: string; description?: string; permissions: string[] }) {
    const result = await this.handleResponse<ApiResponse<AdminRoleInfo>>(
      await this.req("/api/admin/v1/roles", "POST", data),
    );
    return result.data;
  }

  async updateRole(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      permissions: string[];
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminRoleInfo>>(
      await this.req(`/api/admin/v1/roles/${id}`, "PATCH", data),
    );
    return result.data;
  }

  async deleteRole(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/roles/${id}`, "DELETE"));
  }

  // User Role Assignments
  async getUserRoles(userId: number) {
    const result = await this.handleResponse<ApiResponse<UserRoleInfo[]>>(
      await this.req(`/api/admin/v1/users/${userId}/roles`, "GET"),
    );
    return result.data;
  }

  /**
   * Grant a role. `expiresAt` (ISO 8601) makes the assignment time-limited;
   * omit for a permanent grant.
   *
   * Requires `roles::update` (not `users::update`). The server also returns 403
   * when the caller assigns a role to themselves, when a non-super-admin grants
   * `super_admin`, or when the granted role holds permissions the caller does
   * not have (super admins are exempt from the subset rule).
   */
  async assignUserRole(userId: number, roleId: number, expiresAt?: string) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/users/${userId}/roles`, "POST", {
        role_id: roleId,
        ...(expiresAt && { expires_at: expiresAt }),
      }),
    );
  }

  /**
   * Revoke a role. Requires `roles::update`. Only a super admin may revoke
   * `super_admin`, and the last super admin cannot revoke their own.
   */
  async revokeUserRole(userId: number, roleId: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/users/${userId}/roles/${roleId}`, "DELETE"),
    );
  }

  // Current user's roles
  async getCurrentUserRoles() {
    const result = await this.handleResponse<ApiResponse<UserRoleInfo[]>>(
      await this.req("/api/admin/v1/me/roles", "GET"),
    );
    return result.data;
  }

  // Host Management
  async getHosts(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminHostInfo>>(
      await this.req("/api/admin/v1/hosts", "GET", undefined, params),
    );
  }

  async getHost(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminHostInfo>>(
      await this.req(`/api/admin/v1/hosts/${id}`, "GET"),
    );
    return result.data;
  }

  async updateHost(
    id: number,
    updates: {
      name?: string;
      ip?: string;
      api_token?: string;
      region_id?: number;
      kind?: string;
      vlan_id?: number | null;
      mtu?: number | null;
      /** Set a decommission date (ISO 8601) to sunset the host; send null to un-sunset (enabled is left untouched). */
      sunset_date?: string | null;
      enabled?: boolean;
      cpu_mfg?: string;
      cpu_arch?: string;
      cpu_features?: string[];
      load_cpu?: number;
      load_memory?: number;
      load_disk?: number;
      ssh_user?: string;
      ssh_key?: string | null;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminHostInfo>>(
      await this.req(`/api/admin/v1/hosts/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async getHostDisks(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminHostDisk[]>>(
      await this.req(`/api/admin/v1/hosts/${id}/disks`, "GET"),
    );
    return result.data;
  }

  async getHostDisk(hostId: number, diskId: number) {
    const result = await this.handleResponse<ApiResponse<AdminHostDisk>>(
      await this.req(`/api/admin/v1/hosts/${hostId}/disks/${diskId}`, "GET"),
    );
    return result.data;
  }

  async updateHostDisk(
    hostId: number,
    diskId: number,
    updates: {
      name?: string;
      size?: number;
      kind?: string;
      interface?: string;
      enabled?: boolean;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminHostDisk>>(
      await this.req(`/api/admin/v1/hosts/${hostId}/disks/${diskId}`, "PATCH", updates),
    );
    return result.data;
  }

  async createHostDisk(
    hostId: number,
    data: {
      name: string;
      size: number;
      kind: string;
      interface: string;
      enabled?: boolean;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminHostDisk>>(
      await this.req(`/api/admin/v1/hosts/${hostId}/disks`, "POST", data),
    );
    return result.data;
  }

  /**
   * Discover VMs that exist on the host but are not tracked in the database
   * (import candidates). Dispatches a worker discovery job and waits for the
   * reply — requires a running worker + Redis and may take up to ~30s.
   * Proxmox hosts only.
   */
  async getUnmanagedVms(hostId: number) {
    const result = await this.handleResponse<ApiResponse<AdminUnmanagedVm[]>>(
      await this.req(`/api/admin/v1/hosts/${hostId}/vms/unmanaged`, "GET"),
    );
    return result.data;
  }

  /**
   * Import an existing host VM into the database and assign it to a user.
   * Billing uses the region's custom pricing (required). Work is performed
   * asynchronously by the worker; the returned `job_id` can be followed on the
   * job feedback WebSocket. Proxmox hosts only.
   */
  async importVm(hostId: number, data: { host_vm_id: number; user_id: number; reason?: string }) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/hosts/${hostId}/vms/import`, "POST", data),
    );
    return result.data;
  }

  /**
   * Force a resource sync ("patch") for a single host. The periodic PatchHosts
   * job only runs on worker startup, so a newly added host keeps its manually
   * entered cpu/memory and has no disks until this is dispatched. Work is
   * performed asynchronously; follow the returned `job_id` on the job feedback
   * WebSocket.
   */
  async patchHost(hostId: number) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/hosts/${hostId}/patch`, "POST"),
    );
    return result.data;
  }

  async createHost(data: {
    name: string;
    ip: string;
    api_token: string;
    region_id: number;
    kind: string;
    vlan_id?: number | null;
    mtu?: number;
    /** Optional decommission date (ISO 8601) to sunset the host on creation. */
    sunset_date?: string | null;
    cpu: number;
    cpu_mfg?: string;
    cpu_arch?: string;
    cpu_features?: string[];
    memory: number;
    enabled?: boolean;
    load_cpu?: number;
    load_memory?: number;
    load_disk?: number;
    ssh_user?: string;
    ssh_key?: string;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminHostInfo>>(
      await this.req("/api/admin/v1/hosts", "POST", data),
    );
    return result.data;
  }

  // Region Management
  async getRegions(params?: { limit?: number; offset?: number; enabled?: boolean }) {
    // Convert boolean to string for URL params
    const queryParams = params
      ? {
          ...params,
          enabled: params.enabled !== undefined ? params.enabled.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminRegionInfo>>(
      await this.req("/api/admin/v1/regions", "GET", undefined, queryParams),
    );
  }

  async getRegion(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminRegionInfo>>(
      await this.req(`/api/admin/v1/regions/${id}`, "GET"),
    );
    return result.data;
  }

  /** `country_code` is ISO 3166-1 alpha-2 and case-insensitive; omit it for an unknown location. */
  async createRegion(data: { name: string; enabled?: boolean; company_id?: number | null; country_code?: string }) {
    const result = await this.handleResponse<ApiResponse<AdminRegionInfo>>(
      await this.req("/api/admin/v1/regions", "POST", data),
    );
    return result.data;
  }

  /** Send `country_code: ""` to clear the country. */
  async updateRegion(
    id: number,
    updates: {
      name?: string;
      enabled?: boolean;
      company_id?: number | null;
      country_code?: string;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminRegionInfo>>(
      await this.req(`/api/admin/v1/regions/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteRegion(id: number) {
    const result = await this.handleResponse<ApiResponse<RegionDeleteResponse>>(
      await this.req(`/api/admin/v1/regions/${id}`, "DELETE"),
    );
    return result.data;
  }

  // VM OS Image Management
  async getVmOsImages(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminVmOsImageInfo>>(
      await this.req("/api/admin/v1/vm_os_images", "GET", undefined, params),
    );
  }

  async getVmOsImage(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminVmOsImageInfo>>(
      await this.req(`/api/admin/v1/vm_os_images/${id}`, "GET"),
    );
    return result.data;
  }

  async createVmOsImage(data: {
    distribution: string;
    flavour: string;
    version: string;
    enabled: boolean;
    release_date: string;
    url: string;
    /** `x86_64` / `arm64`. Defaults to `x86_64` server-side when omitted. */
    cpu_arch?: string;
    default_username?: string;
    sha2?: string;
    sha2_url?: string;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminVmOsImageInfo>>(
      await this.req("/api/admin/v1/vm_os_images", "POST", data),
    );
    return result.data;
  }

  async updateVmOsImage(
    id: number,
    updates: Partial<{
      distribution: string;
      flavour: string;
      version: string;
      enabled: boolean;
      release_date: string;
      url: string;
      /** `x86_64` / `arm64`; send `null` to reset to unspecified ("any"). */
      cpu_arch: string | null;
      default_username: string;
      sha2: string;
      sha2_url: string;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminVmOsImageInfo>>(
      await this.req(`/api/admin/v1/vm_os_images/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async downloadVmOsImage(id: number) {
    const result = await this.handleResponse<ApiResponse<string>>(
      await this.req(`/api/admin/v1/vm_os_images/${id}/download`, "POST"),
    );
    return result.data;
  }

  async deleteVmOsImage(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/vm_os_images/${id}`, "DELETE"));
  }

  // VM Template Management
  async getVmTemplates(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminVmTemplateInfo>>(
      await this.req("/api/admin/v1/vm_templates", "GET", undefined, params),
    );
  }

  async getVmTemplate(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminVmTemplateInfo>>(
      await this.req(`/api/admin/v1/vm_templates/${id}`, "GET"),
    );
    return result.data;
  }

  async createVmTemplate(data: {
    name: string;
    enabled?: boolean;
    expires?: string | null;
    cpu: number;
    cpu_mfg?: string;
    cpu_arch?: string;
    cpu_features?: string[];
    memory: number;
    disk_size: number;
    disk_type: string;
    disk_interface: string;
    cost_plan_id?: number;
    region_id: number;
    /** IPv4 addresses included in the offer; defaults to 1 server-side. */
    ip4_count?: number;
    /** IPv6 addresses included in the offer; defaults to 1 server-side. */
    ip6_count?: number;
    // Cost plan auto-creation fields (used when cost_plan_id not provided)
    cost_plan_name?: string;
    cost_plan_amount?: number;
    cost_plan_currency?: string;
    cost_plan_interval_amount?: number;
    cost_plan_interval_type?: "day" | "month" | "year";
    // Resource limits (optional, null/omitted = uncapped)
    disk_iops_read?: number | null;
    disk_iops_write?: number | null;
    disk_mbps_read?: number | null;
    disk_mbps_write?: number | null;
    network_mbps?: number | null;
    cpu_limit?: number | null;
    /** Monthly outbound transfer allowance in GB; omit/null = unmetered. */
    transfer_gb?: number | null;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminVmTemplateInfo>>(
      await this.req("/api/admin/v1/vm_templates", "POST", data),
    );
    return result.data;
  }

  async updateVmTemplate(
    id: number,
    updates: Partial<{
      name: string;
      enabled: boolean;
      expires: string | null;
      cpu: number;
      cpu_mfg: string | null;
      cpu_arch: string | null;
      cpu_features: string[];
      memory: number;
      disk_size: number;
      disk_type: string;
      disk_interface: string;
      cost_plan_id: number;
      region_id: number;
      ip4_count: number;
      ip6_count: number;
      cost_plan_name: string;
      cost_plan_amount: number;
      cost_plan_currency: string;
      cost_plan_interval_amount: number;
      cost_plan_interval_type: "day" | "month" | "year";
      // Resource limits — set null to remove limit
      disk_iops_read: number | null;
      disk_iops_write: number | null;
      disk_mbps_read: number | null;
      disk_mbps_write: number | null;
      network_mbps: number | null;
      cpu_limit: number | null;
      /** Monthly outbound transfer allowance in GB; null = unmetered. */
      transfer_gb: number | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminVmTemplateInfo>>(
      await this.req(`/api/admin/v1/vm_templates/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteVmTemplate(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/vm_templates/${id}`, "DELETE"));
  }

  // Custom Pricing Management
  async getCustomPricing(params?: { limit?: number; offset?: number; region_id?: number; enabled?: boolean }) {
    // Convert boolean to string for URL params
    const queryParams = params
      ? {
          ...params,
          enabled: params.enabled !== undefined ? params.enabled.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminCustomPricingInfo>>(
      await this.req("/api/admin/v1/custom_pricing", "GET", undefined, queryParams),
    );
  }

  async getCustomPricingModel(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminCustomPricingInfo>>(
      await this.req(`/api/admin/v1/custom_pricing/${id}`, "GET"),
    );
    return result.data;
  }

  async createCustomPricing(data: {
    name: string;
    enabled?: boolean;
    expires?: string | null;
    region_id: number;
    currency: string;
    cpu_mfg?: string;
    cpu_arch?: string;
    cpu_features?: string[];
    cpu_cost: number;
    memory_cost: number;
    ip4_cost: number;
    ip6_cost: number;
    min_cpu: number;
    max_cpu: number;
    min_memory: number;
    max_memory: number;
    /** Selectable IPv4 count range; both default to 1 server-side. */
    min_ip4?: number;
    max_ip4?: number;
    /** Selectable IPv6 count range; both default to 1 server-side. */
    min_ip6?: number;
    max_ip6?: number;
    disk_pricing: {
      kind: string;
      interface: string;
      cost: number;
      min_disk_size: number;
      max_disk_size: number;
    }[];
    disk_iops_read?: number | null;
    disk_iops_write?: number | null;
    disk_mbps_read?: number | null;
    disk_mbps_write?: number | null;
    network_mbps?: number | null;
    cpu_limit?: number | null;
    /** Monthly outbound transfer allowance in GB; omit/null = unmetered. */
    transfer_gb?: number | null;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminCustomPricingInfo>>(
      await this.req("/api/admin/v1/custom_pricing", "POST", data),
    );
    return result.data;
  }

  async updateCustomPricing(
    id: number,
    updates: Partial<{
      name: string;
      enabled: boolean;
      expires: string | null;
      region_id: number;
      currency: string;
      cpu_mfg: string;
      cpu_arch: string;
      cpu_features: string[];
      cpu_cost: number;
      memory_cost: number;
      ip4_cost: number;
      ip6_cost: number;
      min_cpu: number;
      max_cpu: number;
      min_memory: number;
      max_memory: number;
      min_ip4: number;
      max_ip4: number;
      min_ip6: number;
      max_ip6: number;
      disk_pricing: {
        kind: string;
        interface: string;
        cost: number;
        min_disk_size: number;
        max_disk_size: number;
      }[];
      disk_iops_read: number | null;
      disk_iops_write: number | null;
      disk_mbps_read: number | null;
      disk_mbps_write: number | null;
      network_mbps: number | null;
      cpu_limit: number | null;
      /** Monthly outbound transfer allowance in GB; null = unmetered. */
      transfer_gb: number | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminCustomPricingInfo>>(
      await this.req(`/api/admin/v1/custom_pricing/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteCustomPricing(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/custom_pricing/${id}`, "DELETE"));
  }

  async copyCustomPricing(
    id: number,
    data: {
      name: string;
      region_id?: number;
      enabled?: boolean;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminCustomPricingInfo>>(
      await this.req(`/api/admin/v1/custom_pricing/${id}/copy`, "POST", data),
    );
    return result.data;
  }

  // Custom Templates — one VM's spec, created by the custom-VM order and
  // upgrade paths. There is deliberately no create/delete: a template a VM
  // references cannot be removed without orphaning that VM's billing.
  async getCustomTemplate(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminCustomTemplateInfo>>(
      await this.req(`/api/admin/v1/custom_templates/${id}`, "GET"),
    );
    return result.data;
  }

  /**
   * Patch a VM's spec. The server also rewrites the subscription line item to
   * the returned `renewal_amount` and queues host work, so `job_ids` may hold a
   * full upgrade job (stop, resize, reconfigure, start) when CPU, memory or
   * disk grew.
   */
  async updateCustomTemplate(id: number, updates: UpdateCustomTemplateRequest) {
    const result = await this.handleResponse<ApiResponse<AdminCustomTemplateUpdateResult>>(
      await this.req(`/api/admin/v1/custom_templates/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  // Company Management
  async getCompanies(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminCompanyInfo>>(
      await this.req("/api/admin/v1/companies", "GET", undefined, params),
    );
  }

  async getCompany(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminCompanyInfo>>(
      await this.req(`/api/admin/v1/companies/${id}`, "GET"),
    );
    return result.data;
  }

  async createCompany(data: {
    name: string;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    state?: string | null;
    country_code?: string | null;
    tax_id?: string | null;
    base_currency?: string;
    postcode?: string | null;
    phone?: string | null;
    email?: string | null;
    /** Default referral commission (whole %); must be >= 0. */
    referral_rate?: number;
    /** Max prepay window in days; 0 inherits the global default. */
    max_prepay_days?: number;
    /** One-off marketplace node listing fee in `base_currency`; 0 requires no fee. */
    marketplace_node_fee?: number;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminCompanyInfo>>(
      await this.req("/api/admin/v1/companies", "POST", data),
    );
    return result.data;
  }

  async updateCompany(
    id: number,
    updates: Partial<{
      name: string;
      address_1: string | null;
      address_2: string | null;
      city: string | null;
      state: string | null;
      country_code: string | null;
      tax_id: string | null;
      base_currency: string;
      postcode: string | null;
      phone: string | null;
      email: string | null;
      /** Default referral commission (whole %); must be >= 0. */
      referral_rate: number;
      /** Max prepay window in days; 0 inherits the global default. */
      max_prepay_days: number;
      /** One-off marketplace node listing fee in `base_currency`; 0 requires no fee. */
      marketplace_node_fee: number;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminCompanyInfo>>(
      await this.req(`/api/admin/v1/companies/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteCompany(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/companies/${id}`, "DELETE"));
  }

  // IP Range Management
  async getIpRanges(params?: { limit?: number; offset?: number; region_id?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminIpRangeInfo>>(
      await this.req("/api/admin/v1/ip_ranges", "GET", undefined, params),
    );
  }

  async getIpRange(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminIpRangeInfo>>(
      await this.req(`/api/admin/v1/ip_ranges/${id}`, "GET"),
    );
    return result.data;
  }

  async createIpRange(data: {
    cidr: string;
    gateway: string;
    enabled?: boolean;
    region_id: number;
    reverse_zone_id?: string | null;
    access_policy_id?: number | null;
    allocation_mode?: string;
    use_full_range?: boolean;
    forward_dns_server_id?: number | null;
    reverse_dns_server_id?: number | null;
    forward_zone_id?: string | null;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminIpRangeInfo>>(
      await this.req("/api/admin/v1/ip_ranges", "POST", data),
    );
    return result.data;
  }

  async updateIpRange(
    id: number,
    updates: Partial<{
      cidr: string;
      gateway: string;
      enabled: boolean;
      region_id: number;
      reverse_zone_id: string | null;
      access_policy_id: number | null;
      allocation_mode: string;
      use_full_range: boolean;
      forward_dns_server_id: number | null;
      reverse_dns_server_id: number | null;
      forward_zone_id: string | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminIpRangeInfo>>(
      await this.req(`/api/admin/v1/ip_ranges/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteIpRange(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/ip_ranges/${id}`, "DELETE"));
  }

  async getFreeIps(id: number) {
    const result = await this.handleResponse<ApiResponse<string[]>>(
      await this.req(`/api/admin/v1/ip_ranges/${id}/free_ips`, "GET"),
    );
    return result.data;
  }

  /** Queue a PatchIpRangeDns job to re-apply forward + reverse DNS for every assignment in the range. */
  async patchIpRangeDns(id: number) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/ip_ranges/${id}/patch_dns`, "POST"),
    );
    return result.data;
  }

  // DNS Server Management
  async getDnsServers(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminDnsServerDetail>>(
      await this.req("/api/admin/v1/dns_servers", "GET", undefined, params),
    );
  }

  async getDnsServer(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminDnsServerDetail>>(
      await this.req(`/api/admin/v1/dns_servers/${id}`, "GET"),
    );
    return result.data;
  }

  async createDnsServer(data: { name: string; enabled?: boolean; kind: DnsServerKind; url?: string; token: string }) {
    const result = await this.handleResponse<ApiResponse<AdminDnsServerDetail>>(
      await this.req("/api/admin/v1/dns_servers", "POST", data),
    );
    return result.data;
  }

  async updateDnsServer(
    id: number,
    updates: Partial<{
      name: string;
      enabled: boolean;
      kind: DnsServerKind;
      url: string;
      token: string;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminDnsServerDetail>>(
      await this.req(`/api/admin/v1/dns_servers/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteDnsServer(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/dns_servers/${id}`, "DELETE"));
  }

  /** List the DNS zones available on a given DNS server. */
  async getDnsServerZones(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminDnsZone[]>>(
      await this.req(`/api/admin/v1/dns_servers/${id}/zones`, "GET"),
    );
    return result.data;
  }

  // Managed App Catalog

  /**
   * List catalog apps. Filters are applied server-side and combine with AND;
   * omit one rather than passing a blank, which the API rejects.
   * `app` has no soft-delete, so `enabled` is the only visibility filter.
   */
  async getApps(params?: {
    limit?: number;
    offset?: number;
    /** Catalog-enabled flag; omit for both. */
    enabled?: boolean;
    /** Case-insensitive substring match against name, display_name, description. */
    search?: string;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminAppInfo>>(
      await this.req("/api/admin/v1/apps", "GET", undefined, params),
    );
  }

  async getApp(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminAppInfo>>(
      await this.req(`/api/admin/v1/apps/${id}`, "GET"),
    );
    return result.data;
  }

  async createApp(data: {
    name: string;
    display_name: string;
    description?: string | null;
    icon?: string | null;
    repo_url?: string | null;
    /** Required and NOT NULL; the API rejects blank with `400 category is required`. */
    category: string;
    seo_title?: string | null;
    seo_description?: string | null;
    /**
     * Tag slugs to assign. Must already exist in the vocabulary — an unknown
     * slug is a `400` naming it, never an implicit create.
     */
    tags?: string[];
    compose: string;
    amount: number;
    currency: string;
    interval_amount: number;
    interval_type: AppIntervalType;
    setup_amount?: number;
    enabled?: boolean;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminAppInfo>>(
      await this.req("/api/admin/v1/apps", "POST", data),
    );
    return result.data;
  }

  async updateApp(
    id: number,
    updates: Partial<{
      name: string;
      display_name: string;
      description: string | null;
      icon: string | null;
      repo_url: string | null;
      /**
       * Omit to leave unchanged. Unlike the nullable fields around it there is
       * no clear — the column is NOT NULL, and an explicit null is a 400.
       */
      category: string;
      seo_title: string | null;
      seo_description: string | null;
      /**
       * **Replace-set** of tag slugs: the list sent becomes the app's entire
       * tag set, an empty list clears it, and omitting the key leaves the set
       * alone. Never send a partial list.
       */
      tags: string[];
      compose: string;
      amount: number;
      currency: string;
      interval_amount: number;
      interval_type: AppIntervalType;
      setup_amount: number;
      enabled: boolean;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminAppInfo>>(
      await this.req(`/api/admin/v1/apps/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteApp(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/apps/${id}`, "DELETE"));
  }

  // App tags (the controlled vocabulary). All reuse the `app` RBAC resource.

  /** List the whole vocabulary with per-tag app counts. Not paginated. */
  async getAppTags() {
    const result = await this.handleResponse<ApiResponse<AdminAppTagInfo[]>>(
      await this.req("/api/admin/v1/app-tags", "GET"),
    );
    return result.data;
  }

  /** Fetch one tag by id. */
  async getAppTag(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminAppTagInfo>>(
      await this.req(`/api/admin/v1/app-tags/${id}`, "GET"),
    );
    return result.data;
  }

  async createAppTag(data: { slug: string; display_name: string; description?: string | null }) {
    const result = await this.handleResponse<ApiResponse<AdminAppTagInfo>>(
      await this.req("/api/admin/v1/app-tags", "POST", data),
    );
    return result.data;
  }

  /**
   * Patch a tag; omitted fields are unchanged. `slug` and `display_name` are
   * NOT NULL so they have no clear; `description` accepts an explicit null.
   * Renaming a slug breaks any `/apps/tag/{slug}` link already indexed.
   */
  async updateAppTag(id: number, updates: Partial<{ slug: string; display_name: string; description: string | null }>) {
    const result = await this.handleResponse<ApiResponse<AdminAppTagInfo>>(
      await this.req(`/api/admin/v1/app-tags/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  /**
   * Delete a tag, cascading its assignments. Unlike deleting an app this is
   * never refused for being in use — untagging is the point of retiring a tag —
   * so the count of apps it untagged is returned, the cascade being otherwise
   * invisible.
   */
  async deleteAppTag(id: number) {
    const result = await this.handleResponse<ApiResponse<{ assignments_removed: number }>>(
      await this.req(`/api/admin/v1/app-tags/${id}`, "DELETE"),
    );
    return result.data;
  }

  // Managed App Deployments (`app_deployment` RBAC resource)

  /**
   * List deployments across all users/clusters. Excludes `config`.
   *
   * Filters are applied server-side and combine with AND; omit one rather than
   * passing a blank, which the API rejects for the enum-valued ones. Defaults to
   * non-deleted rows only — `include_deleted` is the only way to see a
   * torn-down deployment, and therefore the only way to reach one with purge.
   */
  async getAppDeployments(params?: {
    limit?: number;
    offset?: number;
    user_id?: number;
    app_id?: number;
    cluster_id?: number;
    /** Matches deployments on any cluster in this region. */
    region_id?: number;
    status?: AppDeploymentStatus;
    desired_state?: AppDeploymentDesiredState;
    /** Case-insensitive substring match against name, hostname, custom_domain. */
    search?: string;
    include_deleted?: boolean;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminAppDeploymentInfo>>(
      await this.req("/api/admin/v1/app-deployments", "GET", undefined, params),
    );
  }

  /** Get a single deployment, including its decrypted `config` map. */
  async getAppDeployment(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminAppDeploymentInfo>>(
      await this.req(`/api/admin/v1/app-deployments/${id}`, "GET"),
    );
    return result.data;
  }

  /**
   * Partial update of a deployment (support/ops fixes).
   * `name`: DNS-safe, unique per cluster. `custom_domain`: `""`/`null` clears it.
   * `config`: validated against the app's compose schema, replaces the stored config wholesale.
   */
  async updateAppDeployment(
    id: number,
    updates: { name?: string; custom_domain?: string | null; config?: Record<string, string> },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminAppDeploymentInfo>>(
      await this.req(`/api/admin/v1/app-deployments/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  /**
   * Delete a deployment: billing is deactivated, the row soft-deleted, and the
   * operator tears the namespace and its volumes down on its next reconcile.
   *
   * A deployment whose first payment never confirmed carries no billing history
   * and is removed outright, the same rule VMs use. `purge` additionally removes
   * a *paid* deployment's subscription, line items and payment history — it
   * requires the `super_admin` role and is `403` for anyone else.
   */
  async deleteAppDeployment(id: number, purge?: boolean) {
    const result = await this.handleResponse<ApiResponse<boolean>>(
      await this.req(`/api/admin/v1/app-deployments/${id}`, "DELETE", purge ? { purge: true } : undefined),
    );
    return result.data;
  }

  // Managed App Clusters
  /**
   * List app clusters. Filters are applied server-side and combine with AND;
   * omit one rather than passing a blank. `app_cluster` has no soft-delete, so
   * `enabled` is the only visibility filter.
   */
  async getAppClusters(params?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
    region_id?: number;
    /** Case-insensitive substring match against name, ingress_domain. */
    search?: string;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminAppClusterInfo>>(
      await this.req("/api/admin/v1/app_clusters", "GET", undefined, params),
    );
  }

  async getAppCluster(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminAppClusterInfo>>(
      await this.req(`/api/admin/v1/app_clusters/${id}`, "GET"),
    );
    return result.data;
  }

  async createAppCluster(data: {
    name: string;
    region_id: number;
    ingress_domain: string;
    enabled?: boolean;
    capacity_cpu_milli: number;
    capacity_memory_bytes: number;
    capacity_storage_bytes: number;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminAppClusterInfo>>(
      await this.req("/api/admin/v1/app_clusters", "POST", data),
    );
    return result.data;
  }

  async updateAppCluster(
    id: number,
    updates: Partial<{
      name: string;
      region_id: number;
      ingress_domain: string;
      enabled: boolean;
      capacity_cpu_milli: number;
      capacity_memory_bytes: number;
      capacity_storage_bytes: number;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminAppClusterInfo>>(
      await this.req(`/api/admin/v1/app_clusters/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteAppCluster(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/app_clusters/${id}`, "DELETE"));
  }

  // Access Policy Management
  async getAccessPolicies(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminAccessPolicyDetail>>(
      await this.req("/api/admin/v1/access_policies", "GET", undefined, params),
    );
  }

  async getAccessPolicy(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminAccessPolicyDetail>>(
      await this.req(`/api/admin/v1/access_policies/${id}`, "GET"),
    );
    return result.data;
  }

  async createAccessPolicy(data: {
    name: string;
    kind?: string;
    router_id?: number | null;
    interface?: string | null;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminAccessPolicyDetail>>(
      await this.req("/api/admin/v1/access_policies", "POST", data),
    );
    return result.data;
  }

  async updateAccessPolicy(
    id: number,
    updates: Partial<{
      name: string;
      kind: string;
      router_id: number | null;
      interface: string | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminAccessPolicyDetail>>(
      await this.req(`/api/admin/v1/access_policies/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteAccessPolicy(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/access_policies/${id}`, "DELETE"));
  }

  // Helper endpoint for Access Policies used by IP ranges
  async getAccessPoliciesHelper() {
    const result = await this.handleResponse<ApiResponse<AdminAccessPolicyInfo[]>>(
      await this.req("/api/admin/v1/access_policies", "GET"),
    );
    return result.data;
  }

  // Router Management
  async getRouters(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminRouterDetail>>(
      await this.req("/api/admin/v1/routers", "GET", undefined, params),
    );
  }

  async getRouter(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminRouterDetail>>(
      await this.req(`/api/admin/v1/routers/${id}`, "GET"),
    );
    return result.data;
  }

  async createRouter(data: { name: string; enabled?: boolean; kind: string; url: string; token: string }) {
    const result = await this.handleResponse<ApiResponse<AdminRouterDetail>>(
      await this.req("/api/admin/v1/routers", "POST", data),
    );
    return result.data;
  }

  async updateRouter(
    id: number,
    updates: Partial<{
      name: string;
      enabled: boolean;
      kind: string;
      url: string;
      token: string;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminRouterDetail>>(
      await this.req(`/api/admin/v1/routers/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteRouter(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/routers/${id}`, "DELETE"));
  }

  // Router Tunnels & BGP Sessions
  async getRouterTunnels(routerId: number) {
    const result = await this.handleResponse<ApiResponse<AdminRouterTunnelInfo[]>>(
      await this.req(`/api/admin/v1/routers/${routerId}/tunnels`, "GET"),
    );
    return result.data;
  }

  async getTunnelTraffic(routerId: number, tunnelName: string, params?: { from?: string; to?: string }) {
    const result = await this.handleResponse<ApiResponse<RouterTunnelTrafficSample[]>>(
      await this.req(
        `/api/admin/v1/routers/${routerId}/tunnels/${encodeURIComponent(tunnelName)}/traffic`,
        "GET",
        undefined,
        params,
      ),
    );
    return result.data;
  }

  async getBgpSessions(routerId: number) {
    const result = await this.handleResponse<ApiResponse<AdminBgpSessionInfo[]>>(
      await this.req(`/api/admin/v1/routers/${routerId}/bgp/sessions`, "GET"),
    );
    return result.data;
  }

  async toggleBgpSession(routerId: number, sessionId: string, enabled: boolean) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/routers/${routerId}/bgp/sessions/toggle`, "POST", {
        session_id: sessionId,
        enabled,
      }),
    );
    return result.data;
  }

  async toggleTunnel(routerId: number, tunnelName: string, enabled: boolean) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/routers/${routerId}/tunnels/${encodeURIComponent(tunnelName)}/toggle`, "POST", {
        enabled,
      }),
    );
    return result.data;
  }

  async getBgpRoutes(routerId: number) {
    const result = await this.handleResponse<ApiResponse<AdminRouterBgpRoute[]>>(
      await this.req(`/api/admin/v1/routers/${routerId}/bgp/routes`, "GET"),
    );
    return result.data;
  }

  async setDefaultRoute(routerId: number, nextHop: string) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/routers/${routerId}/routes/default`, "POST", { next_hop: nextHop }),
    );
    return result.data;
  }

  async clearDefaultRoute(routerId: number) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/routers/${routerId}/routes/default`, "DELETE"),
    );
    return result.data;
  }

  // Cost Plan Management
  async getCostPlans(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminCostPlanInfo>>(
      await this.req("/api/admin/v1/cost_plans", "GET", undefined, params),
    );
  }

  async getCostPlan(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminCostPlanInfo>>(
      await this.req(`/api/admin/v1/cost_plans/${id}`, "GET"),
    );
    return result.data;
  }

  async createCostPlan(data: {
    name: string;
    amount: number;
    currency: string;
    interval_amount: number;
    interval_type: "day" | "month" | "year";
  }) {
    const result = await this.handleResponse<ApiResponse<AdminCostPlanInfo>>(
      await this.req("/api/admin/v1/cost_plans", "POST", data),
    );
    return result.data;
  }

  async updateCostPlan(
    id: number,
    updates: Partial<{
      name: string;
      amount: number;
      currency: string;
      interval_amount: number;
      interval_type: "day" | "month" | "year";
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminCostPlanInfo>>(
      await this.req(`/api/admin/v1/cost_plans/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteCostPlan(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/cost_plans/${id}`, "DELETE"));
  }

  // VM IP Assignment Management
  async getVmIpAssignments(params?: {
    limit?: number;
    offset?: number;
    vm_id?: number;
    ip_range_id?: number;
    ip?: string;
    include_deleted?: boolean;
  }) {
    const queryParams = params
      ? {
          ...params,
          include_deleted: params.include_deleted !== undefined ? params.include_deleted.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminVmIpAssignmentInfo>>(
      await this.req("/api/admin/v1/vm_ip_assignments", "GET", undefined, queryParams),
    );
  }

  async getVmIpAssignment(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminVmIpAssignmentInfo>>(
      await this.req(`/api/admin/v1/vm_ip_assignments/${id}`, "GET"),
    );
    return result.data;
  }

  async createVmIpAssignment(data: {
    vm_id: number;
    ip_range_id: number;
    ip?: string | null;
    arp_ref?: string | null;
    dns_forward?: string | null;
    dns_reverse?: string | null;
  }) {
    const result = await this.handleResponse<ApiResponse<{ job_dispatched: boolean; job_id: string }>>(
      await this.req("/api/admin/v1/vm_ip_assignments", "POST", data),
    );
    return result.data;
  }

  async updateVmIpAssignment(
    id: number,
    updates: Partial<{
      ip: string;
      arp_ref: string | null;
      dns_forward: string | null;
      dns_reverse: string | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<{ job_dispatched: boolean; job_id: string }>>(
      await this.req(`/api/admin/v1/vm_ip_assignments/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteVmIpAssignment(id: number) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vm_ip_assignments/${id}`, "DELETE"),
    );
    return result.data;
  }

  // NOTE: there is no `/vms/{id}/ip_assignments`, `/ip_ranges/{id}/assignments`
  // or `/reports/monthly-sales/...` route in the admin API. Filter the flat
  // list instead: `getVmIpAssignments({ vm_id })` / `({ ip_range_id })`.

  // Reports Management
  async getTimeSeriesReport(params: { start_date: string; end_date: string; company_id: number; currency?: string }) {
    const result = await this.handleResponse<ApiResponse<TimeSeriesReportData>>(
      await this.req("/api/admin/v1/reports/time-series", "GET", undefined, params),
    );
    return result.data;
  }

  async getReferralUsageTimeSeriesReport(params: {
    start_date: string;
    end_date: string;
    company_id: number;
    ref_code?: string;
  }) {
    const result = await this.handleResponse<ApiResponse<ReferralUsageTimeSeriesReportData>>(
      await this.req("/api/admin/v1/reports/referral-usage/time-series", "GET", undefined, params),
    );
    return result.data;
  }

  // Referral Program Management
  async getReferrals(params?: { limit?: number; offset?: number; search?: string }) {
    return await this.handleResponse<PaginatedApiResponse<AdminReferralInfo>>(
      await this.req("/api/admin/v1/referrals", "GET", undefined, params),
    );
  }

  async getReferral(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminReferralDetail>>(
      await this.req(`/api/admin/v1/referrals/${id}`, "GET"),
    );
    return result.data;
  }

  /**
   * Update a referral's code and/or commission override.
   * `referral_rate`: pass a number to set, `null` to clear to the company default, omit to leave unchanged.
   * `code`: rename the referral code (non-empty, unique). Renaming cascades to existing VM `ref_code`s.
   */
  async updateReferral(
    id: number,
    updates: { referral_rate?: number | null; code?: string; payout_threshold?: number | null },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminReferralDetail>>(
      await this.req(`/api/admin/v1/referrals/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async getReferralPayouts(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminReferralPayoutInfo[]>>(
      await this.req(`/api/admin/v1/referrals/${id}/payouts`, "GET"),
    );
    return result.data;
  }

  async createReferralPayout(
    id: number,
    data: {
      /** Settled amount (smallest unit of `currency`): what comes off the balance. */
      amount: number;
      /** Currency the commission was earned in, i.e. what this payout discharges. */
      currency: string;
      /** Currency actually transferred, when it differs from `currency`. */
      sent_currency?: string;
      /** Amount transferred (smallest unit of `sent_currency`); required when converting. */
      sent_amount?: number;
      /** Fee as the network charged it (smallest unit of `sent_currency`). */
      sent_fee?: number;
      /** Fee charged to the referrer (smallest unit of `currency`). */
      fee?: number;
      /** Settled units per sent unit; required when converting, rejected otherwise. */
      rate?: number;
      /** When the rate was quoted; defaults to now for a converted payout. */
      rate_collected?: string;
      output?: string;
      mode?: ReferralMode;
      is_paid?: boolean;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminReferralPayoutInfo>>(
      await this.req(`/api/admin/v1/referrals/${id}/payouts`, "POST", data),
    );
    return result.data;
  }

  async updateReferralPayout(
    id: number,
    payoutId: number,
    updates: { is_paid?: boolean; output?: string | null; mode?: ReferralMode; pre_image?: string | null },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminReferralPayoutInfo>>(
      await this.req(`/api/admin/v1/referrals/${id}/payouts/${payoutId}`, "PATCH", updates),
    );
    return result.data;
  }

  // Discount Management
  async getDiscounts(params: { company_id: number; limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminDiscountInfo>>(
      await this.req("/api/admin/v1/discounts", "GET", undefined, params),
    );
  }

  async getDiscount(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminDiscountInfo>>(
      await this.req(`/api/admin/v1/discounts/${id}`, "GET"),
    );
    return result.data;
  }

  async createDiscount(data: CreateDiscountRequest) {
    const result = await this.handleResponse<ApiResponse<AdminDiscountInfo>>(
      await this.req("/api/admin/v1/discounts", "POST", data),
    );
    return result.data;
  }

  async updateDiscount(id: number, updates: UpdateDiscountRequest) {
    const result = await this.handleResponse<ApiResponse<AdminDiscountInfo>>(
      await this.req(`/api/admin/v1/discounts/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  /** Fails once the discount has been redeemed — deactivate instead. */
  async deleteDiscount(id: number) {
    const result = await this.handleResponse<ApiResponse<{ success: boolean }>>(
      await this.req(`/api/admin/v1/discounts/${id}`, "DELETE"),
    );
    return result.data;
  }

  async getDiscountRedemptions(id: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminDiscountRedemptionInfo>>(
      await this.req(`/api/admin/v1/discounts/${id}/redemptions`, "GET", undefined, params),
    );
  }

  /**
   * Evaluate a rule against a sample order without saving anything, so raw CEL
   * can be checked before customers meet it. Omitted `order` fields fall back
   * to a representative sample order.
   */
  async previewDiscountRule(rule: string, order?: DiscountPreviewOrder) {
    const result = await this.handleResponse<ApiResponse<AdminDiscountPreviewResult>>(
      await this.req("/api/admin/v1/discounts/preview", "POST", { rule, order }),
    );
    return result.data;
  }

  // Bulk messaging
  /**
   * Dispatch (or, with `dry_run`, merely resolve) a bulk message.
   *
   * Omitting `target` messages every active customer. A `target` whose lists
   * are all empty is rejected server-side with a 400 rather than being treated
   * as "everyone", so callers must not send one.
   */
  async sendBulkMessage(params: {
    subject: string;
    message: string;
    target?: AdminBulkMessageTarget;
    dry_run?: boolean;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminBulkMessageResult>>(
      await this.req("/api/admin/v1/users/bulk-message", "POST", params),
    );
    return result.data;
  }

  // IP Space Management
  async getIpSpaces(params?: { limit?: number; offset?: number; is_available?: boolean; registry?: number }) {
    const queryParams = params
      ? {
          ...params,
          is_available: params.is_available !== undefined ? params.is_available.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminAvailableIpSpaceInfo>>(
      await this.req("/api/admin/v1/ip_space", "GET", undefined, queryParams),
    );
  }

  async getIpSpace(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminAvailableIpSpaceInfo>>(
      await this.req(`/api/admin/v1/ip_space/${id}`, "GET"),
    );
    return result.data;
  }

  async createIpSpace(data: {
    /** Required by the API — omitting it is a `422`. */
    company_id: number;
    cidr: string;
    min_prefix_size: number;
    max_prefix_size: number;
    registry: number;
    external_id?: string | null;
    is_available?: boolean;
    is_reserved?: boolean;
    metadata?: Record<string, any> | null;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminAvailableIpSpaceInfo>>(
      await this.req("/api/admin/v1/ip_space", "POST", data),
    );
    return result.data;
  }

  async updateIpSpace(
    id: number,
    updates: Partial<{
      cidr: string;
      min_prefix_size: number;
      max_prefix_size: number;
      registry: number;
      external_id: string | null;
      is_available: boolean;
      is_reserved: boolean;
      metadata: Record<string, any> | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminAvailableIpSpaceInfo>>(
      await this.req(`/api/admin/v1/ip_space/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteIpSpace(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/ip_space/${id}`, "DELETE"));
  }

  // IP Space Pricing Management
  async getIpSpacePricing(spaceId: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminIpSpacePricingInfo>>(
      await this.req(`/api/admin/v1/ip_space/${spaceId}/pricing`, "GET", undefined, params),
    );
  }

  async getIpSpacePricingItem(spaceId: number, pricingId: number) {
    const result = await this.handleResponse<ApiResponse<AdminIpSpacePricingInfo>>(
      await this.req(`/api/admin/v1/ip_space/${spaceId}/pricing/${pricingId}`, "GET"),
    );
    return result.data;
  }

  async createIpSpacePricing(
    spaceId: number,
    data: {
      prefix_size: number;
      price_per_month: number;
      currency?: string | null;
      setup_fee?: number | null;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminIpSpacePricingInfo>>(
      await this.req(`/api/admin/v1/ip_space/${spaceId}/pricing`, "POST", data),
    );
    return result.data;
  }

  async updateIpSpacePricing(
    spaceId: number,
    pricingId: number,
    updates: Partial<{
      prefix_size: number;
      price_per_month: number;
      currency: string;
      setup_fee: number;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminIpSpacePricingInfo>>(
      await this.req(`/api/admin/v1/ip_space/${spaceId}/pricing/${pricingId}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteIpSpacePricing(spaceId: number, pricingId: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/ip_space/${spaceId}/pricing/${pricingId}`, "DELETE"),
    );
  }

  // IP Space Subscriptions
  async getIpSpaceSubscriptions(
    spaceId: number,
    params?: {
      limit?: number;
      offset?: number;
      user_id?: number;
      is_active?: boolean;
    },
  ) {
    const queryParams = params
      ? {
          ...params,
          is_active: params.is_active !== undefined ? params.is_active.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminIpRangeSubscriptionInfo>>(
      await this.req(`/api/admin/v1/ip_space/${spaceId}/subscriptions`, "GET", undefined, queryParams),
    );
  }

  // Subscription Management
  async getSubscriptions(params?: {
    limit?: number;
    offset?: number;
    user_id?: number;
    search?: string;
    status?: "active" | "inactive";
    auto_renewal?: boolean;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminSubscriptionInfo>>(
      await this.req("/api/admin/v1/subscriptions", "GET", undefined, params),
    );
  }

  async getSubscription(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionInfo>>(
      await this.req(`/api/admin/v1/subscriptions/${id}`, "GET"),
    );
    return result.data;
  }

  async createSubscription(data: {
    user_id: number;
    /** Selling company. Required by the API — omitting it is a `422`. */
    company_id: number;
    name: string;
    description?: string;
    expires?: string;
    is_active: boolean;
    currency: string;
    interval_amount: number;
    interval_type: "day" | "month" | "year";
    setup_fee: number;
    auto_renewal_enabled: boolean;
    external_id?: string;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionInfo>>(
      await this.req("/api/admin/v1/subscriptions", "POST", data),
    );
    return result.data;
  }

  async updateSubscription(
    id: number,
    updates: Partial<{
      name: string;
      description: string;
      expires: string | null;
      is_active: boolean;
      currency: string;
      interval_amount: number;
      interval_type: "day" | "month" | "year";
      setup_fee: number;
      auto_renewal_enabled: boolean;
      external_id: string;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionInfo>>(
      await this.req(`/api/admin/v1/subscriptions/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  /**
   * Grant free time on any subscription (apps, IP ranges, ASN sponsoring, DNS
   * hosting, VPS) — the subscription-level counterpart of {@link extendVM}.
   *
   * No payment row is written: this is granted time, not a settlement. `days`
   * must be 1–365 and is added to the current expiry (or to now when the
   * subscription has no expiry yet), so unused paid time is never lost.
   * Granting time also flips `is_setup`/`is_active` to true, otherwise the
   * lifecycle worker would tear the resource down despite the extension.
   */
  async extendSubscription(id: number, days: number, reason?: string) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionInfo>>(
      await this.req(`/api/admin/v1/subscriptions/${id}/extend`, "PUT", { days, ...(reason && { reason }) }),
    );
    return result.data;
  }

  /**
   * Delete a subscription. A regular delete is refused while paid payments
   * exist; `purge` bypasses that guard and cascades line items and payments.
   *
   * `purge` requires the `super_admin` role (`403` otherwise) and is refused
   * while a VM or app deployment still references one of the line items — those
   * resources must be deleted first.
   */
  async deleteSubscription(id: number, purge = false) {
    await this.handleResponse<ApiResponse<{ deleted: boolean }>>(
      await this.req(`/api/admin/v1/subscriptions/${id}`, "DELETE", purge ? { purge: true } : undefined),
    );
  }

  // Subscription Line Items
  async getSubscriptionLineItems(subscriptionId: number) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionLineItemInfo[]>>(
      await this.req(`/api/admin/v1/subscriptions/${subscriptionId}/line_items`, "GET"),
    );
    return result.data;
  }

  async getSubscriptionLineItem(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionLineItemInfo>>(
      await this.req(`/api/admin/v1/subscription_line_items/${id}`, "GET"),
    );
    return result.data;
  }

  async createSubscriptionLineItem(data: {
    subscription_id: number;
    /** What is being sold. Required by the API — omitting it is a `422`. */
    subscription_type: SubscriptionType;
    name: string;
    description?: string;
    amount: number;
    setup_amount: number;
    configuration?: Record<string, any>;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionLineItemInfo>>(
      await this.req("/api/admin/v1/subscription_line_items", "POST", data),
    );
    return result.data;
  }

  async updateSubscriptionLineItem(
    id: number,
    updates: Partial<{
      name: string;
      description: string;
      amount: number;
      setup_amount: number;
      configuration: Record<string, any>;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionLineItemInfo>>(
      await this.req(`/api/admin/v1/subscription_line_items/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteSubscriptionLineItem(id: number) {
    await this.handleResponse<ApiResponse<{ deleted: boolean }>>(
      await this.req(`/api/admin/v1/subscription_line_items/${id}`, "DELETE"),
    );
  }

  // Subscription Payments
  async getSubscriptionPayments(subscriptionId: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminSubscriptionPaymentInfo>>(
      await this.req(`/api/admin/v1/subscriptions/${subscriptionId}/payments`, "GET", undefined, params),
    );
  }

  async getSubscriptionPayment(hexId: string) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionPaymentInfo>>(
      await this.req(`/api/admin/v1/subscription_payments/${hexId}`, "GET"),
    );
    return result.data;
  }

  async completeSubscriptionPayment(hexId: string) {
    const result = await this.handleResponse<ApiResponse<AdminSubscriptionPaymentInfo>>(
      await this.req(`/api/admin/v1/subscription_payments/${hexId}/complete`, "POST"),
    );
    return result.data;
  }

  // Payment Method Config Management
  async getPaymentMethodConfigs(params?: { limit?: number; offset?: number; company_id?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminPaymentMethodConfigInfo>>(
      await this.req("/api/admin/v1/payment_methods", "GET", undefined, params),
    );
  }

  async getPaymentMethodConfig(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminPaymentMethodConfigInfo>>(
      await this.req(`/api/admin/v1/payment_methods/${id}`, "GET"),
    );
    return result.data;
  }

  async createPaymentMethodConfig(data: {
    company_id: number;
    payment_method: AdminPaymentMethod;
    name: string;
    enabled?: boolean;
    provider_type: PaymentProviderType;
    config?: ProviderConfig | null;
    processing_fee_rate?: number | null;
    processing_fee_base?: number | null;
    processing_fee_currency?: string | null;
    supported_currencies?: string[] | null;
    min_amount?: number | null;
    min_amount_currency?: string | null;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminPaymentMethodConfigInfo>>(
      await this.req("/api/admin/v1/payment_methods", "POST", data),
    );
    return result.data;
  }

  async updatePaymentMethodConfig(
    id: number,
    updates: Partial<{
      company_id: number;
      payment_method: AdminPaymentMethod;
      name: string;
      enabled: boolean;
      provider_type: PaymentProviderType;
      config: ProviderConfig | null;
      processing_fee_rate: number | null;
      processing_fee_base: number | null;
      processing_fee_currency: string | null;
      supported_currencies: string[] | null;
      min_amount: number | null;
      min_amount_currency: string | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminPaymentMethodConfigInfo>>(
      await this.req(`/api/admin/v1/payment_methods/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deletePaymentMethodConfig(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/payment_methods/${id}`, "DELETE"));
  }

  // User Payment Methods (users' saved payment methods for auto-renewal)
  async getUserPaymentMethods(params?: { limit?: number; offset?: number; user_id?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminUserPaymentMethodInfo>>(
      await this.req("/api/admin/v1/user_payment_methods", "GET", undefined, params),
    );
  }

  async getUserPaymentMethod(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminUserPaymentMethodInfo>>(
      await this.req(`/api/admin/v1/user_payment_methods/${id}`, "GET"),
    );
    return result.data;
  }

  async updateUserPaymentMethod(
    id: number,
    updates: Partial<{ is_default: boolean; enabled: boolean; name: string | null }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminUserPaymentMethodInfo>>(
      await this.req(`/api/admin/v1/user_payment_methods/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteUserPaymentMethod(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/user_payment_methods/${id}`, "DELETE"));
  }

  // Resource Cost Tracking
  async getResourceCosts(params?: {
    limit?: number;
    offset?: number;
    resource_type?: ResourceCostResourceType;
    resource_id?: number;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminResourceCostDetail>>(
      await this.req("/api/admin/v1/resource_costs", "GET", undefined, params),
    );
  }

  async getResourceCost(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminResourceCostDetail>>(
      await this.req(`/api/admin/v1/resource_costs/${id}`, "GET"),
    );
    return result.data;
  }

  async createResourceCost(data: CreateResourceCostRequest) {
    const result = await this.handleResponse<ApiResponse<AdminResourceCostDetail>>(
      await this.req("/api/admin/v1/resource_costs", "POST", data),
    );
    return result.data;
  }

  async updateResourceCost(id: number, updates: Partial<Omit<CreateResourceCostRequest, "resource_type">>) {
    const result = await this.handleResponse<ApiResponse<AdminResourceCostDetail>>(
      await this.req(`/api/admin/v1/resource_costs/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteResourceCost(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/resource_costs/${id}`, "DELETE"));
  }

  // Marketplace — Nodes
  async getMarketplaceNodes(params?: {
    limit?: number;
    offset?: number;
    status?: MarketplaceNodeStatus;
    operator_id?: number;
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminMarketplaceNodeInfo>>(
      await this.req("/api/admin/v1/marketplace/nodes", "GET", undefined, params),
    );
  }

  async getMarketplaceNode(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminMarketplaceNodeInfo>>(
      await this.req(`/api/admin/v1/marketplace/nodes/${id}`, "GET"),
    );
    return result.data;
  }

  /** Calls the node and returns what it says about itself right now. */
  async getMarketplaceNodeStatus(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminMarketplaceNodeStatus>>(
      await this.req(`/api/admin/v1/marketplace/nodes/${id}/status`, "GET"),
    );
    return result.data;
  }

  async approveMarketplaceNode(id: number, data: AdminApproveNodeRequest) {
    const result = await this.handleResponse<ApiResponse<AdminMarketplaceNodeInfo>>(
      await this.req(`/api/admin/v1/marketplace/nodes/${id}/approve`, "POST", data),
    );
    return result.data;
  }

  async updateMarketplaceNode(id: number, updates: AdminUpdateNodeRequest) {
    const result = await this.handleResponse<ApiResponse<AdminMarketplaceNodeInfo>>(
      await this.req(`/api/admin/v1/marketplace/nodes/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  /**
   * Probe history for a node, newest first. A 404 means the node does not
   * exist, as distinct from a node that has never been probed (empty page).
   */
  async getMarketplaceNodeHealth(id: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminNodeHealthInfo>>(
      await this.req(`/api/admin/v1/marketplace/nodes/${id}/health`, "GET", undefined, params),
    );
  }

  async deleteMarketplaceNode(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/marketplace/nodes/${id}`, "DELETE"));
  }

  // Marketplace — Operators
  async getMarketplaceOperators(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminMarketplaceOperatorInfo>>(
      await this.req("/api/admin/v1/marketplace/operators", "GET", undefined, params),
    );
  }

  async getMarketplaceOperator(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminMarketplaceOperatorInfo>>(
      await this.req(`/api/admin/v1/marketplace/operators/${id}`, "GET"),
    );
    return result.data;
  }

  async updateMarketplaceOperator(id: number, updates: AdminUpdateOperatorRequest) {
    const result = await this.handleResponse<ApiResponse<AdminMarketplaceOperatorInfo>>(
      await this.req(`/api/admin/v1/marketplace/operators/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  /**
   * What tax this user attracts right now, per seller company.
   *
   * Computed live from the pricing code, so it answers "what would we charge
   * them today" — not what they were charged, which lives on the payments.
   */
  async getUserTax(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminUserTaxInfo>>(
      await this.req(`/api/admin/v1/users/${id}/tax`, "GET"),
    );
    return result.data;
  }

  // Support Agent Conversations
  /**
   * List support threads, most recently active first.
   *
   * `search` matches the conversation key only — message content is encrypted
   * at rest, so the server cannot search it. The key includes the namespace, so
   * `"nostr:"` selects every public thread.
   */
  async getAgentConversations(params?: { limit?: number; offset?: number; user_id?: number; search?: string }) {
    return await this.handleResponse<PaginatedApiResponse<AdminAgentConversationInfo>>(
      await this.req("/api/admin/v1/agent/conversations", "GET", undefined, params),
    );
  }

  async getAgentConversation(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminAgentConversationInfo>>(
      await this.req(`/api/admin/v1/agent/conversations/${id}`, "GET"),
    );
    return result.data;
  }

  /** A conversation's transcript, **oldest first** — it reads as a conversation, not a feed. */
  async getAgentConversationMessages(id: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminAgentMessageInfo>>(
      await this.req(`/api/admin/v1/agent/conversations/${id}/messages`, "GET", undefined, params),
    );
  }

  /**
   * Rewrite what the agent remembers. Never touches the transcript.
   *
   * Clearing `summary` alone is the safe reset. Setting `compacted_upto` to 0
   * makes the next turn replay the entire transcript, which is slow and
   * expensive on a long thread.
   */
  async updateAgentConversation(id: number, updates: AdminUpdateAgentConversationRequest) {
    const result = await this.handleResponse<ApiResponse<AdminAgentConversationInfo>>(
      await this.req(`/api/admin/v1/agent/conversations/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  // Tunnel Pools
  async getTunnelPools(params?: { limit?: number; offset?: number; region_id?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminTunnelPoolInfo>>(
      await this.req("/api/admin/v1/tunnel_pools", "GET", undefined, params),
    );
  }

  async getTunnelPool(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminTunnelPoolInfo>>(
      await this.req(`/api/admin/v1/tunnel_pools/${id}`, "GET"),
    );
    return result.data;
  }

  async createTunnelPool(data: CreateTunnelPoolRequest) {
    const result = await this.handleResponse<ApiResponse<AdminTunnelPoolInfo>>(
      await this.req("/api/admin/v1/tunnel_pools", "POST", data),
    );
    return result.data;
  }

  async updateTunnelPool(id: number, updates: UpdateTunnelPoolRequest) {
    const result = await this.handleResponse<ApiResponse<AdminTunnelPoolInfo>>(
      await this.req(`/api/admin/v1/tunnel_pools/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteTunnelPool(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/tunnel_pools/${id}`, "DELETE"));
  }

  /** Re-applies the pool's interface on its route server. */
  async syncTunnelPool(id: number) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/tunnel_pools/${id}/sync`, "POST"),
    );
    return result.data;
  }

  // VPN Services

  /** `include_disabled` defaults to true: an admin listing shows what a customer cannot see. */
  async getVpnServices(params?: { limit?: number; offset?: number; include_disabled?: boolean }) {
    return await this.handleResponse<PaginatedApiResponse<AdminVpnServiceInfo>>(
      await this.req("/api/admin/v1/vpn_services", "GET", undefined, params),
    );
  }

  async getVpnService(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminVpnServiceInfo>>(
      await this.req(`/api/admin/v1/vpn_services/${id}`, "GET"),
    );
    return result.data;
  }

  async createVpnService(data: CreateVpnServiceRequest) {
    const result = await this.handleResponse<ApiResponse<AdminVpnServiceInfo>>(
      await this.req("/api/admin/v1/vpn_services", "POST", data),
    );
    return result.data;
  }

  async updateVpnService(id: number, updates: UpdateVpnServiceRequest) {
    const result = await this.handleResponse<ApiResponse<AdminVpnServiceInfo>>(
      await this.req(`/api/admin/v1/vpn_services/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  /** Refused while the service has subscribers. Retiring one is `enabled: false`. */
  async deleteVpnService(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/vpn_services/${id}`, "DELETE"));
  }

  /**
   * Make a tunnel pool's region available to every device on the service.
   *
   * The pool must carry the same address block as the service's others, and one
   * already terminating another service is refused rather than repointed.
   */
  async linkVpnServicePool(id: number, poolId: number) {
    const result = await this.handleResponse<ApiResponse<AdminVpnServiceInfo>>(
      await this.req(`/api/admin/v1/vpn_services/${id}/pools/${poolId}`, "POST"),
    );
    return result.data;
  }

  /** Withdraw a region. Devices keep their addresses and every other region. */
  async unlinkVpnServicePool(id: number, poolId: number) {
    const result = await this.handleResponse<ApiResponse<AdminVpnServiceInfo>>(
      await this.req(`/api/admin/v1/vpn_services/${id}/pools/${poolId}`, "DELETE"),
    );
    return result.data;
  }

  // VPN Subscriptions

  async getVpnSubscriptions(params?: { limit?: number; offset?: number; user_id?: number; vpn_service_id?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminVpnSubscriptionInfo>>(
      await this.req("/api/admin/v1/vpn_subscriptions", "GET", undefined, params),
    );
  }

  async getVpnSubscription(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminVpnSubscriptionInfo>>(
      await this.req(`/api/admin/v1/vpn_subscriptions/${id}`, "GET"),
    );
    return result.data;
  }

  /**
   * Revoke a device: its keypair is deleted and its slot freed, and every
   * interface on the service is re-pushed so the key stops working everywhere.
   */
  async revokeVpnDevice(id: number, deviceId: number, reason?: string) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/vpn_subscriptions/${id}/devices/${deviceId}`, "DELETE", { reason }),
    );
  }

  // Profit/Loss report
  async getProfitLossReport(params: {
    start_date: string;
    end_date: string;
    group_by?: "month" | "year";
    company_id?: number;
    region_id?: number;
    currency?: string;
  }) {
    const result = await this.handleResponse<ApiResponse<ProfitLossReportData>>(
      await this.req("/api/admin/v1/reports/profit-loss", "GET", undefined, params),
    );
    return result.data;
  }

  /**
   * Renewal outlook and churn per month.
   *
   * Two independent halves: `due_*` comes from subscription expiry dates
   * (forward looking), `renewed_*` from paid renewal payments (backward
   * looking). Only `due_auto_capable` will actually be charged automatically —
   * `due_auto_without_method` has the flag set but nothing to charge.
   */
  async getRenewalsReport(params: { start_date: string; end_date: string; company_id: number; region_id?: number }) {
    const result = await this.handleResponse<ApiResponse<RenewalsReportData>>(
      await this.req("/api/admin/v1/reports/renewals", "GET", undefined, params),
    );
    return result.data;
  }

  // OSS (One-Stop Shop) VAT report
  async getOssReport(params: { start_date: string; end_date: string; company_id?: number; period?: OssReportPeriod }) {
    const result = await this.handleResponse<ApiResponse<OssReportData>>(
      await this.req("/api/admin/v1/reports/oss", "GET", undefined, params),
    );
    return result.data;
  }

  /**
   * Fleet traffic ranking, heaviest outbound sender first. `total` counts VMs
   * with traffic in range, not daily rows. Range may span at most 400 days.
   */
  async getTrafficReport(params?: { start?: string; end?: string; limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<FleetTrafficRow>>(
      await this.req("/api/admin/v1/reports/traffic", "GET", undefined, params as any),
    );
  }
}

export const adminApi = new AdminApi();
