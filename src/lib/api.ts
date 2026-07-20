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
}

export enum AdminPaymentMethod {
  LIGHTNING = "lightning",
  REVOLUT = "revolut",
  PAYPAL = "paypal",
  STRIPE = "stripe",
}

export enum PaymentProviderType {
  LND = "lnd",
  BITVORA = "bitvora",
  REVOLUT = "revolut",
  STRIPE = "stripe",
  PAYPAL = "paypal",
}

export enum SubscriptionPaymentType {
  PURCHASE = "purchase",
  RENEWAL = "renewal",
}

export enum SubscriptionType {
  IP_RANGE = "ip_range",
  ASN_SPONSORING = "asn_sponsoring",
  DNS_HOSTING = "dns_hosting",
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

export interface ApiResponseBase {
  error?: string;
}

// Single item response
export interface ApiResponse<T> extends ApiResponseBase {
  data: T;
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
  subscription: AdminSubscriptionInfo | null;
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
  disks: {
    id: number;
    name: string;
    size: number;
    kind: DiskType;
    interface: DiskInterface;
    enabled: boolean;
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

export interface AdminHostStats {
  total_vms: number; // Count of active (non-deleted) VMs only
  cpu_usage: number | null;
  memory_usage: number | null;
  disk_usage: number | null;
}

export interface AdminRegionInfo {
  id: number;
  name: string;
  enabled: boolean;
  company_id: number | null;
  host_count: number;
  total_vms: number; // Count of active (non-deleted) VMs only
  total_cpu_cores: number;
  total_memory_bytes: number; // Total memory in bytes (not GB)
  total_ip_assignments: number; // IP assignments from active VMs only
}

export interface AdminRegionStats {
  total_hosts: number;
  total_vms: number; // Count of active (non-deleted) VMs only
}

export interface AdminHostDisk {
  id: number;
  name: string;
  size: number;
  kind: string;
  interface: string;
  enabled: boolean;
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
  region_name: string | null; // Populated with region name
  cost_plan_name: string | null; // Populated with cost plan name
  active_vm_count: number;
  disk_iops_read: number | null;
  disk_iops_write: number | null;
  disk_mbps_read: number | null;
  disk_mbps_write: number | null;
  network_mbps: number | null;
  cpu_limit: number | null;
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
}

export interface AdminCustomTemplateInfo {
  id: number;
  cpu: number;
  memory: number;
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  pricing_id: number;
  pricing_name: string | null;
  region_id: number;
  region_name: string | null;
  currency: string;
  calculated_cost: {
    cpu_cost: number;
    memory_cost: number;
    disk_cost: number;
    ip4_cost: number;
    ip6_cost: number;
    total_monthly_cost: number;
  };
  vm_count: number;
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

export interface CustomPricingCalculation {
  currency: string;
  cpu_cost: number;
  memory_cost: number;
  disk_cost: number;
  ip4_cost: number;
  ip6_cost: number;
  total_monthly_cost: number;
  configuration: {
    cpu: number;
    memory: number;
    disk_size: number;
    disk_type: DiskType;
    disk_interface: DiskInterface;
    ip4_count: number;
    ip6_count: number;
  };
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
}

export interface AdminRefundAmountInfo {
  amount: number;
  currency: string;
  rate: number;
  expires: string;
  seconds_remaining: number;
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
export type ReferralMode = "lightning_address" | "nwc" | "account_credit";

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
  lightning_address: string | null;
  mode: ReferralMode;
  /** Per-referrer commission override (whole %); null = use company default. */
  referral_rate: number | null;
  created: string;
}

/** Per-currency earned commission for a referral. */
export interface AdminReferralEarning {
  currency: string;
  /** Commission earned = sum of (first payment * effective_rate%) in this currency. */
  amount: number;
}

/** A payout record for a referral (admin view; includes preimage for audit). */
export interface AdminReferralPayoutInfo {
  id: number;
  amount: number;
  currency: string;
  created: string;
  is_paid: boolean;
  invoice: string | null;
  /** Payment preimage (hex), when the payout has been settled. */
  pre_image: string | null;
}

/** Full referral detail: enrollment + earnings + payout history + counts. */
export interface AdminReferralDetail extends AdminReferralInfo {
  earned: AdminReferralEarning[];
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
  tax: number;
  processing_fee: number;
  external_id: string | null;
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
}

export interface ProfitLossPeriod {
  period: string;
  revenue_net: number;
  revenue_tax: number;
  cost_recurring: number;
  cost_one_time: number;
  cost_total: number;
  profit: number;
}

export interface ProfitLossReportData {
  start_date: string;
  end_date: string;
  group_by: "month" | "year";
  currency: string;
  periods: ProfitLossPeriod[];
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

export type ProviderConfig =
  | LndProviderConfig
  | BitvoraProviderConfig
  | RevolutProviderConfig
  | StripeProviderConfig
  | PaypalProviderConfig;

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

export type SanitizedProviderConfig =
  | SanitizedLndProviderConfig
  | SanitizedBitvoraProviderConfig
  | SanitizedRevolutProviderConfig
  | SanitizedStripeProviderConfig
  | SanitizedPaypalProviderConfig;

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
  created: string;
  modified: string;
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
          // If it's not JSON and not HTML, treat as plain text error
          const message =
            text.length > 200
              ? `HTTP ${rsp.status}: ${rsp.statusText}`
              : `HTTP ${rsp.status}: ${text || rsp.statusText}`;
          error = new Error(message);
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
    return await signer?.generic((eb) => {
      return eb.kind(EventKind.HttpAuthentication).tag(["u", url]).tag(["method", method]);
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
    return await this.handleResponse<ApiResponse<null>>(
      await this.req(`/api/admin/v1/users/${id}`, "DELETE"),
    );
  }

  // Note: This endpoint may need to be implemented based on actual API
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

  async updateVM(
    id: number,
    updates: {
      disabled?: boolean;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteVM(id: number, reason?: string) {
    const body = { reason };
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}`, "DELETE", body),
    );
    return result.data;
  }

  async extendVM(id: number, days: number, reason?: string) {
    const body = { days, ...(reason && { reason }) };
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/vms/${id}/extend`, "PUT", body));
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

  async assignUserRole(userId: number, roleId: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/users/${userId}/roles`, "POST", {
        role_id: roleId,
      }),
    );
  }

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

  async getHostStats(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminHostStats>>(
      await this.req(`/api/admin/v1/hosts/${id}/stats`, "GET"),
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

  async createHost(data: {
    name: string;
    ip: string;
    api_token: string;
    region_id: number;
    kind: string;
    vlan_id?: number | null;
    mtu?: number;
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

  async createRegion(data: { name: string; enabled?: boolean; company_id?: number | null }) {
    const result = await this.handleResponse<ApiResponse<AdminRegionInfo>>(
      await this.req("/api/admin/v1/regions", "POST", data),
    );
    return result.data;
  }

  async updateRegion(
    id: number,
    updates: {
      name?: string;
      enabled?: boolean;
      company_id?: number | null;
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

  async getRegionStats(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminRegionStats>>(
      await this.req(`/api/admin/v1/regions/${id}/stats`, "GET"),
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

  async getCustomTemplates(pricingId: number, params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<PaginatedApiResponse<AdminCustomTemplateInfo>>(
      await this.req(`/api/admin/v1/custom_pricing/${pricingId}/templates`, "GET", undefined, params),
    );
  }

  async createCustomTemplate(
    pricingId: number,
    data: {
      cpu: number;
      memory: number;
      disk_size: number;
      disk_type: string;
      disk_interface: string;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminCustomTemplateInfo>>(
      await this.req(`/api/admin/v1/custom_pricing/${pricingId}/templates`, "POST", data),
    );
    return result.data;
  }

  async getCustomTemplate(id: number) {
    const result = await this.handleResponse<ApiResponse<AdminCustomTemplateInfo>>(
      await this.req(`/api/admin/v1/custom_templates/${id}`, "GET"),
    );
    return result.data;
  }

  async updateCustomTemplate(
    id: number,
    updates: Partial<{
      cpu: number;
      memory: number;
      disk_size: number;
      disk_type: string;
      disk_interface: string;
      pricing_id: number;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminCustomTemplateInfo>>(
      await this.req(`/api/admin/v1/custom_templates/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteCustomTemplate(id: number) {
    await this.handleResponse<ApiResponse<void>>(await this.req(`/api/admin/v1/custom_templates/${id}`, "DELETE"));
  }

  async calculateCustomPricing(
    pricingId: number,
    data: {
      cpu: number;
      memory: number;
      disk_size: number;
      disk_type: string;
      disk_interface: string;
      ip4_count?: number;
      ip6_count?: number;
    },
  ) {
    const result = await this.handleResponse<ApiResponse<CustomPricingCalculation>>(
      await this.req(`/api/admin/v1/custom_pricing/${pricingId}/calculate`, "POST", data),
    );
    return result.data;
  }

  async getRegionCustomPricing(regionId: number, params?: { limit?: number; offset?: number; enabled?: boolean }) {
    // Convert boolean to string for URL params
    const queryParams = params
      ? {
          ...params,
          enabled: params.enabled !== undefined ? params.enabled.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminCustomPricingInfo>>(
      await this.req(`/api/admin/v1/regions/${regionId}/custom_pricing`, "GET", undefined, queryParams),
    );
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

  async getVmIpAssignmentsByVm(
    vmId: number,
    params?: {
      limit?: number;
      offset?: number;
      include_deleted?: boolean;
    },
  ) {
    const queryParams = params
      ? {
          ...params,
          include_deleted: params.include_deleted !== undefined ? params.include_deleted.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminVmIpAssignmentInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/ip_assignments`, "GET", undefined, queryParams),
    );
  }

  async getVmIpAssignmentsByRange(
    ipRangeId: number,
    params?: {
      limit?: number;
      offset?: number;
      include_deleted?: boolean;
    },
  ) {
    const queryParams = params
      ? {
          ...params,
          include_deleted: params.include_deleted !== undefined ? params.include_deleted.toString() : undefined,
        }
      : undefined;

    return await this.handleResponse<PaginatedApiResponse<AdminVmIpAssignmentInfo>>(
      await this.req(`/api/admin/v1/ip_ranges/${ipRangeId}/assignments`, "GET", undefined, queryParams),
    );
  }

  // Reports Management
  async getMonthlySalesReport(year: number, month: number, company_id: number) {
    const result = await this.handleResponse<ApiResponse<any>>(
      await this.req(`/api/admin/v1/reports/monthly-sales/${year}/${month}/${company_id}`, "GET"),
    );
    return result.data;
  }

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
  async updateReferral(id: number, updates: { referral_rate?: number | null; code?: string }) {
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
    data: { amount: number; currency: string; invoice?: string; is_paid?: boolean },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminReferralPayoutInfo>>(
      await this.req(`/api/admin/v1/referrals/${id}/payouts`, "POST", data),
    );
    return result.data;
  }

  async updateReferralPayout(
    id: number,
    payoutId: number,
    updates: { is_paid?: boolean; invoice?: string | null; pre_image?: string | null },
  ) {
    const result = await this.handleResponse<ApiResponse<AdminReferralPayoutInfo>>(
      await this.req(`/api/admin/v1/referrals/${id}/payouts/${payoutId}`, "PATCH", updates),
    );
    return result.data;
  }

  // Bulk messaging
  async sendBulkMessage(params: { subject: string; message: string }) {
    const result = await this.handleResponse<ApiResponse<{ job_dispatched: boolean; job_id: string }>>(
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

  async deleteSubscription(id: number) {
    await this.handleResponse<ApiResponse<{ deleted: boolean }>>(
      await this.req(`/api/admin/v1/subscriptions/${id}`, "DELETE"),
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

  // OSS (One-Stop Shop) VAT report
  async getOssReport(params: { start_date: string; end_date: string; company_id?: number; period?: OssReportPeriod }) {
    const result = await this.handleResponse<ApiResponse<OssReportData>>(
      await this.req("/api/admin/v1/reports/oss", "GET", undefined, params),
    );
    return result.data;
  }
}

export const adminApi = new AdminApi();
