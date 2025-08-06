import { useMemo } from "react";
import { AdminApi } from "../lib/api";

export function useAdminApi() {
  return useMemo(() => new AdminApi(), []);
}
