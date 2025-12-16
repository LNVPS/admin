import { useCallback } from "react";
import { useCached } from "./useCached";
import { useAdminApi } from "./useAdminApi";
import type { AdminCompanyInfo } from "../lib/api";

export function useCachedCompanies(expires: number = 10) {
  const adminApi = useAdminApi();

  const loader = useCallback(async () => {
    const response = await adminApi.getCompanies({ limit: 1000 });
    return response.data;
  }, [adminApi]);

  return useCached<AdminCompanyInfo[]>("companies", loader, expires);
}
