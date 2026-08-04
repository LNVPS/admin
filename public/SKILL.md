---
name: lnvps-admin
description: Admin API for managing LNVPS infrastructure including users, VMs, hosts, regions, templates, IP ranges, DNS, routers, subscriptions, payments, refunds, referrals, managed apps and reporting. Use when performing administrative operations on the LNVPS platform.
metadata:
  author: lnvps
  version: "1.1"
compatibility: Requires network access to the LNVPS Admin API and a Nostr keypair with admin privileges for NIP-98 authentication.
---

# LNVPS Admin API

> **Latest version of this skill:** https://admin.lnvps.net/SKILL.md
> Fetch the latest version before use to be sure the endpoint list is current.

Admin API for managing the LNVPS platform.

- **Base URL:** `https://admin-api.lnvps.net`
- **Admin UI:** `https://admin.lnvps.net`
- **Full generated endpoint docs:** https://admin-api.lnvps.net/docs/endpoints.md
- **Companion reference (this skill):** [REFERENCE.md](REFERENCE.md)

## Authentication

Same NIP-98 HTTP Auth as the customer API:

```
Authorization: Nostr <base64-encoded-event>
```

The authenticated user must hold the RBAC permission each endpoint requires. Permissions are `resource::action`, e.g. `virtual_machines::view`.

**NIP-98 rules (stricter than they used to be):**

- Sign a **fresh event per request** — each event id is accepted once, replays are rejected
- `created_at` must be within **60 seconds** of server time
- `method` tag must match; `payload` tag (hex SHA-256 of the body) is optional but verified when present

The admin API also carries the same per-IP rate limiting, panic guard and security headers as the public API. A `429` means back off for `Retry-After` seconds.

### WebSocket tickets

WebSocket handshakes cannot carry an `Authorization` header, so mint a ticket first:

```http
POST /api/admin/v1/auth/ticket
{"path": "/api/admin/v1/jobs/feedback"}

→ {"data": {"ticket": "...", "expires_in": 30}}
```

Single-use, path-scoped, 30 seconds; `path` must be `/api/admin/v1/jobs/feedback`. Then connect to
`GET /api/admin/v1/jobs/feedback?ticket=<ticket>&job_id=<optional>`.

The legacy `?auth=<base64_nip98_event>` form still works but is **deprecated** (its signature is now actually verified, and it is single-use/60s like any NIP-98 event). The WebSocket requires `virtual_machines::view`.

## CLI Usage with nak curl

```bash
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps-admin.nsec) nak curl [curl options] <url>
```

- Always use `NOSTR_SECRET_KEY` inline — do **not** use `--sec` and do **not** `export` it
- Quote URLs containing `?` or `&`
- For requests with a JSON body (POST, PUT, PATCH) always include `-H "Content-Type: application/json"`
- Many mutating endpoints return a `job_id` for async processing — follow it on the job feedback WebSocket

```bash
# List VMs for a user
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps-admin.nsec) \
  nak curl "https://admin-api.lnvps.net/api/admin/v1/vms?user_id=123"

# Find a user by email
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps-admin.nsec) \
  nak curl "https://admin-api.lnvps.net/api/admin/v1/users/by-email?email=user@example.com"

# Extend a VM by 30 days
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps-admin.nsec) nak curl -X PUT \
  -H "Content-Type: application/json" -d '{"days": 30, "reason": "downtime credit"}' \
  https://admin-api.lnvps.net/api/admin/v1/vms/456/extend
```

## Response Formats

- **Single item:** `{"data": { ... }}`
- **Paginated list:** `{"data": [...], "total": N, "limit": N, "offset": N}`
- **Error:** `{"error": "message"}`
- **Pagination params:** `limit` (max 100, default 50), `offset` (default 0)
- **Sizes** in bytes; **amounts** in the smallest currency unit (**millisats** for BTC, cents for fiat)
- **Async jobs:** `{"data": {"job_id": "..."}}` or `{"data": {"job_dispatched": true, "job_id": "..."}}`

## Endpoint Index

Full request/response schemas: [REFERENCE.md](REFERENCE.md).

