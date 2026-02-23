# LNVPS Admin Dashboard

A modern React admin dashboard for managing the [LNVPS](https://lnvps.net) Lightning VPS service. Built with React 19, TypeScript, and Tailwind CSS, featuring Nostr protocol authentication.

## Features

### User Management
- View and manage user accounts
- Role-based access control (Super Admin, Admin, Read Only)
- User details with subscription history
- Bulk messaging to users

### Virtual Machine Management
- List and monitor all VMs across hosts
- VM details with real-time status
- IP assignment management
- Subscription tracking and renewals

### Infrastructure Management
- **Hosts** - Manage hypervisor hosts and their resources
- **Regions** - Geographic region configuration
- **Routers** - Network router management
- **IP Spaces & Ranges** - IPv4/IPv6 address allocation
- **OS Images** - Operating system template management
- **VM Templates** - Predefined VM configurations

### Billing & Payments
- Payment method configuration
- Custom pricing rules
- Subscription management
- Sales reports with filtering by region/host
- Referral tracking and reports

### Administration
- Audit logging
- Job history and monitoring
- Access policies
- System configuration
- Analytics dashboard

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **React Router v7** - Routing
- **TanStack Query** - Server state management
- **Recharts** - Data visualization
- **Nostr (Snort)** - Authentication protocol

## Prerequisites

- Node.js 18+
- Yarn (v4 Berry with PnP)

## Getting Started

### Install dependencies

```bash
yarn install
```

### Start development server

```bash
yarn dev
```

The app will be available at `http://localhost:5173`

### Build for production

```bash
yarn build
```

### Preview production build

```bash
yarn preview
```

## Development

### Code Quality

```bash
# TypeScript type checking
yarn tsc --noEmit

# Format and lint check
yarn biome check

# Format and auto-fix
yarn biome check --write
```

### Project Structure

```
src/
├── assets/           # Static assets
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── layouts/          # Layout components
├── lib/              # Core utilities (API client, auth)
├── pages/            # Page components
├── services/         # Business logic services
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── App.tsx           # Main app with routing
└── main.tsx          # React entry point
```

### Authentication

The dashboard uses Nostr protocol for authentication. Users sign in with their Nostr identity (nsec/extension), which is verified against the LNVPS admin API.

### Permissions

Access is controlled via a permission system with the format `resource::action`:

- `users::view`, `users::edit`
- `virtual_machines::view`, `virtual_machines::create`
- `analytics::view`
- etc.

Protected routes use the `PermissionGuard` component to enforce access.

## API

The dashboard connects to the LNVPS Admin API. See [ADMIN_API_ENDPOINTS.md](https://github.com/LNVPS/api/blob/master/ADMIN_API_ENDPOINTS.md) for API documentation.

## Contributing

See [AGENTS.md](AGENTS.md) for coding guidelines and contribution standards.

## License

Proprietary - LNVPS
