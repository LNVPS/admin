# LNVPS Admin Dashboard - Agent Guidelines

This is a React 19 + TypeScript admin dashboard for the LNVPS (Lightning VPS) service using Nostr protocol for authentication.

## Build & Development Commands

### Package Manager
- **Always use `yarn`** (Yarn v4 Berry with PnP) - never use npm
- Install dependencies: `yarn install`
- Add package: `yarn add <package-name>`
- Add dev package: `yarn add -D <package-name>`

### Development
- Start dev server: `yarn dev` (Vite dev server with HMR)
- Build for production: `yarn build` (TypeScript compilation + Vite build)
- Preview production build: `yarn preview`
- Lint code: `yarn lint` (ESLint for TS/TSX files, max warnings: 0)

### Testing
- **No test framework configured yet** - tests would need to be added with Vitest or Jest

### Running Individual Commands
- TypeScript check: `yarn tsc --noEmit`
- Format check: `yarn biome check`
- Format & fix: `yarn biome check --write`
- Lint specific file: `yarn eslint src/path/to/file.tsx`

## Project Structure

```
src/
├── assets/           # Static assets
├── components/       # Reusable React components (Button, Modal, Table, etc.)
├── hooks/            # Custom React hooks (useAdminApi, useApiCall, useLogin, etc.)
├── layouts/          # Layout components (DashboardLayout, ProtectedLayout)
├── lib/              # Core utilities (api.ts, login.ts, errorHandler.ts)
├── pages/            # Page components for each admin resource
├── services/         # Business logic services (job feedback, notifications, toast)
├── types/            # TypeScript type definitions (domain types, API types)
├── utils/            # Utility functions (formatBytes, currency)
├── App.tsx           # Main app with routing
├── main.tsx          # React root entry point
└── index.css         # Global Tailwind styles
```

## Code Style Guidelines

### Formatting (Biome)
- **Indentation**: 2 spaces (not tabs)
- **Line width**: 120 characters max
- **Quotes**: Double quotes for strings
- **Semicolons**: Required (default)
- Auto-organize imports is enabled - Biome will sort imports automatically

### TypeScript
- **Strict mode enabled** - all strict TypeScript checks are on
- **Type annotations**: Use explicit types for function parameters and returns
- **Interface vs Type**: Prefer `interface` for object shapes, `type` for unions/intersections
- **Enums**: Use TypeScript enums for API constants (see lib/api.ts for examples)
- **Null handling**: Use optional chaining (`?.`) and nullish coalescing (`??`)
- **No unused vars**: Enabled - remove unused imports, variables, and parameters

### Imports
- **Order**: Organize imports automatically with Biome (external, then internal)
- **Type imports**: Use `import type` for type-only imports
- **Named exports**: Prefer named exports over default exports for components
- **Examples**:
  ```typescript
  import type React from "react";
  import { useState, useEffect } from "react";
  import clsx from "clsx";
  import { useAdminApi } from "../hooks/useAdminApi";
  import type { User } from "../types";
  ```

### Naming Conventions
- **Components**: PascalCase - `Button`, `UserTable`, `DashboardLayout`
- **Hooks**: camelCase with `use` prefix - `useApiCall`, `useLogin`, `useToast`
- **Functions**: camelCase - `handleSubmit`, `fetchUsers`, `formatBytes`
- **Constants**: UPPER_SNAKE_CASE - `API_BASE_URL`, `MAX_RETRIES`
- **Enums**: PascalCase enum name, UPPER_CASE values - `VmState.RUNNING`
- **Interfaces/Types**: PascalCase - `User`, `VirtualMachine`, `PaginatedResponse<T>`
- **Props interfaces**: ComponentName + Props - `ButtonProps`, `ModalProps`
- **Files**: Match component/hook name - `Button.tsx`, `useApiCall.ts`

### Component Patterns
- **Function components**: Use function declarations with named exports
  ```typescript
  export function Button({ variant, children }: ButtonProps) {
    // component logic
  }
  ```