### Users, Roles & Passkeys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/v1/users` | List users (`search` = hex pubkey) |
| GET | `/api/admin/v1/users/by-email?email=` | Find user by email (case-insensitive, hashed lookup) |
| GET | `/api/admin/v1/users/{id}` | Get user (incl. `account_type`, `passkey_count`) |
| PATCH | `/api/admin/v1/users/{id}` | Update user (email, billing, geo, admin_role) |
| DELETE | `/api/admin/v1/users/{id}` | **Purge** user + all data (irreversible; fails if live VMs) |
| GET | `/api/admin/v1/users/{id}/passkeys` | List a user's passkeys |
| DELETE | `/api/admin/v1/users/{id}/passkeys/{passkey_id}` | Revoke a passkey (refuses the last one on a webauthn account) |
| POST | `/api/admin/v1/users/bulk-message` | Bulk message active customers (async job) |
| GET/POST | `/api/admin/v1/roles` | List / create roles |
| GET/PATCH/DELETE | `/api/admin/v1/roles/{id}` | Get / update / delete role |
| GET/POST | `/api/admin/v1/users/{id}/roles` | List / assign role assignments |
| DELETE | `/api/admin/v1/users/{id}/roles/{role_id}` | Revoke role |
| GET | `/api/admin/v1/me/roles` | Current admin's roles |

> **Role changes are super-admin territory.** Assigning *and defining* roles both require `roles::update`; self-assignment is refused, `super_admin` may only be granted/revoked by a super admin, and neither a role definition nor an assignment may include a permission the caller does not already hold.

### VMs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/v1/vms` | List VMs (filter: user_id, host_id, pubkey, region_id, include_deleted) |
| GET | `/api/admin/v1/vms/{id}` | Get VM with host/region info |
| POST | `/api/admin/v1/vms` | Create VM from a template for a user (async job) |
| POST | `/api/admin/v1/vms/custom` | Create **custom-spec** VM for a user against a pricing plan (async job) |
| PATCH | `/api/admin/v1/vms/{id}` | Update VM (disable/enable) |
| DELETE | `/api/admin/v1/vms/{id}` | Delete VM (async job, optional reason) |
| POST | `/api/admin/v1/vms/{id}/start` | Start VM (async job) |
| POST | `/api/admin/v1/vms/{id}/stop` | Stop VM (async job) |
| POST | `/api/admin/v1/vms/{id}/transfer` | Transfer ownership to another user |
| POST | `/api/admin/v1/vms/{id}/migrate` | Migrate VM to another host (async job; Proxmox only) |
| PUT | `/api/admin/v1/vms/{id}/extend` | Extend expiry (1–365 days) |
| POST | `/api/admin/v1/vms/extend-all` | Extend **every active VM** (`virtual_machines::bulk_update`) |
| GET | `/api/admin/v1/vms/{id}/refund?method=` | Quote pro-rated refund |
| POST | `/api/admin/v1/vms/{id}/refund` | Pay a Lightning refund + queue deletion (async job) |
| GET | `/api/admin/v1/vms/{id}/history` | VM history/audit log |
| GET | `/api/admin/v1/vms/{id}/history/{history_id}` | Single history entry |
| GET | `/api/admin/v1/vms/{id}/payments` | List VM payments |
| GET | `/api/admin/v1/vms/{id}/payments/{payment_id}` | Get payment |
| POST | `/api/admin/v1/vms/{id}/payments/{payment_id}/complete` | Manually complete a payment |
| GET | `/api/admin/v1/vms/{id}/payments/{payment_id}/refund` | Refunds recorded against a payment + remaining refundable |
| POST | `/api/admin/v1/vms/{id}/payments/{payment_id}/refund` | **Record** a manually-paid refund (`payments::update`) |

> Refunds: only `lightning` is automated (`POST /vms/{id}/refund`); `revolut`/`paypal` return `501` — issue them in the provider dashboard and record them with the per-payment refund endpoint.

### Hosts, Regions & Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/hosts` | List / create hosts |
| GET/PATCH | `/api/admin/v1/hosts/{id}` | Get (load, disks, CPU) / update host |
| GET/POST | `/api/admin/v1/hosts/{id}/disks` | List / create host disks |
| GET/PATCH | `/api/admin/v1/hosts/{id}/disks/{disk_id}` | Get / update host disk |
| GET | `/api/admin/v1/hosts/{id}/vms/unmanaged` | Discover VMs on the host not in the DB (needs worker + Redis, ~30s) |
| POST | `/api/admin/v1/hosts/{id}/vms/import` | Import an existing host VM and assign it to a user (async job) |
| GET/POST | `/api/admin/v1/regions` | List / create regions |
| GET/PATCH/DELETE | `/api/admin/v1/regions/{id}` | Get (stats) / update / delete region |

