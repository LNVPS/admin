import { useCallback } from "react";
import { useCached } from "./useCached";
import { useAdminApi } from "./useAdminApi";
import type { AdminRegionInfo } from "../lib/api";

export function useCachedRegions(expires: number = 300) {
  const adminApi = useAdminApi();

  const loader = useCallback(async () => {
    const response = await adminApi.getRegions({ limit: 100 });
    return response.data;
  }, [adminApi]);

  return useCached<AdminRegionInfo[]>("regions", loader, expires);
}
