# LNVPS Admin API Reference

Type and payload reference for the LNVPS Admin API. Endpoint index and usage guidance: [SKILL.md](SKILL.md).
Authoritative generated docs: https://admin-api.lnvps.net/docs/endpoints.md

**Base URL:** `https://admin-api.lnvps.net`

Notation: `?` = optional, `|` = union, `|null` = nullable/clearable. Dates are ISO 8601 strings, ids are numbers unless noted. Sizes in bytes; amounts in the smallest currency unit (**millisats** for BTC, cents for fiat).

## Table of Contents

- [Authentication](#authentication)
- [Response Models](#response-models)
- [Request Bodies](#request-bodies)
- [Refunds](#refunds)
- [Referral Program](#referral-program)
- [Managed Apps](#managed-apps)
- [Reports](#reports)
- [Resource Costs](#resource-costs)
- [Job Feedback WebSocket](#job-feedback-websocket)
- [Errors & Pagination](#errors--pagination)

---

## Authentication

```
Authorization: Nostr <base64-encoded NIP-98 event>
```

NIP-98 event: kind `27235`, tags `["u", <url>]` and `["method", <METHOD>]`, empty content.

- Fresh event per request — event ids are single-use
- `created_at` within **60 seconds** of server time
- Optional `payload` tag = lowercase hex SHA-256 of the body; verified when present

### WebSocket ticket

```http
POST /api/admin/v1/auth/ticket
Content-Type: application/json

{"path": "/api/admin/v1/jobs/feedback"}
```

```json
{ "data": { "ticket": "eyJzdWIiOi...", "expires_in": 30 } }
```

Single-use, path-scoped, 30s. Requires the permission the target endpoint requires (`virtual_machines::view`).

---

## Response Models

```
AdminUserInfo { id, pubkey: hex, created, email?, email_verified: bool, contact_nip17: bool, contact_email: bool,
  country_code?, billing_name?, billing_address_1?, billing_address_2?, billing_city?, billing_state?,
  billing_postcode?, billing_tax_id?, geo_country_code?, geo_ip?, geo_updated?, vm_count, last_login?,
  is_admin: bool, has_nwc: bool, account_type?: "nostr"|"oauth"|"webauthn", passkey_count? }

AdminUserPasskeyInfo { id, name?, created, last_used? }

AdminVmInfo { id, created, expires?, mac_address, image_id, image_name, template_id, template_name,
  custom_template_id?, is_standard_template: bool, ssh_key_id, ssh_key_name,
  ip_addresses: [{ id, ip, range_id }],
  running_state?: { timestamp, state: VmRunningStates, cpu_usage, mem_usage, uptime, net_in, net_out, disk_write, disk_read },
  auto_renewal_enabled: bool, cpu, cpu_mfg?, cpu_arch?, cpu_features?: [str], memory, disk_size,
  disk_type: DiskType, disk_interface: DiskInterface, host_id, user_id, user_pubkey: hex, user_email?,
  host_name, region_id, region_name, deleted: bool, ref_code? }

AdminHostInfo { id, name, kind: VmHostKind, region: { id, name, enabled: bool }, ip, cpu, cpu_mfg?, cpu_arch?,
  cpu_features?: [str], memory, enabled: bool, load_cpu, load_memory, load_disk, vlan_id?,
  disks: [AdminHostDisk],
  calculated_load: { overall_load, cpu_load, memory_load, disk_load, available_cpu, available_memory, active_vms },
  ssh_user?, ssh_key_configured: bool }

AdminHostDisk { id, name, size, kind: DiskType, interface: DiskInterface, enabled: bool }

UnmanagedHostVm { host_vm_id, mapped_vm_id?, name?, cpu, memory, disk_size, disk_storage?, mac_address?, running: bool }

AdminRegionInfo { id, name, enabled: bool, company_id?, host_count, total_vms, total_cpu_cores,
  total_memory_bytes, total_ip_assignments }

AdminVmTemplateInfo { id, name, enabled: bool, created, expires?, cpu, cpu_mfg?, cpu_arch?, cpu_features?: [str],
  memory, disk_size, disk_type: DiskType, disk_interface: DiskInterface, cost_plan_id, region_id, region_name?,
  cost_plan_name?, active_vm_count, disk_iops_read?, disk_iops_write?, disk_mbps_read?, disk_mbps_write?,
  network_mbps?, cpu_limit?, ip4_count?, ip6_count? }

AdminCostPlanInfo { id, name, created, amount, currency, interval_amount, interval_type: CostPlanIntervalType, template_count }

AdminCustomPricingInfo { id, name, enabled: bool, created, expires?, region_id, region_name?, currency,
  cpu_mfg?, cpu_arch?, cpu_features?: [str], cpu_cost, memory_cost, ip4_cost, ip6_cost, min_cpu, max_cpu,
  min_memory, max_memory, min_ip4?, max_ip4?, min_ip6?, max_ip6?, disk_iops_read?, disk_iops_write?,
  disk_mbps_read?, disk_mbps_write?, network_mbps?, cpu_limit?,
  disk_pricing: [{ id, kind: DiskType, interface: DiskInterface, cost, min_disk_size, max_disk_size }],
  template_count }

AdminCustomTemplateInfo { id, cpu, memory, disk_size, disk_type: DiskType, disk_interface: DiskInterface,
  pricing_id, pricing_name?, region_id, region_name?, currency,
  calculated_cost: { cpu_cost, memory_cost, disk_cost, ip4_cost, ip6_cost, total_monthly_cost }, vm_count }

CustomPricingCalculation { currency, cpu_cost, memory_cost, disk_cost, ip4_cost, ip6_cost, total_monthly_cost,
  configuration: { cpu, memory, disk_size, disk_type, disk_interface, ip4_count, ip6_count } }

AdminVmOsImageInfo { id, distribution: ApiOsDistribution, flavour, version, enabled: bool, release_date, url,
  default_username?, active_vm_count }

AdminVmHistoryInfo { id, vm_id, action_type: AdminVmHistoryActionType, timestamp, initiated_by_user?,
  initiated_by_user_pubkey?, initiated_by_user_email?, description? }

AdminVmPaymentInfo { id: hex, vm_id, created, expires, amount, tax, processing_fee, currency,
  company_base_currency, payment_method: AdminPaymentMethod, external_id?, is_paid: bool, paid_at?, rate }

AdminRefundAmountInfo { amount, currency, rate }

AdminRoleInfo { id, name, description?, is_system_role: bool, permissions: [str], user_count, created_at, updated_at }

UserRoleInfo { role: AdminRoleInfo, assigned_by?, assigned_at, expires_at?, is_active: bool }

AdminIpRangeInfo { id, cidr, gateway, enabled: bool, region_id, region_name?, reverse_zone_id?, forward_zone_id?,
  forward_dns_server_id?, reverse_dns_server_id?, access_policy_id?, access_policy_name?,
  allocation_mode: IpRangeAllocationMode, use_full_range: bool, assignment_count, available_ips?,
  routers: [{ id, name }] }

AdminVmIpAssignmentInfo { id, vm_id, ip_range_id, region_id, user_id, ip, deleted: bool, arp_ref?, dns_forward?,
  dns_forward_ref?, dns_reverse?, dns_reverse_ref?, ip_range_cidr?, region_name? }

AdminAccessPolicyDetail { id, name, kind: NetworkAccessPolicyKind, router_id?, router_name?, interface?, ip_range_count }

AdminRouterDetail { id, name, enabled: bool, kind: RouterKind, url, access_policy_count }
AdminRouterTunnel { id, router_id, name, kind: TunnelKind, local_addr, remote_addr, enabled: bool, last_seen }
RouterTunnelTraffic { tunnel_name, rx_bytes, tx_bytes, sampled_at }
AdminRouterBgpSession { id, router_id, name, peer_ip, peer_asn, local_asn, state: BgpSessionState,
  prefixes_received?, prefixes_sent?, enabled: bool, direction: BgpDirection, last_seen }
AdminRouterBgpRoute { router_id, prefix, next_hop?, is_default: bool, last_seen }

AdminDnsServerInfo { id, name, enabled: bool, kind: DnsServerKind, url?, ip_range_count }   // token never returned
DnsZone { id: str, name: str }

AdminCompanyInfo { id, created, name, address_1?, address_2?, city?, state?, country_code?, tax_id?,
  base_currency, postcode?, phone?, email?, region_count }

AdminSubscriptionInfo { id, user_id, name, description?, created, expires?, is_active: bool, is_setup: bool,
  currency, interval_amount, interval_type: CostPlanIntervalType, setup_fee, auto_renewal_enabled: bool,
  external_id?, line_items: [AdminSubscriptionLineItemInfo], payment_count }

AdminSubscriptionLineItemInfo { id, subscription_id, name, description?, amount, setup_amount, configuration? }

AdminSubscriptionPaymentInfo { id: hex, subscription_id, user_id, created, expires?, amount, currency,
  payment_method: AdminPaymentMethod, payment_type: SubscriptionPaymentType, external_id?, is_paid: bool,
  paid_at?, rate?, tax, processing_fee }

AdminAvailableIpSpaceInfo { id, cidr, min_prefix_size, max_prefix_size, registry: { value, name }, external_id?,
  is_available: bool, is_reserved: bool, metadata?, pricing_count }

AdminIpSpacePricingInfo { id, available_ip_space_id, prefix_size, price_per_month, currency, setup_fee, cidr? }

AdminIpRangeSubscriptionInfo { id, subscription_line_item_id, available_ip_space_id, cidr, is_active: bool,
  started_at, ended_at?, metadata?, subscription_id?, user_id?, parent_cidr? }

AdminPaymentMethodConfigInfo { id, company_id, payment_method: AdminPaymentMethod, name, enabled: bool,
  provider_type, config? (sanitized — secrets replaced with bools), processing_fee_rate?, processing_fee_base?,
  processing_fee_currency?, supported_currencies: [str], created, modified }

AdminUserPaymentMethodInfo { id, user_id, provider: "nwc"|"revolut", name?, created,
  has_external_customer_id: bool, card_brand?, card_last_four?, exp_month?, exp_year?,
  is_default: bool, enabled: bool }

TimeSeriesPayment { id: hex, vm_id, created, expires, amount, currency, payment_method, external_id?,
  is_paid: bool, rate, time_value, tax, company_id, company_name, company_base_currency }

ReferralReport { vm_id, ref_code, created, amount, currency, rate, base_currency }

JobResponse { job_id: str }
JobDispatchResponse { job_dispatched: bool, job_id: str }
ExtendAllResponse { extended: number, failed: number }
```

---

## Request Bodies

### VMs

```
CreateVm { user_id, template_id, image_id, ssh_key_id, ref_code?, reason? }

CreateCustomVm { user_id, pricing_id, cpu, memory, disk, disk_type: DiskType, disk_interface: DiskInterface,
  cpu_mfg?, cpu_arch?, cpu_feature?: [str], ip4_count?: 1, ip6_count?: 1, image_id, ssh_key_id, ref_code?, reason? }
  // Unknown enum spellings are 400 and never defaulted. Unknown *keys* are ignored (a typo silently means "any").
  // Range/pricing/image-arch/host-capacity checks run in the job, not the request.

UpdateVm { disabled?: bool }
DeleteVm { reason? }
TransferVm { user_id, reason? }              // 409 if deleted or already owned by target, 404 unknown user
MigrateVm { target_host_id, live?: bool, reason? }   // async; Proxmox only
ExtendVm { days: 1-365, reason? }
ExtendAllVms { days: 1-365, reason? }        // virtual_machines::bulk_update
RefundVm { payment_method?: "lightning"|"revolut"|"paypal", refund_from_date?: unix, reason?,
  lightning_invoice?: str }                  // lightning_invoice required for lightning, rejected otherwise
RecordPaymentRefund { amount?, reason?, external_ref?, refunded_at?: unix }
ImportHostVm { host_vm_id, user_id, reason? }
BulkMessage { subject, message }
```

### Users & roles

```
UpdateUser { email?, contact_nip17?: bool, contact_email?: bool, country_code?, billing_name?, billing_address_1?,
  billing_address_2?, billing_city?, billing_state?, billing_postcode?, billing_tax_id?,
  geo_country_code?, geo_ip?, admin_role?: AdminUserRole|null }

CreateRole { name, description?, permissions: [str] }
UpdateRole { name?, description?, permissions?: [str] }
AssignRole { role_id }
```

> A role may not be **defined** or **assigned** with permissions the caller does not hold; `roles::update` is required for both, self-assignment is refused, and `super_admin` is super-admin-only.

### Hosts, regions, templates, pricing

```
CreateHost { name, ip, api_token, region_id, kind: VmHostKind, vlan_id?, mtu?, cpu, cpu_mfg?, cpu_arch?,
  cpu_features?: [str], memory, enabled?: bool, load_cpu?, load_memory?, load_disk?, ssh_user?, ssh_key? }
UpdateHost { name?, ip?, api_token?, region_id?, kind?, vlan_id?|null, mtu?|null, enabled?: bool, cpu_mfg?,
  cpu_arch?, cpu_features?: [str], load_cpu?, load_memory?, load_disk?, ssh_user?, ssh_key?|null }

CreateHostDisk { name, size, kind: DiskType, interface: DiskInterface, enabled?: bool }
UpdateHostDisk { name?, size?, kind?, interface?, enabled?: bool }

CreateRegion { name, company_id?|null }
UpdateRegion { name?, enabled?: bool, company_id?|null }

CreateVmTemplate { name, enabled?: bool, expires?|null, cpu, cpu_mfg?, cpu_arch?, cpu_features?: [str], memory,
  disk_size, disk_type: DiskType, disk_interface: DiskInterface, cost_plan_id?, region_id, cost_plan_name?,
  cost_plan_amount?, cost_plan_currency?, cost_plan_interval_amount?, cost_plan_interval_type?,
  disk_iops_read?, disk_iops_write?, disk_mbps_read?, disk_mbps_write?, network_mbps?, cpu_limit?,
  ip4_count?, ip6_count? }
UpdateVmTemplate { ...same fields, all optional; nullable perf fields accept null }

CreateCostPlan { name, amount, currency, interval_amount, interval_type: CostPlanIntervalType }
UpdateCostPlan { name?, amount?, currency?, interval_amount?, interval_type? }

CreateCustomPricing { name, enabled?: bool, expires?|null, region_id, currency, cpu_mfg?, cpu_arch?,
  cpu_features?: [str], cpu_cost, memory_cost, ip4_cost, ip6_cost, min_cpu, max_cpu, min_memory, max_memory,
  min_ip4?, max_ip4?, min_ip6?, max_ip6?, disk_iops_read?, disk_iops_write?, disk_mbps_read?, disk_mbps_write?,
  network_mbps?, cpu_limit?,
  disk_pricing: [{ kind: DiskType, interface: DiskInterface, cost, min_disk_size, max_disk_size }] }
UpdateCustomPricing { ...same fields, all optional }
CopyCustomPricing { name, region_id?, enabled?: bool }
CalculateCustomPricing { cpu, memory, disk_size, disk_type: DiskType, disk_interface: DiskInterface,
  ip4_count?: 1, ip6_count?: 1 }

CreateCustomTemplate { cpu, memory, disk_size, disk_type: DiskType, disk_interface: DiskInterface }
UpdateCustomTemplate { cpu?, memory?, disk_size?, disk_type?, disk_interface?, pricing_id? }

CreateVmOsImage { distribution: ApiOsDistribution, flavour, version, enabled: bool, release_date, url,
  default_username?, sha2?, sha2_url? }
UpdateVmOsImage { ...all optional }
```

### Networking

```
CreateIpRange { cidr, gateway, enabled?: bool, region_id, reverse_zone_id?|null, forward_zone_id?|null,
  forward_dns_server_id?|null, reverse_dns_server_id?|null, access_policy_id?|null,
  allocation_mode?: IpRangeAllocationMode, use_full_range?: bool }
UpdateIpRange { ...all optional }

CreateVmIpAssignment { vm_id, ip_range_id, ip?|null, arp_ref?|null, dns_forward?|null, dns_reverse?|null }
UpdateVmIpAssignment { ip?, arp_ref?|null, dns_forward?|null, dns_reverse?|null }

CreateAccessPolicy { name, kind?: NetworkAccessPolicyKind, router_id?|null, interface?|null }
UpdateAccessPolicy { name?, kind?, router_id?|null, interface?|null }

CreateRouter { name, enabled?: bool, kind: RouterKind, url, token }
UpdateRouter { name?, enabled?: bool, kind?, url?, token? }

ToggleTunnel { enabled: bool }
ToggleBgpSession { session_id: str, enabled: bool }   // session_id = BIRD protocol name / Mikrotik .id
SetDefaultRoute { next_hop: str }                     // address family inferred from the address

CreateDnsServer { name, enabled?: bool, kind: "cloudflare"|"ovh", url?, token }
  // url required for OVH (e.g. https://eu.api.ovh.com)
  // token: Cloudflare bearer token, or OVH "application_key:application_secret:consumer_key"
UpdateDnsServer { name?, enabled?: bool, kind?, url?, token? }
```

DNS servers referenced by any IP range (forward or reverse) cannot be deleted — clear the references first.

### Companies, subscriptions, IP space, payment config

```
CreateCompany { name, address_1?|null, address_2?|null, city?|null, state?|null, country_code?|null,
  tax_id?|null, base_currency, postcode?|null, phone?|null, email?|null }
UpdateCompany { ...all optional }

CreateSubscription { user_id, name, description?, expires?, is_active: bool, currency, interval_amount,
  interval_type: CostPlanIntervalType, setup_fee, auto_renewal_enabled: bool, external_id? }
UpdateSubscription { name?, description?|null, expires?|null, is_active?: bool, currency?, interval_amount?,
  interval_type?, setup_fee?, auto_renewal_enabled?: bool, external_id? }
ExtendSubscription { days: 1-365, reason? }
  // Added to the current expires (or to now). Also sets is_setup/is_active and dispatches CheckSubscriptions.
  // No payment row is written — this is granted time, not a settlement.

CreateSubscriptionLineItem { subscription_id, name, description?, amount, setup_amount, configuration? }
UpdateSubscriptionLineItem { name?, description?, amount?, setup_amount?, configuration? }

CreateIpSpace { cidr, min_prefix_size, max_prefix_size, registry: 0-4 (ARIN/RIPE/APNIC/LACNIC/AFRINIC),
  external_id?|null, is_available?: bool, is_reserved?: bool, metadata?|null }
UpdateIpSpace { ...all optional/nullable }
CreateIpSpacePricing { prefix_size, price_per_month, currency?, setup_fee? }
UpdateIpSpacePricing { ...all optional/nullable }

CreatePaymentMethodConfig { company_id, name, enabled?: bool, config: ProviderConfig, processing_fee_rate?|null,
  processing_fee_base?|null, processing_fee_currency?|null, supported_currencies?: [str] }
UpdatePaymentMethodConfig { name?|null, enabled?|null, config?: PartialProviderConfig, processing_fee_rate?|null,
  processing_fee_base?|null, processing_fee_currency?|null, supported_currencies?: [str] }

ProviderConfig (tagged union on "type"):
  lnd:     { type: "lnd", url, cert_path, macaroon_path }
  revolut: { type: "revolut", url, token, api_version, public_key, webhook_secret? }
  stripe:  { type: "stripe", secret_key, publishable_key, webhook_secret }
  paypal:  { type: "paypal", client_id, client_secret, mode }
PartialProviderConfig: same, but only "type" is required

UpdateUserPaymentMethod { is_default?: bool, enabled?: bool, name?: str|null }
```

---

## Refunds

Two distinct operations:

**1. Automated Lightning refund** — `POST /api/admin/v1/vms/{id}/refund`
Requires `virtual_machines::update` **and** `payments::update`. Pays the customer's invoice from the LNVPS node in a `ProcessVmRefund` job, records the refund against the payments it reverses, and queues the VM for deletion. The invoice must carry an amount not exceeding the quote from `GET /vms/{id}/refund`. Refunds are booked newest payment first, in each payment's own currency at its frozen exchange/VAT rates. `revolut`/`paypal` return `501`.

**2. Record a manual refund** — `POST /api/admin/v1/vms/{id}/payments/{payment_id}/refund`
Requires `payments::update` only (a `vm_manager` can delete a VM but cannot decide money goes back). Pure accounting: stored as a `subscription_payment` row with `payment_type = "Refund"` and `refunded_payment_id` set. Amount defaults to everything still refundable. `refunded_at` decides which VAT period it lands in. Writes a `refunded` VM history entry. **Does not delete or stop the VM.**

```http
GET /api/admin/v1/vms/{id}/payments/{payment_id}/refund
```

```json
{
  "data": {
    "payment_id": "a1b2...",
    "currency": "EUR",
    "amount": 1230,
    "refunded_total": 615,
    "refundable_remaining": 615,
    "refunds": []
  }
}
```

Errors: `400` bad id / zero amount / refund-of-a-refund; `409` unpaid, already fully refunded, over-refund, or an exact duplicate resubmission.

---

## Referral Program

**Rate fields:** `referral_rate` on a referral is a per-referrer override (whole %, `null` = company default). The rate actually applied to a referred VM is resolved against that VM's company.

`GET /api/admin/v1/referrals/{id}` returns:

```
{ id, user_id, user_pubkey, code, address, mode, referral_rate?, payout_threshold?, created,
  earned: [{ currency, amount }],
  balances: [{ currency, earned, settled, outstanding, outstanding_msat? }],
  outstanding_total_msat,
  payouts: [AdminReferralPayoutInfo],
  referrals_success, referrals_failed }
```

- `earned` = commission (`first payment × effective_rate%`) per currency
- `balances` nets earned against paid **or reserved** amounts (`settled` = payout `amount + fee`)
- `outstanding_total_msat` is what the payout threshold is judged against — compare with `payout_threshold * 1000`

```
AdminReferralPayoutInfo { id, amount, fee, currency, sent_amount, sent_fee, sent_currency, rate, rate_collected?,
  created, is_paid: bool, mode, output?, pre_image? }

PatchReferral { code?, referral_rate?: number|null, payout_threshold?: number|null }   // satoshis; null = system minimum

CreateReferralPayout { amount, currency, fee?: 0, sent_currency?, sent_amount?, sent_fee?: 0, rate?,
  rate_collected?, output?, mode?: "lightning_address"|"nwc"|"on_chain", is_paid?: false }
  // sent_amount + rate required when sent_currency differs from currency; rate/rate_collected rejected when equal
PatchReferralPayout { is_paid?: bool, output?: str|null, mode?, pre_image?: hex|null }
```

Automated on-chain payouts batch every eligible referrer into one send-many; the network fee is split proportionally and **charged to the referrers**, and the batch is deferred if the next-block fee rate exceeds `max-onchain-fee-per-vbyte` (default 50).

---

## Managed Apps

```
AdminAppInfo { id, name, display_name, description?, icon?, repo_url?, category, seo_title?, seo_description?,
  tags: [{ id, slug, display_name }], compose: yaml-str, amount, currency, interval_amount,
  interval_type: CostPlanIntervalType, setup_amount, enabled: bool, created,
  footprint?: { cpu_milli, memory_bytes, storage_bytes } }

CreateApp { name (dns-safe slug, unique), display_name, description?, icon?, repo_url?, category, seo_title?,
  seo_description?, tags?: [slug], compose, amount, currency, interval_amount, interval_type, setup_amount?: 0,
  enabled?: true }
PatchApp { ...all optional; description/icon/repo_url/seo_* accept null to clear;
  category may NOT be null (400); tags is a replace-set (omit = unchanged, [] = clear) }

AdminAppClusterInfo / CreateAppCluster { id, name, region_id, ingress_domain, enabled: bool,
  capacity_cpu_milli, capacity_memory_bytes, capacity_storage_bytes, created }

PatchAppDeployment { name?, custom_domain?: str|null, config?: { [field]: str } }
DeleteAppDeployment { purge?: false }   // purge = super_admin only, removes billing history too
```

- `category` is required, non-empty, sentence case, no article/"hosting"/"managed" — it is templated into the public page title as `{display_name} Hosting — Managed {category}`.
- `compose` is parsed and validated on create/update; the resource footprint is computed from it for cluster capacity accounting.
- Deleting an app or cluster is rejected (`400`) while any deployment row references it, **including soft-deleted ones**.
- Admin `GET /app-deployments/{id}` returns the **decrypted** config (may contain secrets); the list omits config.

---

## Reports

### Payment time series

`GET /api/admin/v1/reports/time-series?start_date=&end_date=&company_id=` → `TimeSeriesPayment[]`

### Referral usage

`GET /api/admin/v1/reports/referral-usage/time-series` → `ReferralReport[]`

### Profit & loss

`GET /api/admin/v1/reports/profit-loss` — permission `analytics::view`

| Param | Notes |
|---|---|
| `start_date`, `end_date` | required, `YYYY-MM-DD` |
| `group_by` | `month` (default) \| `year` |
| `company_id` | optional; filters the revenue side. `0`/omitted = all |
| `region_id` | optional; filters both revenue and costs |
| `currency` | target currency; defaults to the company base currency, **required when `company_id` is omitted** |

```json
{ "data": { "start_date": "2026-01-01", "end_date": "2026-12-31", "group_by": "month", "currency": "EUR",
  "periods": [ { "period": "2026-01", "revenue_net": 480000, "revenue_tax": 96000, "cost_recurring": 8000,
                 "cost_depreciation": 6944, "cost_one_time": 250000, "cost_total": 14944,
                 "profit": 465056, "cash_flow": 222000 } ] } }
```

**Accrual basis.** A one-time cost with a `depreciation_months` useful life is capitalised and expensed straight-line over that life, and it is the depreciation — not the cash outlay — that enters `cost_total` (`= cost_recurring + cost_depreciation`) and `profit`. The outlay stays visible as `cost_one_time` and feeds `cash_flow` (`= revenue_net - cost_recurring - cost_one_time`); adding it to `cost_total` would double-count the same money. A one-time cost with no useful life set is expensed in full in its purchase period.

Revenue uses each payment's stored historical `rate`; costs use current rates. `profit` may be negative. Revenue is **net of refunds** recorded in the period (signed). Depreciation is charged per calendar month from the purchase month, and assets bought before `start_date` still charge their remaining months into the window.

### Renewals, churn & retention

`GET /api/admin/v1/reports/renewals?start_date=&end_date=&company_id=&region_id=` — `analytics::view`

`company_id` is **required**; `end_date` may be in the future, since half the report is an outlook. Counted **per subscription**, not per VM.

```json
{ "data": { "start_date": "2026-05-01", "end_date": "2026-11-30", "source_tracking_since": "2026-08-26",
  "periods": [ { "period": "2026-09", "complete": false, "due": 119, "due_auto_capable": 31,
                 "due_auto_without_method": 29, "due_manual": 59, "lapsed": 0, "pending": 2,
                 "lapsed_never_paid": 0, "renewed_subscriptions": 0, "churn_rate": null,
                 "renewed": 0, "renewed_auto": 0, "renewed_manual": 0, "renewed_unknown": 0 } ],
  "cohorts": [ { "cohort": "2026-06", "size": 51, "retained": [49, 26, 19],
                 "retained_pct": [96.1, 51.0, 37.3] } ] } }
```

**Outlook.** `due_auto_capable` is the only bucket the worker will actually charge: auto-renewal requires the flag **and** an enabled saved payment method. `due_auto_without_method` looks safe on the subscription record and is not — it falls through to a manual expiry warning. Since new VM subscriptions default to auto-renew (July 2026), this bucket grows whenever checkout fails to capture a payment method.

**Churn.** `subscription.expires` advances on renewal, so a subscription still carrying a past expiry never came back. Churn is dated by that expiry against *now*, **not** by whether the month has ended — otherwise the current month reports zero for losses that already happened. `lapsed` = expired more than 7 days ago; `pending` = expired inside that window, where the grace period (1–14 days by subscription age) may still collect. `churn_rate = lapsed / (lapsed + renewed_subscriptions)` — payment counts are deliberately not the denominator, since a subscription can renew twice in a month.

**Auto vs manual.** `renewal_source` is only recorded from `source_tracking_since`; earlier renewals are `renewed_unknown` and are never folded into either bucket, because an NWC auto-renewal settles a Lightning invoice indistinguishably from a customer paying one by hand.

**Cohorts.** `retained[n]` is how many of that signup month are still paid through the end of month `cohort + n`. Measured from paid-through dates, so an annual subscription stays retained between renewals instead of looking churned for eleven months of twelve. Curves are truncated at the present month — a two-month-old cohort has three entries, not twelve zeroes. Cohorts look back 12 months further than `start_date`.

### Fleet traffic

`GET /api/admin/v1/reports/traffic?start=&end=&limit=&offset=` — `analytics::view`

Fleet-wide traffic ranking, heaviest outbound sender first. `total` counts VMs with traffic in range, not daily rows. The range may span at most 400 days.

### OSS VAT report

`GET /api/admin/v1/reports/oss?start_date=&end_date=&company_id=&period=quarter|bimonthly` — `analytics::view`

Aggregates cross-border EU B2C sales (`tax_treatment = oss_b2c`) by filing period, company, destination country and VAT rate, in each company's base currency at the rate frozen on the payment. Refunds are netted off, so totals can be negative. Rows: `{ period, company_id, company_name, currency, country_code, vat_rate, net_total, tax_total, transaction_count }`.

---

## Resource Costs

```
AdminResourceCostDetail { id, resource_type: "vm_host"|"ip_range"|"generic", resource_id, label?,
  cost_type: "recurring"|"one_time", amount, currency, interval_amount?, interval_type?, billing_start?,
  billing_end?, depreciation_months?, created, updated }
```

- `ip_range` costs are **per single IP** (multiplied by the range's current assigned-IP count in reports)
- `generic` costs are not linked to any entity and require `label` (`resource_id` ignored)
- `recurring` requires `interval_amount`/`interval_type`; `one_time` is booked in the period containing `billing_start`
- PATCH uses clear semantics: omit = unchanged, `null` = clear

---

## Job Feedback WebSocket

```
GET /api/admin/v1/jobs/feedback?ticket=<ticket>&job_id=<optional>
```

Requires `virtual_machines::view`. Omit `job_id` for the global feed.

```json
{ "type": "connected", "message": "Job feedback stream connected" }
{ "type": "pong" }
{ "type": "error", "error": "Error description" }
{ "type": "job_feedback",
  "feedback": { "job_id": "stream-id-12345", "worker_id": "worker-uuid", "job_type": "StartVm",
                "status": "Started", "timestamp": "2024-01-15T10:30:00Z" } }
{ "type": "job_feedback",
  "feedback": { "job_id": "stream-id-12345", "worker_id": "worker-uuid", "job_type": "CreateVm",
                "status": { "Completed": { "result": "VM 456 created successfully for user 123" } },
                "timestamp": "2024-01-15T10:35:00Z" } }
```

---

## Errors & Pagination

```json
{ "error": "message" }
```

| Code | Meaning |
|---|---|
| 400 | Bad request / invalid enum value / validation failure |
| 401 | Missing or invalid NIP-98 auth |
| 403 | Missing RBAC permission (or purge attempted without `super_admin`) |
| 404 | Not found |
| 409 | Conflict (already in target state, duplicate refund, deleted resource) |
| 429 | Rate limited — retry after `Retry-After` seconds |
| 501 | Not implemented for this provider/host kind (e.g. Revolut refunds, non-Proxmox migration) |

**Pagination:** `?limit=` (max 100, default 50) and `?offset=` (default 0); paginated responses are `{ data, total, limit, offset }`.

**Search/filtering:** `users?search=<hex pubkey>`, `referrals?search=<code|hex pubkey>`, `vms?user_id=&host_id=&pubkey=&region_id=&include_deleted=`, `apps?enabled=&search=`, `app_clusters?enabled=&region_id=&search=`.