### Templates, Cost Plans & Custom Pricing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/vm_templates` | List / create templates (auto-creates cost plan if needed) |
| GET/PATCH/DELETE | `/api/admin/v1/vm_templates/{id}` | Get / update / delete template |
| GET/POST | `/api/admin/v1/cost_plans` | List / create cost plans |
| GET/PATCH/DELETE | `/api/admin/v1/cost_plans/{id}` | Get / update / delete cost plan |
| GET/POST | `/api/admin/v1/custom_pricing` | List / create custom pricing models |
| GET/PATCH/DELETE | `/api/admin/v1/custom_pricing/{id}` | Get / update / delete pricing model |
| POST | `/api/admin/v1/custom_pricing/{id}/copy` | Copy pricing model to another region |
| POST | `/api/admin/v1/custom_pricing/{id}/calculate` | Price a configuration |
| GET/POST | `/api/admin/v1/custom_pricing/{id}/templates` | List / create custom templates |
| GET/PATCH/DELETE | `/api/admin/v1/custom_templates/{id}` | Get / update / delete custom template |
| GET | `/api/admin/v1/regions/{id}/custom_pricing` | Pricing models in a region |

### OS Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/vm_os_images` | List / create OS images |
| GET/PATCH/DELETE | `/api/admin/v1/vm_os_images/{id}` | Get / update / delete image |
| POST | `/api/admin/v1/vm_os_images/{id}/download` | Trigger image download to hosts |

### Networking (IP ranges, policies, routers, DNS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/ip_ranges` | List (filter: region_id) / create IP ranges |
| GET/PATCH/DELETE | `/api/admin/v1/ip_ranges/{id}` | Get / update / delete range |
| GET | `/api/admin/v1/ip_ranges/{id}/ips` | Assignments in a range |
| GET | `/api/admin/v1/ip_ranges/{id}/free_ips` | Free IPs in range (IPv4 only) |
| POST | `/api/admin/v1/ip_ranges/{id}/patch_dns` | Re-apply forward+reverse DNS for the whole range (async job) |
| GET/POST | `/api/admin/v1/access_policies` | List / create access policies |
| GET/PATCH/DELETE | `/api/admin/v1/access_policies/{id}` | Get / update / delete policy |
| GET/POST | `/api/admin/v1/routers` | List / create routers |
| GET/PATCH/DELETE | `/api/admin/v1/routers/{id}` | Get / update / delete router |
| GET | `/api/admin/v1/routers/{id}/tunnels` | Cached tunnel inventory (gre/vxlan/wireguard) |
| GET | `/api/admin/v1/routers/{id}/tunnels/{name}/traffic` | Per-tunnel traffic samples (`from`/`to` RFC3339, default 24h) |
| POST | `/api/admin/v1/routers/{id}/tunnels/{name}/toggle` | Enable/disable a tunnel (async job) |
| GET | `/api/admin/v1/routers/{id}/bgp/sessions` | Cached BGP sessions |
| POST | `/api/admin/v1/routers/{id}/bgp/sessions/toggle` | Enable/disable a BGP session (async job) |
| GET | `/api/admin/v1/routers/{id}/bgp/routes` | Originated routes + detected default route |
| POST/DELETE | `/api/admin/v1/routers/{id}/routes/default` | Install/replace or remove static default route (async job) |
| GET/POST | `/api/admin/v1/dns_servers` | List / create DNS providers (`cloudflare`, `ovh`) |
| GET/PATCH/DELETE | `/api/admin/v1/dns_servers/{id}` | Get / update / delete DNS server |
| GET | `/api/admin/v1/dns_servers/{id}/zones` | Zones available on the provider |

**Router network notes** (tunnels/BGP/routes refreshed by a background sampler ~60s):

- Tunnel `enabled` = **administrative** state (not traffic). `local_addr`/`remote_addr` of `"any"` are unused template devices (e.g. `gre0`/`gretap0`). Tunnel interface counters are the canonical per-session traffic source — BGP sessions have no byte counters.
- BGP `enabled` (admin config) and `state` (live FSM: `Idle`→`Connect`→`Active`→`OpenSent`→`OpenConfirm`→`Established`, plus `Down`) are **independent**. Only `Established` means up; `prefixes_received`/`prefixes_sent` are `null` until then. `enabled:true`+`state:Down` is admin-on-but-not-up.
- Toggle body: tunnels `{ "enabled": bool }`; BGP `{ "session_id": str, "enabled": bool }`. Default route body: `{ "next_hop": str }` (AF inferred). All return `JobResponse`.
- BGP/route endpoints only work on routers that support routing (`linux_ssh`, `mikrotik`).
- DNS providers live in the `dns_server` table and are referenced per IP range via `forward_dns_server_id` / `reverse_dns_server_id` (this replaced the old static `dns` block in `config.yaml`). OVH is reverse-only and exposes no zones.

