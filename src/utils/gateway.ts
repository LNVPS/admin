import type {
  GatewayHandleableMethod,
  GatewayOffSessionMode,
  GatewayProviderConfig,
  SanitizedGatewayProviderConfig,
} from "../lib/api";
import { confirmDialog } from "../services/confirmService";

export const GATEWAY_HANDLEABLE: { value: GatewayHandleableMethod; label: string }[] = [
  { value: "lightning", label: "Lightning" },
  { value: "onchain", label: "On-chain (Bitcoin)" },
  { value: "fixedfloat", label: "FixedFloat" },
  { value: "revolut", label: "Revolut" },
  { value: "stripe", label: "Stripe" },
];

export const GATEWAY_OFF_SESSION_OPTIONS: { value: GatewayOffSessionMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "dry-run", label: "Dry run" },
  { value: "live", label: "Live" },
];

export const GATEWAY_DEFAULT_TOLERANCE_SECONDS = 300;

export const GATEWAY_WEBHOOK_PATH = "/api/v1/webhook/gateway";

export const GATEWAY_WEBHOOK_EVENTS = ["payment.paid", "payment.expired", "payment.cancelled", "refund.completed"];

export const GATEWAY_SECRET_FIELDS = ["api_key", "webhook_secret"];

export const GATEWAY_ENABLE_GUARD =
  "Enabling this moves the ticked methods to the gateway for this company. Existing in-flight payments keep settling on the path they started on.";

export const GATEWAY_OFF_SESSION_HELP =
  "Off: customers renew by hand. Dry run: the gateway is asked and the result logged but nothing is charged. Live: saved cards are charged automatically.";

export const GATEWAY_HANDLES_HELP =
  "Methods ticked here are created through the gateway. Methods not ticked stay on the old in-process path.";

export function gatewayHandleLabel(method: string): string {
  return GATEWAY_HANDLEABLE.find((m) => m.value === method)?.label ?? method;
}

export function gatewayWebhookUrl(apiBase: string): string {
  return `${apiBase.replace(/\/+$/, "")}${GATEWAY_WEBHOOK_PATH}`;
}

export function emptyGatewayConfig(): GatewayProviderConfig {
  return {
    type: "gateway",
    url: "",
    tolerance_seconds: GATEWAY_DEFAULT_TOLERANCE_SECONDS,
    off_session_renewals: "off",
    handles: [],
  };
}

export function gatewayConfigFromSanitized(sanitized: SanitizedGatewayProviderConfig): GatewayProviderConfig {
  return {
    type: "gateway",
    url: sanitized.url,
    tolerance_seconds: sanitized.tolerance_seconds,
    off_session_renewals: sanitized.off_session_renewals,
    handles: [...sanitized.handles],
  };
}

export function toggleGatewayHandle(
  handles: GatewayHandleableMethod[],
  method: GatewayHandleableMethod,
  checked: boolean,
): GatewayHandleableMethod[] {
  const next = checked ? [...handles.filter((h) => h !== method), method] : handles.filter((h) => h !== method);
  return GATEWAY_HANDLEABLE.map((m) => m.value).filter((m) => next.includes(m));
}

export function gatewayConfigForSubmit(
  config: GatewayProviderConfig,
  modifiedSecrets: Set<string> | null,
): GatewayProviderConfig {
  const result: GatewayProviderConfig = { ...config, handles: [...(config.handles ?? [])] };
  if (result.tolerance_seconds === null || result.tolerance_seconds === undefined) {
    delete result.tolerance_seconds;
  }
  if (modifiedSecrets) {
    for (const field of GATEWAY_SECRET_FIELDS) {
      if (!modifiedSecrets.has(field)) {
        delete (result as unknown as Record<string, unknown>)[field];
      }
    }
  }
  return result;
}

export function confirmGatewayEnable(): Promise<boolean> {
  return confirmDialog({
    title: "Enable payment gateway",
    message: GATEWAY_ENABLE_GUARD,
    confirmText: "Enable",
    variant: "primary",
  });
}
