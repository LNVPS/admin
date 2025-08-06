export interface User {
  id: number;
  pubkey: string;
  email?: string;
  contact_nip17: boolean;
  contact_email: boolean;
  country_code?: string;
  billing_name?: string;
  billing_address_1?: string;
  billing_address_2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postcode?: string;
  billing_tax_id?: string;
  admin_role?: "super_admin" | "admin" | "read_only" | null;
  vm_count: number;
  total_spent: number;
}

export interface VirtualMachine {
  id: number;
  user_id: number;
  host_id: number;
  name: string;
  status: "running" | "stopped" | "pending" | "failed";
  region: string;
  specs: {
    cpu: number;
    ram: number;
    storage: number;
  };
  created_at: string;
  deleted_at?: string;
  total_payments: number;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  user_count: number;
  is_system_role: boolean;
}

export interface UserRole {
  user_id: number;
  role_id: number;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorResponse {
  error: string;
}

export type Permission =
  | "users::view"
  | "users::create"
  | "users::update"
  | "users::delete"
  | "virtual_machines::view"
  | "virtual_machines::create"
  | "virtual_machines::update"
  | "virtual_machines::delete"
  | "hosts::view"
  | "hosts::create"
  | "hosts::update"
  | "hosts::delete"
  | "host_region::view"
  | "host_region::create"
  | "host_region::update"
  | "host_region::delete"
  | "payments::view"
  | "payments::create"
  | "payments::update"
  | "payments::delete"
  | "analytics::view"
  | "system::view"
  | "system::update"
  | "roles::view"
  | "roles::create"
  | "roles::update"
  | "roles::delete"
  | "audit::view";