### VM IP Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/v1/vm_ip_assignments` | List (filter: vm_id, ip_range_id, ip, include_deleted) |
| GET | `/api/admin/v1/vm_ip_assignments/{id}` | Get assignment |
| POST | `/api/admin/v1/vm_ip_assignments` | Create (async job; auto-assigns an IP if unspecified) |
| PATCH | `/api/admin/v1/vm_ip_assignments/{id}` | Update (async job) |
| DELETE | `/api/admin/v1/vm_ip_assignments/{id}` | Soft-delete (async job) |

### IP Space (sellable address blocks)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/ip_space` | List (filter: is_available, registry) / create |
| GET/PATCH/DELETE | `/api/admin/v1/ip_space/{id}` | Get / update / delete |
| GET/POST | `/api/admin/v1/ip_space/{id}/pricing` | List / create pricing tiers |
| GET/PATCH/DELETE | `/api/admin/v1/ip_space/{space_id}/pricing/{pricing_id}` | Get / update / delete tier |
| GET | `/api/admin/v1/ip_space/{id}/subscriptions` | Subscriptions on this space |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/subscriptions` | List (filter: user_id) / create |
| GET/PATCH/DELETE | `/api/admin/v1/subscriptions/{id}` | Get (with line items) / update / delete |
| PUT | `/api/admin/v1/subscriptions/{id}/extend` | Grant free time on **any** subscription type (1–365 days) |
| GET | `/api/admin/v1/subscriptions/{id}/line_items` | List line items |
| GET/POST | `/api/admin/v1/subscription_line_items` | Get(`/{id}`) / create line item |
| PATCH/DELETE | `/api/admin/v1/subscription_line_items/{id}` | Update / delete line item |
| GET | `/api/admin/v1/subscriptions/{id}/payments` | List subscription payments |
| GET | `/api/admin/v1/subscription_payments/{hex_id}` | Get subscription payment |
| POST | `/api/admin/v1/subscription_payments/{hex_id}/complete` | Manually complete payment |

### Companies & Payment Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/companies` | List / create companies |
| GET/PATCH/DELETE | `/api/admin/v1/companies/{id}` | Get / update / delete (fails if regions assigned) |
| GET/POST | `/api/admin/v1/payment_methods` | List (filter: company_id) / create provider config (lnd, revolut, stripe, paypal) |
| GET/PATCH/DELETE | `/api/admin/v1/payment_methods/{id}` | Get (secrets redacted) / update / delete |
| GET | `/api/admin/v1/user_payment_methods` | List users' **saved** methods (filter: user_id) |
| GET/PATCH/DELETE | `/api/admin/v1/user_payment_methods/{id}` | Get / update (label, default, enabled) / delete |

> `payment_methods` = merchant/provider configuration. `user_payment_methods` = wallets/cards users saved on their own account (NWC or Revolut card). Secrets and NWC strings are never returned in either.

### Referral Program

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/v1/referrals` | List referrals (`search` = code substring or hex pubkey) |
| GET | `/api/admin/v1/referrals/{id}` | Detail: earned/settled/outstanding per currency, payouts, counts |
| PATCH | `/api/admin/v1/referrals/{id}` | Rename code, set commission override / payout threshold |
| GET/POST | `/api/admin/v1/referrals/{id}/payouts` | List / create (record) payouts |
| PATCH | `/api/admin/v1/referrals/{id}/payouts/{payout_id}` | Reconcile a payout (is_paid, output, mode, pre_image) |

### Managed Apps (catalog, tags, clusters, deployments)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/apps` | List (filter: enabled, search) / create catalog app |
| GET/PATCH/DELETE | `/api/admin/v1/apps/{id}` | Get / update / delete app |
| GET/POST | `/api/admin/v1/app-tags` | List / create tags |
| GET/PATCH/DELETE | `/api/admin/v1/app-tags/{id}` | Get / update / delete tag |
| GET/POST | `/api/admin/v1/app_clusters` | List (filter: enabled, region_id, search) / create cluster |
| GET/PATCH/DELETE | `/api/admin/v1/app_clusters/{id}` | Get / update / delete cluster |
| GET | `/api/admin/v1/app-deployments` | List all deployments (filter incl. `include_deleted`) |
| GET | `/api/admin/v1/app-deployments/{id}` | Get one, **including decrypted config** |
| PATCH | `/api/admin/v1/app-deployments/{id}` | Rename / reconfigure / set custom domain |
| DELETE | `/api/admin/v1/app-deployments/{id}` | Delete (body `{"purge": true}` is super_admin only) |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/v1/reports/time-series` | Payment time series (`start_date`, `end_date`, `company_id`) |
| GET | `/api/admin/v1/reports/referral-usage/time-series` | Referral usage report |
| GET | `/api/admin/v1/reports/profit-loss` | Revenue vs tracked costs per period (`analytics::view`) |
| GET | `/api/admin/v1/reports/oss` | EU OSS VAT report by period + destination country (`analytics::view`) |

### Resource Cost Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/v1/resource_costs` | List (filter: resource_type, resource_id) / create |
| GET/PATCH/DELETE | `/api/admin/v1/resource_costs/{id}` | Get / update / delete |

