import { hexToBech32 } from "@snort/shared";
import { NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

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

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

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
                {hexToBech32("npub", pubkey).slice(0, 12)}...
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-300 font-mono">
              {hexToBech32("npub", pubkey).slice(0, 12)}...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;
