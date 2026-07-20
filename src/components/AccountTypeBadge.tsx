import clsx from "clsx";
import type { AccountType } from "../lib/api";

interface AccountTypeBadgeProps {
  accountType: AccountType;
  className?: string;
}

const ACCOUNT_TYPE_STYLES: Record<AccountType, { label: string; classes: string }> = {
  nostr: { label: "Nostr", classes: "border border-purple-500/40 bg-purple-500/10 text-purple-300" },
  oauth: { label: "OAuth", classes: "border border-sky-500/40 bg-sky-500/10 text-sky-300" },
  webauthn: { label: "Passkey", classes: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
};

export function AccountTypeBadge({ accountType, className }: AccountTypeBadgeProps) {
  const style = ACCOUNT_TYPE_STYLES[accountType] ?? {
    label: accountType,
    classes: "border border-slate-600 bg-slate-700/40 text-slate-300",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded",
        style.classes,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