Costs feed the profit-loss report. `resource_type` is `vm_host`, `ip_range` (amount = cost per single IP) or `generic` (free-form `label`, no linked resource). Cost data is never exposed to end users.

### Jobs & WebSocket

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/v1/auth/ticket` | Mint a WebSocket ticket |
| WS | `/api/admin/v1/jobs/feedback?ticket=&job_id=` | Real-time job feedback (`job_id` optional = global feed) |

Message `type` values: `connected`, `pong`, `error`, `job_feedback`.

## Permissions

Format `resource::action`.

**Resources:** `users`, `virtual_machines`, `hosts`, `payments`, `analytics`, `system`, `roles`, `audit`, `access_policy`, `company`, `ip_range`, `router`, `dns_server`, `vm_custom_pricing`, `host_region`, `vm_os_image`, `vm_payment`, `vm_template`, `subscriptions`, `subscription_line_items`, `subscription_payments`, `payment_method_config`, `user_payment_method`, `resource_cost`, `referral`, `app`, `app_deployment`

**Actions:** `create`, `view`, `update`, `delete`, `bulk_update` (fleet-wide mutations such as `virtual_machines::bulk_update` for extend-all; granted separately from `update`)

## Enums

```
DiskType: hdd | ssd
DiskInterface: sata | scsi | pcie
VmRunningStates: unknown | running | stopped | creating
AdminPaymentMethod: lightning | revolut | paypal | stripe
VmHostKind: proxmox | libvirt
CostPlanIntervalType: day | month | year
ApiOsDistribution: ubuntu | debian | centos | fedora | freebsd | opensuse | archlinux | redhatenterprise
                 | almalinux | rockylinux | alpine | nixos | openbsd | netbsd | gentoo | voidlinux
IpRangeAllocationMode: random | sequential | slaac_eui64
NetworkAccessPolicyKind: static_arp
RouterKind: mikrotik | ovh_additional_ip | linux_ssh
DnsServerKind: cloudflare (forward + reverse) | ovh (reverse only)
TunnelKind: gre | vxlan | wireguard
BgpSessionState: Idle | Connect | Active | OpenSent | OpenConfirm | Established | Down
BgpDirection: upstream | downstream | peer | unknown
AdminUserRole: super_admin | admin | read_only
AdminUserStatus: active | suspended | deleted
AdminVmHistoryActionType: created | started | stopped | restarted | deleted | expired | renewed
                        | reinstalled | state_changed | payment_received | configuration_changed
                        | transferred | migrated | refunded
SubscriptionPaymentType: purchase | renewal | upgrade | refund
SubscriptionType: ip_range | asn_sponsoring | dns_hosting | vps
InternetRegistry: arin(0) | ripe(1) | apnic(2) | lacnic(3) | afrinic(4)
CpuMfg: unknown | intel | amd | apple | nvidia | arm
CpuArch: unknown | x86_64 | arm64
GpuMfg: none | nvidia | amd
ResourceCostType: recurring | one_time
Currency: EUR | USD | GBP | CAD | CHF | AUD | JPY | BTC
```

## Gotchas

- **Amounts are millisats for BTC**, cents for fiat — both in the smallest unit.
- **Async endpoints return a `job_id`, not a result.** Validation that needs the host (capacity, image arch, spec ranges) surfaces on the job, not the HTTP response.
- **Unknown JSON keys are ignored, not rejected** on VM creation — a misspelled optional field silently falls back to "any".
- **`DELETE /users/{id}` is a purge**, not a soft delete, and is refused while the user has live VMs.
- **Recording a refund does not delete the VM**; deletion stays an explicit `DELETE /vms/{id}`.
- **`extend-all` includes expired VMs** (any non-deleted VM that has been paid at least once), so it revives lapsed machines.
- **VM migration is Proxmox-only** and refuses cross-region, cross-arch, cross-hypervisor or over-capacity targets.
- Deleting an **app** or **app cluster** fails while any deployment row still references it, including soft-deleted ones — purge those first (`super_admin`).
