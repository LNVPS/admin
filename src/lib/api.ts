import { EventKind } from "@snort/system";
import { base64 } from "@scure/base";
import { LoginState } from "./login";
import { handleApiError } from "./errorHandler";
import ISO3166 from "iso-3166-1";

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
  RUNNING = "running",
  STOPPED = "stopped",
  STARTING = "starting",
  DELETING = "deleting",
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

export enum NetworkAccessPolicyKind {
  STATIC_ARP = "static_arp",
}

export enum RouterKind {
  MIKROTIK = "mikrotik",
  OVH_ADDITIONAL_IP = "ovh_additional_ip",
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
  vm_count: number;
  last_login: string | null;
  is_admin: boolean;
  has_nwc: boolean;
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
  expires: string;
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
  ref_code: string | null;
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
  memory: number;
  enabled: boolean;
  load_cpu: number; // CPU load factor: 0-1 (e.g., 0.75 = 75% load)
  load_memory: number; // Memory load factor: 0-1 (e.g., 0.75 = 75% load)
  load_disk: number; // Disk load factor: 0-1 (e.g., 0.75 = 75% load)
  vlan_id: number | null;
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
}

export interface AdminVmTemplateInfo {
  id: number;
  name: string;
  enabled: boolean;
  created: string;
  expires: string | null;
  cpu: number;
  memory: number;
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  cost_plan_id: number;
  region_id: number;
  region_name: string | null; // Populated with region name
  cost_plan_name: string | null; // Populated with cost plan name
  active_vm_count: number;
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
  currency: string;
  payment_method: AdminPaymentMethod;
  external_id: string | null;
  is_paid: boolean;
  rate: number;
  base_currency: string;
}

export interface AdminRefundAmountInfo {
  amount: number;
  currency: string;
  rate: number;
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
  period: string;
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
          const message =
            errorInfo.description ||
            errorInfo.reason ||
            `HTTP ${errorInfo.code || rsp.status}`;
          error = new Error(message);

