// Core API response types
export interface ApiResponseBase {
  error?: string;
}

export type ApiResponse<T> = ApiResponseBase & {
  data: T;
};

// Enums
export enum DiskType {
  SSD = "ssd",
  HDD = "hdd",
}

export enum DiskInterface {
  SATA = "sata",
  SCSI = "scsi",
  PCIe = "pcie",
}

// VM Types
export interface VmStatus {
  state: "running" | "stopped";
  cpu_usage: number;
  mem_usage: number;
  uptime: number;
  net_in: number;
  net_out: number;
  disk_write: number;
  disk_read: number;
}

export interface VmIpAssignment {
  id: number;
  ip: string;
  gateway: string;
  forward_dns?: string;
  reverse_dns?: string;
}

export interface VmCostPlan {
  id: number;
  name: string;
  amount: number;
  currency: string;
  interval_amount: number;
  interval_type: string;
}

export interface VmHostRegion {
  id: number;
  name: string;
}

export interface VmTemplate {
  id: number;
  pricing_id?: number;
  name: string;
  created: Date;
  expires?: Date;
  cpu: number;
  memory: number;
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  cost_plan: VmCostPlan;
  region: VmHostRegion;
}

export interface VmOsImage {
  id: number;
  distribution: string;
  flavour: string;
  version: string;
  release_date: string;
  default_username?: string;
}

export interface UserSshKey {
  id: number;
  name: string;
}

export interface VmInstance {
  id: number;
  created: string;
  expires: string;
  status?: VmStatus;
  mac_address: string;
  template: VmTemplate;
  image: VmOsImage;
  ssh_key: UserSshKey;
  ip_assignments: Array<VmIpAssignment>;
}

export interface VmHistory {
  id: number;
  vm_id: number;
  action_type: string;
  timestamp: string;
  initiated_by: "owner" | "system" | "other";
  previous_state?: string;
  new_state?: string;
  metadata?: string;
  description?: string;
}

// Account Types
export interface AccountDetail {
  email?: string;
  contact_nip17: boolean;
  contact_email: boolean;
  country_code?: string;
  name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  tax_id?: string;
}

// Payment Types
export interface VmPayment {
  id: string;
  created: string;
  expires: string;
  amount: number;
  currency: string;
  tax: number;
  is_paid: boolean;
  time: number;
  data: {
    lightning?: string;
    revolut?: {
      token: string;
    };
  };
}

export interface PaymentMethod {
  name: string;
  currencies: Array<string>;
  metadata?: Record<string, string>;
}
