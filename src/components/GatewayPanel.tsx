import { useCallback, useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type { GatewayStatus, GatewayTestResult } from "../lib/api";
import { gatewayHandleLabel } from "../utils/gateway";
import { Button } from "./Button";

interface GatewayPanelProps {
  configId: number;
}

export function GatewayPanel({ configId }: GatewayPanelProps) {
  const adminApi = useAdminApi();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<GatewayTestResult | null>(null);
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      setStatus(await adminApi.getPaymentGatewayStatus(configId));
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to load gateway status");
    } finally {
      setLoadingStatus(false);
    }
  }, [adminApi, configId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await adminApi.testPaymentGateway(configId));
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : "Gateway test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={handleTest} disabled={testing}>
            {testing ? "Testing..." : "Test connection"}
          </Button>
          <span className="text-xs text-gray-400">Uses the saved URL and API key</span>
        </div>
        {testResult && (
          <output
            data-testid="gateway-test-result"
            className={
              testResult.ok
                ? "mt-2 block rounded border border-green-500/30 bg-green-900/20 px-3 py-2 text-sm text-green-400"
                : "mt-2 block rounded border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-400"
            }
          >
            {testResult.message}
          </output>
        )}
      </div>

      <div className="rounded border border-slate-700 bg-slate-900/40 p-3" data-testid="gateway-status">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-white">Status, last 24 hours</span>
          <Button type="button" size="xs" variant="ghost" onClick={loadStatus} disabled={loadingStatus}>
            {loadingStatus ? "Loading..." : "Refresh"}
          </Button>
        </div>
        {statusError && <p className="mt-2 text-sm text-red-400">{statusError}</p>}
        {status && (
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Gateway payments</dt>
              <dd className="text-white tabular-nums">{status.payments_last_24h}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Last paid webhook</dt>
              <dd className="text-white">
                {status.last_paid_webhook_at ? new Date(status.last_paid_webhook_at).toLocaleString() : "None yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Handles</dt>
              <dd className="text-white">
                {status.handles.length > 0 ? status.handles.map(gatewayHandleLabel).join(", ") : "Nothing"}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