          // Preserve the original error structure for better error detection
          (error as any).errorCode = errorInfo.code || rsp.status;
          (error as any).errorReason = errorInfo.reason;
        } else {
          // Fallback for simple error responses
          error = new Error(
            obj.error || `HTTP ${rsp.status}: ${rsp.statusText}`,
          );
          (error as any).errorCode = rsp.status;
        }
      } catch (jsonError) {
        // If JSON parsing fails, check if it's HTML
        const isHtml =
          text.trim().toLowerCase().startsWith("<!doctype html") ||
          text.trim().toLowerCase().startsWith("<html");

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

          const message =
            statusMessages[rsp.status] ||
            `Server error (${rsp.status}) - please try again later`;
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
      return eb
        .kind(EventKind.HttpAuthentication)
        .tag(["u", url])
        .tag(["method", method]);
    });
  }

  private async auth(url: string, method: string) {
    const auth = await this.authEvent(url, method);
    if (auth) {
      return `Nostr ${base64.encode(
        new TextEncoder().encode(JSON.stringify(auth)),
      )}`;
    }
  }

  private async req(
    path: string,
    method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH",
    body?: object,
    params?: Record<string, string | number | undefined>,
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
  }) {
    return await this.handleResponse<PaginatedApiResponse<AdminUserInfo>>(
      await this.req("/api/admin/v1/users", "GET", undefined, params),
    );
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
      admin_role: string;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminUserInfo>>(
      await this.req(`/api/admin/v1/users/${id}`, "PATCH", data),
    );
    return result.data;
  }

  // Note: This endpoint may need to be implemented based on actual API
  async getUserSshKeys(userId: number) {
    const result = await this.handleResponse<ApiResponse<AdminSshKeyInfo[]>>(
      await this.req(`/api/admin/v1/users/${userId}/ssh_keys`, "GET"),
    );
    return result.data;
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

  async deleteVM(id: number, reason?: string) {
    const body = reason ? { reason } : undefined;
    const result = await this.handleResponse<ApiResponse<{ job_id: string }>>(
      await this.req(`/api/admin/v1/vms/${id}`, "DELETE", body),
    );
    return result.data;
  }

  async extendVM(id: number, days: number, reason?: string) {
    const body = { days, ...(reason && { reason }) };
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/vms/${id}/extend`, "PUT", body),
    );
  }

  async getVMHistory(
    vmId: number,
    params?: { limit?: number; offset?: number },
  ) {
    return await this.handleResponse<PaginatedApiResponse<AdminVmHistoryInfo>>(
      await this.req(
        `/api/admin/v1/vms/${vmId}/history`,
        "GET",
        undefined,
        params,
      ),
    );
  }

  async getVMHistoryEntry(vmId: number, historyId: number) {
    const result = await this.handleResponse<ApiResponse<AdminVmHistoryInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/history/${historyId}`, "GET"),
    );
    return result.data;
  }

  async getVMPayments(vmId: number) {
    const result = await this.handleResponse<ApiResponse<AdminVmPaymentInfo[]>>(
      await this.req(`/api/admin/v1/vms/${vmId}/payments`, "GET"),
    );
    return result.data;
  }

  async getVMPayment(vmId: number, paymentId: string) {
    const result = await this.handleResponse<ApiResponse<AdminVmPaymentInfo>>(
      await this.req(`/api/admin/v1/vms/${vmId}/payments/${paymentId}`, "GET"),
    );
    return result.data;
  }

  async calculateVMRefund(
    vmId: number,
    method: AdminPaymentMethod,
    from_date?: number,
  ) {
    const params: { method: string; from_date?: number } = { method };
    if (from_date) {
      params.from_date = from_date;
    }
    const result = await this.handleResponse<
      ApiResponse<AdminRefundAmountInfo>
    >(
      await this.req(
        `/api/admin/v1/vms/${vmId}/refund`,
        "GET",
        undefined,
        params,
      ),
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
    const result = await this.handleResponse<
      ApiResponse<{ job_dispatched: boolean; job_id: string }>
    >(await this.req(`/api/admin/v1/vms/${vmId}/refund`, "POST", data));
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

  async createRole(data: {
    name: string;
    description?: string;
    permissions: string[];
  }) {
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
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/roles/${id}`, "DELETE"),
    );
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
      enabled?: boolean;
      load_cpu?: number;
      load_memory?: number;
      load_disk?: number;
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
      await this.req(
        `/api/admin/v1/hosts/${hostId}/disks/${diskId}`,
        "PATCH",
        updates,
      ),
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

  async createHost(data: {
    name: string;
    ip: string;
    api_token: string;
    region_id: number;
    kind: string;
    vlan_id?: number | null;
    cpu: number;
    memory: number;
    enabled?: boolean;
    load_cpu?: number;
    load_memory?: number;
    load_disk?: number;
  }) {
    const result = await this.handleResponse<ApiResponse<AdminHostInfo>>(
      await this.req("/api/admin/v1/hosts", "POST", data),
    );
    return result.data;
  }

  // Region Management
  async getRegions(params?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }) {
    // Convert boolean to string for URL params
    const queryParams = params
      ? {
          ...params,
          enabled:
            params.enabled !== undefined
              ? params.enabled.toString()
              : undefined,
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

  async createRegion(data: {
    name: string;
    enabled?: boolean;
    company_id?: number | null;
  }) {
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
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminVmOsImageInfo>>(
      await this.req(`/api/admin/v1/vm_os_images/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteVmOsImage(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/vm_os_images/${id}`, "DELETE"),
    );
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
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminVmTemplateInfo>>(
      await this.req(`/api/admin/v1/vm_templates/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteVmTemplate(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/vm_templates/${id}`, "DELETE"),
    );
  }

  // Custom Pricing Management
  async getCustomPricing(params?: {
    limit?: number;
    offset?: number;
    region_id?: number;
    enabled?: boolean;
  }) {
    // Convert boolean to string for URL params
    const queryParams = params
      ? {
          ...params,
          enabled:
            params.enabled !== undefined
              ? params.enabled.toString()
              : undefined,
        }
      : undefined;

    return await this.handleResponse<
      PaginatedApiResponse<AdminCustomPricingInfo>
    >(
      await this.req(
        "/api/admin/v1/custom_pricing",
        "GET",
        undefined,
        queryParams,
      ),
    );
  }

  async getCustomPricingModel(id: number) {
    const result = await this.handleResponse<
      ApiResponse<AdminCustomPricingInfo>
    >(await this.req(`/api/admin/v1/custom_pricing/${id}`, "GET"));
    return result.data;
  }

  async createCustomPricing(data: {
    name: string;
    enabled?: boolean;
    expires?: string | null;
    region_id: number;
    currency: string;
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
  }) {
    const result = await this.handleResponse<
      ApiResponse<AdminCustomPricingInfo>
    >(await this.req("/api/admin/v1/custom_pricing", "POST", data));
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
    }>,
  ) {
    const result = await this.handleResponse<
      ApiResponse<AdminCustomPricingInfo>
    >(await this.req(`/api/admin/v1/custom_pricing/${id}`, "PATCH", updates));
    return result.data;
  }

  async deleteCustomPricing(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/custom_pricing/${id}`, "DELETE"),
    );
  }

  async copyCustomPricing(
    id: number,
    data: {
      name: string;
      region_id?: number;
      enabled?: boolean;
    },
  ) {
    const result = await this.handleResponse<
      ApiResponse<AdminCustomPricingInfo>
    >(await this.req(`/api/admin/v1/custom_pricing/${id}/copy`, "POST", data));
    return result.data;
  }

  async getCustomTemplates(
    pricingId: number,
    params?: { limit?: number; offset?: number },
  ) {
    return await this.handleResponse<
      PaginatedApiResponse<AdminCustomTemplateInfo>
    >(
      await this.req(
        `/api/admin/v1/custom_pricing/${pricingId}/templates`,
        "GET",
        undefined,
        params,
      ),
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
    const result = await this.handleResponse<
      ApiResponse<AdminCustomTemplateInfo>
    >(
      await this.req(
        `/api/admin/v1/custom_pricing/${pricingId}/templates`,
        "POST",
        data,
      ),
    );
    return result.data;
  }

  async getCustomTemplate(id: number) {
    const result = await this.handleResponse<
      ApiResponse<AdminCustomTemplateInfo>
    >(await this.req(`/api/admin/v1/custom_templates/${id}`, "GET"));
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
    const result = await this.handleResponse<
      ApiResponse<AdminCustomTemplateInfo>
    >(await this.req(`/api/admin/v1/custom_templates/${id}`, "PATCH", updates));
    return result.data;
  }

  async deleteCustomTemplate(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/custom_templates/${id}`, "DELETE"),
    );
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
    const result = await this.handleResponse<
      ApiResponse<CustomPricingCalculation>
    >(
      await this.req(
        `/api/admin/v1/custom_pricing/${pricingId}/calculate`,
        "POST",
        data,
      ),
    );
    return result.data;
  }

  async getRegionCustomPricing(
    regionId: number,
    params?: { limit?: number; offset?: number; enabled?: boolean },
  ) {
    // Convert boolean to string for URL params
    const queryParams = params
      ? {
          ...params,
          enabled:
            params.enabled !== undefined
              ? params.enabled.toString()
              : undefined,
        }
      : undefined;

    return await this.handleResponse<
      PaginatedApiResponse<AdminCustomPricingInfo>
    >(
      await this.req(
        `/api/admin/v1/regions/${regionId}/custom_pricing`,
        "GET",
        undefined,
        queryParams,
      ),
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
    postcode?: string | null;
    phone?: string | null;
    email?: string | null;
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
      postcode: string | null;
      phone: string | null;
      email: string | null;
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminCompanyInfo>>(
      await this.req(`/api/admin/v1/companies/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteCompany(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/companies/${id}`, "DELETE"),
    );
  }

  // IP Range Management
  async getIpRanges(params?: {
    limit?: number;
    offset?: number;
    region_id?: number;
  }) {
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
    }>,
  ) {
    const result = await this.handleResponse<ApiResponse<AdminIpRangeInfo>>(
      await this.req(`/api/admin/v1/ip_ranges/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteIpRange(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/ip_ranges/${id}`, "DELETE"),
    );
  }

  // Access Policy Management
  async getAccessPolicies(params?: { limit?: number; offset?: number }) {
    return await this.handleResponse<
      PaginatedApiResponse<AdminAccessPolicyDetail>
    >(
      await this.req("/api/admin/v1/access_policies", "GET", undefined, params),
    );
  }

  async getAccessPolicy(id: number) {
    const result = await this.handleResponse<
      ApiResponse<AdminAccessPolicyDetail>
    >(await this.req(`/api/admin/v1/access_policies/${id}`, "GET"));
    return result.data;
  }

  async createAccessPolicy(data: {
    name: string;
    kind?: string;
    router_id?: number | null;
    interface?: string | null;
  }) {
    const result = await this.handleResponse<
      ApiResponse<AdminAccessPolicyDetail>
    >(await this.req("/api/admin/v1/access_policies", "POST", data));
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
    const result = await this.handleResponse<
      ApiResponse<AdminAccessPolicyDetail>
    >(await this.req(`/api/admin/v1/access_policies/${id}`, "PATCH", updates));
    return result.data;
  }

  async deleteAccessPolicy(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/access_policies/${id}`, "DELETE"),
    );
  }

  // Helper endpoint for Access Policies used by IP ranges
  async getAccessPoliciesHelper() {
    const result = await this.handleResponse<
      ApiResponse<AdminAccessPolicyInfo[]>
    >(await this.req("/api/admin/v1/access_policies", "GET"));
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

  async createRouter(data: {
    name: string;
    enabled?: boolean;
    kind: string;
    url: string;
    token: string;
  }) {
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
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/routers/${id}`, "DELETE"),
    );
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
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/cost_plans/${id}`, "DELETE"),
    );
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
          include_deleted:
            params.include_deleted !== undefined
              ? params.include_deleted.toString()
              : undefined,
        }
      : undefined;

    return await this.handleResponse<
      PaginatedApiResponse<AdminVmIpAssignmentInfo>
    >(
      await this.req(
        "/api/admin/v1/vm_ip_assignments",
        "GET",
        undefined,
        queryParams,
      ),
    );
  }

  async getVmIpAssignment(id: number) {
    const result = await this.handleResponse<
      ApiResponse<AdminVmIpAssignmentInfo>
    >(await this.req(`/api/admin/v1/vm_ip_assignments/${id}`, "GET"));
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
    const result = await this.handleResponse<
      ApiResponse<AdminVmIpAssignmentInfo>
    >(await this.req("/api/admin/v1/vm_ip_assignments", "POST", data));
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
    const result = await this.handleResponse<
      ApiResponse<AdminVmIpAssignmentInfo>
    >(
      await this.req(`/api/admin/v1/vm_ip_assignments/${id}`, "PATCH", updates),
    );
    return result.data;
  }

  async deleteVmIpAssignment(id: number) {
    await this.handleResponse<ApiResponse<void>>(
      await this.req(`/api/admin/v1/vm_ip_assignments/${id}`, "DELETE"),
    );
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
          include_deleted:
            params.include_deleted !== undefined
              ? params.include_deleted.toString()
              : undefined,
        }
      : undefined;

    return await this.handleResponse<
      PaginatedApiResponse<AdminVmIpAssignmentInfo>
    >(
      await this.req(
        `/api/admin/v1/vms/${vmId}/ip_assignments`,
        "GET",
        undefined,
        queryParams,
      ),
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
          include_deleted:
            params.include_deleted !== undefined
              ? params.include_deleted.toString()
              : undefined,
        }
      : undefined;

    return await this.handleResponse<
      PaginatedApiResponse<AdminVmIpAssignmentInfo>
    >(
      await this.req(
        `/api/admin/v1/ip_ranges/${ipRangeId}/assignments`,
        "GET",
        undefined,
        queryParams,
      ),
    );
  }

  // Reports Management
  async getMonthlySalesReport(year: number, month: number, company_id: number) {
    const result = await this.handleResponse<ApiResponse<any>>(
      await this.req(
        `/api/admin/v1/reports/monthly-sales/${year}/${month}/${company_id}`,
        "GET",
      ),
    );
    return result.data;
  }

  async getTimeSeriesReport(params: {
    start_date: string;
    end_date: string;
    company_id: number;
    currency?: string;
  }) {
    const result = await this.handleResponse<ApiResponse<TimeSeriesReportData>>(
      await this.req(
        "/api/admin/v1/reports/time-series",
        "GET",
        undefined,
        params,
      ),
    );
    return result.data;
  }

  async getReferralUsageTimeSeriesReport(params: {
    start_date: string;
    end_date: string;
    company_id: number;
    ref_code?: string;
  }) {
    const result = await this.handleResponse<
      ApiResponse<ReferralUsageTimeSeriesReportData>
    >(
      await this.req(
        "/api/admin/v1/reports/referral-usage/time-series",
        "GET",
        undefined,
        params,
      ),
    );
    return result.data;
  }

  // Bulk messaging
  async sendBulkMessage(params: { subject: string; message: string }) {
    const result = await this.handleResponse<
      ApiResponse<{ job_dispatched: boolean; job_id: string }>
    >(await this.req("/api/admin/v1/users/bulk-message", "POST", params));
    return result.data;
  }
}

export const adminApi = new AdminApi();
