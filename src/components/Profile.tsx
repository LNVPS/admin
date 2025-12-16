import { useState } from "react";
import { hexToBech32 } from "@snort/shared";
import { NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

export interface ProfileProps {
  pubkey: string;
  withName?: boolean;
  className?: string;
  avatarSize?: "sm" | "md" | "lg";
}

export function Profile({
  pubkey,
  withName = true,
  className = "",
  avatarSize = "md",
}: ProfileProps) {
  const link = NostrLink.publicKey(pubkey);
  const profile = useUserProfile(link.id);
  const name = profile?.display_name ?? profile?.name ?? "";
  const [copied, setCopied] = useState(false);

  const npub = hexToBech32("npub", pubkey);

  const handleCopyPubkey = async () => {
    try {
      await navigator.clipboard.writeText(npub);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy pubkey:", err);
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const pubkeyDisplay = (
    <span className="inline-flex items-center gap-1">
      <span title={npub}>{npub.slice(0, 12)}...</span>
      <button
        onClick={handleCopyPubkey}
        className="text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
        title={copied ? "Copied!" : "Copy pubkey"}
      >
        {copied ? (
          <CheckIcon className="h-3 w-3 text-green-400" />
        ) : (
          <ClipboardIcon className="h-3 w-3" />
        )}
      </button>
    </span>
  );

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <img
        src={profile?.picture || `https://robohash.org/${pubkey}?set=set4`}
        alt={name || "Profile"}
        className={`${sizeClasses[avatarSize]} rounded-full bg-slate-800 object-cover object-center`}
        onError={(e) => {
          // Fallback to robohash if profile image fails to load
          (e.target as HTMLImageElement).src =
            `https://robohash.org/${pubkey}?set=set4`;
        }}
      />
      {withName && (
        <div className="flex flex-col">
          {name.length > 0 ? (
            <>
              <div className="font-medium text-white">{name}</div>
              <div className="text-xs text-gray-400 font-mono">
                {pubkeyDisplay}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-300 font-mono">
              {pubkeyDisplay}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;
