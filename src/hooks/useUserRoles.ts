import { useState, useEffect } from "react";
import { UserRoleInfo } from "../lib/api";
import { LoginState } from "../lib/login";

export function useUserRoles() {
  const [roles, setRoles] = useState<UserRoleInfo[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    // Only read from localStorage/cache - don't fetch from API
    const cachedRoles = LoginState.getRoles();
    if (cachedRoles) {
      console.log("Using cached user roles from localStorage");
      setRoles(cachedRoles);
      const userPermissions = cachedRoles.flatMap(
        (roleInfo) => roleInfo.role.permissions,
      );
      setPermissions([...new Set(userPermissions)]);
    } else {
      console.log("No cached user roles found in localStorage");
      setRoles([]);
      setPermissions([]);
    }
  }, []);

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

  return {
    roles,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
