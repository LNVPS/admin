import { useMemo, useState } from "react";
import { AdminUserRole, type UserRoleInfo } from "../lib/api";
import { LoginState } from "../lib/login";

export function useUserRoles() {
  // Read cached roles synchronously on the first render so the initial paint
  // already reflects the user's permissions. Deferring this to a useEffect made
  // every PermissionGuard/nav render once with zero permissions (a visible
  // "Access Denied"/empty-nav flash) before the effect populated state.
  const [roles] = useState<UserRoleInfo[]>(() => LoginState.getRoles() ?? []);

  const permissions = useMemo(
    () => [...new Set(roles.flatMap((roleInfo) => roleInfo.role.permissions))],
    [roles],
  );

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((permission) =>
      permissions.includes(permission),
    );
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
  };

  const isSuperAdmin = useMemo(
    () => roles.some((roleInfo) => roleInfo.role.name === AdminUserRole.SUPER_ADMIN),
    [roles],
  );

  return {
    roles,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
  };
}
