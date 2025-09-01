import { useState, useEffect } from "react";

interface OvhCredentialsInputProps {
  value: string;
  onChange: (credentials: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface CredentialsParts {
  applicationKey: string;
  applicationSecret: string;
  consumerKey: string;
}

export function OvhCredentialsInput({
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
}: OvhCredentialsInputProps) {
  const [credentialsParts, setCredentialsParts] = useState<CredentialsParts>({
    applicationKey: "",
    applicationSecret: "",
    consumerKey: "",
  });

  // Parse existing credentials when value changes
  useEffect(() => {
    if (value) {
      const parsed = parseOvhCredentials(value);
      if (parsed) {
        setCredentialsParts(parsed);
      }
    }
  }, [value]);

  const parseOvhCredentials = (
    credentials: string,
  ): CredentialsParts | null => {
    // Format: APPLICATION_KEY:APPLICATION_SECRET:CONSUMER_KEY
    const parts = credentials.split(":");
    if (parts.length === 3) {
      return {
        applicationKey: parts[0],
        applicationSecret: parts[1],
        consumerKey: parts[2],
      };
    }
    return null;
  };

  const buildCredentials = (parts: CredentialsParts): string => {
    if (parts.applicationKey && parts.applicationSecret && parts.consumerKey) {
      return `${parts.applicationKey}:${parts.applicationSecret}:${parts.consumerKey}`;
    }
    return "";
  };

  const handlePartChange = (
    field: keyof CredentialsParts,
    newValue: string,
  ) => {
    const updatedParts = { ...credentialsParts, [field]: newValue };
    setCredentialsParts(updatedParts);

    const newCredentials = buildCredentials(updatedParts);
    onChange(newCredentials);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400">
        OVH Credentials Format: APPLICATION_KEY:APPLICATION_SECRET:CONSUMER_KEY
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Application Key *
          </label>
          <input
            type="text"
            value={credentialsParts.applicationKey}
            onChange={(e) => handlePartChange("applicationKey", e.target.value)}
            className={`text-sm font-mono ${className}`}
            placeholder="your_application_key"
            disabled={disabled}
            required={required}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Application Secret *
          </label>
          <input
            type="text"
            value={credentialsParts.applicationSecret}
            onChange={(e) =>
              handlePartChange("applicationSecret", e.target.value)
            }
            className={`text-sm font-mono ${className}`}
            placeholder="your_application_secret"
            disabled={disabled}
            required={required}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Consumer Key *
          </label>
          <input
            type="text"
            value={credentialsParts.consumerKey}
            onChange={(e) => handlePartChange("consumerKey", e.target.value)}
            className={`text-sm font-mono ${className}`}
            placeholder="your_consumer_key"
            disabled={disabled}
            required={required}
          />
        </div>
      </div>
    </div>
  );
}