- **Props destructuring**: Destructure props in function signature
- **Default props**: Use default parameter values, not defaultProps
- **Boolean props**: Prefix with `is/has/should` - `isLoading`, `hasError`, `shouldShow`
- **Handlers**: Prefix with `handle` - `handleClick`, `handleSubmit`, `handleChange`
- **Render functions**: Prefix with `render` - `renderHeader`, `renderRow`

### State Management
- **React hooks**: Use `useState`, `useEffect`, `useCallback`, `useMemo`
- **Server state**: Use `@tanstack/react-query` for API data
- **Custom hooks**: Extract reusable logic into custom hooks
- **Avoid prop drilling**: Use context or custom hooks for deep state sharing

### Error Handling
- **Try-catch**: Wrap async operations in try-catch blocks
- **Error boundaries**: Use for component-level error handling
- **API errors**: Use `handleApiError` from `lib/errorHandler.ts`
- **User feedback**: Show errors via toast notifications (useToast hook)
- **Type guards**: Check error types - `err instanceof Error ? err : new Error("Unknown error")`

### API & Data Fetching
- **API client**: Use `AdminApi` class from `lib/api.ts`
- **Hook pattern**: Use `useAdminApi` hook to get authenticated API instance
- **Custom hooks**: `useApiCall` for simple fetches with loading/error states
- **React Query**: Use for complex data fetching with caching
- **Types**: Import enums and types from `lib/api.ts` and `types/index.ts`

### Styling
- **Tailwind CSS**: Use utility classes for styling
- **Dark mode**: Use `dark:` prefix (dark mode enabled via class strategy)
- **Class composition**: Use `clsx` for conditional classes
- **Example**:
  ```typescript
  <button className={clsx(
    "px-4 py-2 rounded-lg",
    variant === "primary" && "bg-blue-600 text-white",
    disabled && "opacity-50 cursor-not-allowed"
  )} />
  ```

### Navigation & Routing
- **Router**: React Router v7
- **Prefer Link over Button**: Use `<Link>` for navigation, not `navigate()` hook or Button clicks
- **Protected routes**: Wrap with `PermissionGuard` for permission-based access
- **Example**:
  ```typescript
  import { Link } from "react-router-dom";
  <Link to="/users" className="text-blue-600 hover:underline">View Users</Link>
  ```

### Permissions
- **Permission format**: `resource::action` - `"users::view"`, `"virtual_machines::create"`
- **Guards**: Use `PermissionGuard` component or `usePermissions` hook
- **Roles**: Enums defined in `AdminUserRole` - `SUPER_ADMIN`, `ADMIN`, `READ_ONLY`

### Comments & Documentation
- **TSDoc**: Use JSDoc/TSDoc for complex functions and hooks
- **Inline comments**: Explain "why" not "what" - code should be self-documenting
- **TODO comments**: Use `// TODO:` for future work
- **Avoid over-commenting**: Clear code > excessive comments

## API Documentation
- API endpoint docs: `../lnvps/ADMIN_API_ENDPOINTS.md`
- GitHub: https://github.com/LNVPS/api/blob/master/ADMIN_API_ENDPOINTS.md

## Common Patterns in This Codebase

### Paginated Tables
```typescript
import { PaginatedTable } from "../components/PaginatedTable";

// Use PaginatedTable for list views with server-side pagination
<PaginatedTable<User>
  columns={columns}
  fetchData={(limit, offset) => api.getUsers(limit, offset)}
  onRowClick={(user) => navigate(`/users/${user.id}`)}
/>
```

### Custom Hooks for API
```typescript
// Pattern: useApiCall for simple data fetching
const { data, loading, error, retry } = useApiCall(
  () => api.getUser(userId),
  [userId]
);
```

### Toast Notifications
```typescript
import { useToast } from "../hooks/useToast";

const { showToast } = useToast();
showToast("User created successfully", "success");
showToast("Failed to create user", "error");
```

## Git Workflow
- Commit messages: Clear, imperative mood - "Add user creation modal", "Fix pagination bug"
- No force push to main/master
- Run `yarn lint` before committing
