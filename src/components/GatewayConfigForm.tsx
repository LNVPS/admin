import { useState } from "react";
import type { GatewayHandleableMethod, GatewayOffSessionMode, GatewayProviderConfig, SanitizedGatewayProviderConfig } from "../lib/api";
import {
  GATEWAY_DEFAULT_TOLERANCE_SECONDS,
  GATEWAY_HANDLEABLE,
  GATEWAY_HANDLES_HELP,
  GATEWAY_OFF_SESSION_HELP,
  GATEWAY_OFF_SESSION_OPTIONS,
  GATEWAY_WEBHOOK_EVENTS,
  gatewayWebhookUrl,
  toggleGatewayHandle,
} from "../utils/gateway";
import { Button } from "./Button";

interface GatewayConfigFormProps {
  config: GatewayProviderConfig;
  onChange: (config: GatewayProviderConfig) => void;
  apiBase: string;
  isEditing?: boolean;
  sanitizedConfig?: SanitizedGatewayProviderConfig | null;
  modifiedFields?: Set<string>;
  onFieldModified?: (field: string) => void;
}

type GatewaySecretField = "api_key" | "webhook_secret";

export function GatewayConfigForm({
  config,
  onChange,
  apiBase,
  isEditing = false,
  sanitizedConfig,
  modifiedFields,
  onFieldModified,
}: GatewayConfigFormProps) {
  const [copied, setCopied] = useState(false);
  const webhookUrl = gatewayWebhookUrl(apiBase);
  const handles = config.handles ?? [];

  const isSecretSet = (field: GatewaySecretField): boolean =>
    field === "api_key" ? sanitizedConfig?.has_api_key === true : sanitizedConfig?.has_webhook_secret === true;

  const getSecretFieldProps = (field: GatewaySecretField) => {
    if (isEditing && !modifiedFields?.has(field)) {
      return { value: "", placeholder: isSecretSet(field) ? "••••••••" : "Not set" };
    }
    return { value: config[field] ?? "", placeholder: undefined };
  };

  const updateSecret = (field: GatewaySecretField, value: string) => {
    if (isEditing) onFieldModified?.(field);
    onChange({ ...config, [field]: value });
  };

  const renderSecretHint = (field: GatewaySecretField) => {
    if (!isEditing) return null;
    return (
      <p className="text-xs text-gray-500 mt-1">
        {modifiedFields?.has(field) ? "Will be updated" : "Leave empty to keep existing value"}
      </p>
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy webhook URL:", err);
    }
  };

  return (
    <div className="space-y-4" data-testid="gateway-config-form">
      <div>
        <label htmlFor="gateway-url" className="block text-xs font-medium text-white mb-2">
          Gateway URL *
        </label>
        <input
          id="gateway-url"
          type="text"
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://pay.example.com"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="gateway-api-key" className="block text-xs font-medium text-white mb-2">
            API Key *
          </label>
          <input
            id="gateway-api-key"
            type="password"
            autoComplete="off"
            {...getSecretFieldProps("api_key")}
            onChange={(e) => updateSecret("api_key", e.target.value)}
            required={!isEditing}
          />
          {renderSecretHint("api_key")}
        </div>
        <div>
          <label htmlFor="gateway-webhook-secret" className="block text-xs font-medium text-white mb-2">
            Webhook Secret *
          </label>
          <input
            id="gateway-webhook-secret"
            type="password"
            autoComplete="off"
            {...getSecretFieldProps("webhook_secret")}
            onChange={(e) => updateSecret("webhook_secret", e.target.value)}
            required={!isEditing}
          />
          {renderSecretHint("webhook_secret")}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="gateway-tolerance" className="block text-xs font-medium text-white mb-2">
            Webhook Tolerance (seconds)
          </label>
          <input
            id="gateway-tolerance"
            type="number"
            min="1"
            step="1"
            value={config.tolerance_seconds ?? ""}
            onChange={(e) =>
              onChange({
                ...config,
                tolerance_seconds: e.target.value === "" ? null : parseInt(e.target.value, 10),
              })
            }
            placeholder={String(GATEWAY_DEFAULT_TOLERANCE_SECONDS)}
          />
          <p className="text-xs text-gray-500 mt-1">How old a signed webhook may be before it is refused</p>
        </div>
        <div>
          <label htmlFor="gateway-off-session" className="block text-xs font-medium text-white mb-2">
            Off-session Renewals
          </label>
          <select
            id="gateway-off-session"
            value={config.off_session_renewals ?? "off"}
            onChange={(e) => onChange({ ...config, off_session_renewals: e.target.value as GatewayOffSessionMode })}
          >
            {GATEWAY_OFF_SESSION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-400">{GATEWAY_OFF_SESSION_HELP}</p>

      <div>
        <span className="block text-xs font-medium text-white mb-2">Handled Methods</span>
        <div className="flex flex-wrap gap-2">
          {GATEWAY_HANDLEABLE.map((method) => (
            <label key={method.value} className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 rounded cursor-pointer">
              <input
                type="checkbox"
                aria-label={method.label}
                checked={handles.includes(method.value)}
                onChange={(e) =>
                  onChange({
                    ...config,
                    handles: toggleGatewayHandle(handles, method.value as GatewayHandleableMethod, e.target.checked),
                  })
                }
                className="rounded"
              />
              <span className="text-sm text-white">{method.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{GATEWAY_HANDLES_HELP}</p>
      </div>

      <div className="rounded border border-slate-700 bg-slate-900/40 p-3 space-y-2">
        <span className="block text-xs font-medium text-white">Webhook URL for the gateway</span>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
            {webhookUrl}
          </code>
          <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-gray-400">Subscribe to these events:</p>
        <div className="flex flex-wrap gap-1.5">
          {GATEWAY_WEBHOOK_EVENTS.map((event) => (
            <span key={event} className="rounded bg-slate-700 px-2 py-0.5 font-mono text-xs text-slate-200">
              {event}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
