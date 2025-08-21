import { useState, useEffect } from "react";

interface ProxmoxTokenInputProps {
  value: string;
  onChange: (token: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface TokenParts {
  user: string;
  realm: string;
  tokenId: string;
  uuid: string;
}

export function ProxmoxTokenInput({
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
}: ProxmoxTokenInputProps) {
  const [tokenParts, setTokenParts] = useState<TokenParts>({
    user: "",
    realm: "",
    tokenId: "",
    uuid: "",
  });

  // Parse existing token when value changes
  useEffect(() => {
    if (value) {
      const parsed = parseProxmoxToken(value);
      if (parsed) {
        setTokenParts(parsed);
      }
    }
  }, [value]);

  const parseProxmoxToken = (token: string): TokenParts | null => {
    // Format: USER@REALM!TOKENID=UUID
    const match = token.match(/^([^@]+)@([^!]+)!([^=]+)=(.+)$/);
    if (match) {
      return {
        user: match[1],
        realm: match[2],
        tokenId: match[3],
        uuid: match[4],
      };
    }
    return null;
  };

  const buildToken = (parts: TokenParts): string => {
    if (parts.user && parts.realm && parts.tokenId && parts.uuid) {
      return `${parts.user}@${parts.realm}!${parts.tokenId}=${parts.uuid}`;
    }
    return "";
  };

  const handlePartChange = (field: keyof TokenParts, newValue: string) => {
    const updatedParts = { ...tokenParts, [field]: newValue };
    setTokenParts(updatedParts);

    const newToken = buildToken(updatedParts);
    onChange(newToken);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400">
        Proxmox Token Format: USER@REALM!TOKENID=UUID
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            User *
          </label>
          <input
            type="text"
            value={tokenParts.user}
            onChange={(e) => handlePartChange("user", e.target.value)}
            className={`text-sm ${className}`}
            placeholder="root"
            disabled={disabled}
            required={required}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Realm *
          </label>
          <input
            type="text"
            value={tokenParts.realm}
            onChange={(e) => handlePartChange("realm", e.target.value)}
            className={`text-sm ${className}`}
            placeholder="pam"
            disabled={disabled}
            required={required}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Token ID *
          </label>
          <input
            type="text"
            value={tokenParts.tokenId}
            onChange={(e) => handlePartChange("tokenId", e.target.value)}
            className={`text-sm ${className}`}
            placeholder="mytoken"
            disabled={disabled}
            required={required}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            UUID *
          </label>
          <input
            type="text"
            value={tokenParts.uuid}
            onChange={(e) => handlePartChange("uuid", e.target.value)}
            className={`text-sm font-mono ${className}`}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            disabled={disabled}
            required={required}
          />
        </div>
      </div>
    </div>
  );
}
