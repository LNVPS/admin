import React, { useState } from "react";
import { Card, DetailList, DetailRow } from "../components/Card";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import {
  Cog6ToothIcon,
  ServerIcon,
  GlobeAltIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface SystemSettings {
  apiUrl: string;
  defaultRegion: string;
  maxVMsPerUser: number;
  paymentProvider: string;
  nostrRelays: string[];
  backupEnabled: boolean;
  backupRetention: number;
  maintenanceMode: boolean;
}

export function SystemPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    apiUrl: "https://api.lnvps.com",
    defaultRegion: "us-east",
    maxVMsPerUser: 5,
    paymentProvider: "strike",
    nostrRelays: [
      "wss://relay.damus.io",
      "wss://nostr.zebedee.cloud",
      "wss://relay.snort.social",
    ],
    backupEnabled: true,
    backupRetention: 30,
    maintenanceMode: false,
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<keyof SystemSettings | null>(
    null,
  );
  const [editValue, setEditValue] = useState<any>(null);

  const handleEdit = (key: keyof SystemSettings) => {
    setEditingKey(key);
    setEditValue(settings[key]);
    setIsEditModalOpen(true);
  };

  const handleSave = () => {
    if (editingKey) {
      setSettings((prev) => ({
        ...prev,
        [editingKey]: editValue,
      }));
    }
    setIsEditModalOpen(false);
  };

  const sections = [
    {
      title: "General Settings",
      icon: Cog6ToothIcon,
      settings: [
        { key: "apiUrl", label: "API URL" },
        { key: "defaultRegion", label: "Default Region" },
        { key: "maxVMsPerUser", label: "Max VMs per User" },
      ],
    },
    {
      title: "Payment Settings",
      icon: KeyIcon,
      settings: [{ key: "paymentProvider", label: "Payment Provider" }],
    },
    {
      title: "Nostr Settings",
      icon: GlobeAltIcon,
      settings: [{ key: "nostrRelays", label: "Nostr Relays" }],
    },
    {
      title: "Backup Settings",
      icon: ServerIcon,
      settings: [
        { key: "backupEnabled", label: "Backup Enabled" },
        { key: "backupRetention", label: "Backup Retention (days)" },
      ],
    },
    {
      title: "Maintenance",
      icon: ShieldCheckIcon,
      settings: [{ key: "maintenanceMode", label: "Maintenance Mode" }],
    },
  ];

  const renderValue = (key: keyof SystemSettings, value: any) => {
    if (typeof value === "boolean") {
      return value ? (
        <span className="text-green-500">Enabled</span>
      ) : (
        <span className="text-red-500">Disabled</span>
      );
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value.toString();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">System Settings</h1>

      {sections.map((section) => (
        <Card
          key={section.title}
          title={section.title}
          icon={<section.icon className="h-5 w-5" />}
        >
          <DetailList>
            {section.settings.map(({ key, label }) => (
              <DetailRow
                key={key}
                label={label}
                value={
                  <div className="flex items-center justify-between">
                    <span>
                      {renderValue(
                        key as keyof SystemSettings,
                        settings[key as keyof SystemSettings],
                      )}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(key as keyof SystemSettings)}
                    >
                      Edit
                    </Button>
                  </div>
                }
              />
            ))}
          </DetailList>
        </Card>
      ))}

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${editingKey ? editingKey.replace(/([A-Z])/g, " $1").toLowerCase() : ""}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </>
        }
      >
        {editingKey && (
          <div className="space-y-4">
            {typeof settings[editingKey] === "boolean" ? (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editValue}
                  onChange={(e) => setEditValue(e.target.checked)}
                  className="h-4 w-4 rounded border-dark-600 bg-dark-700 text-primary-600 focus:ring-primary-500"
                />
                <label className="text-sm text-dark-300">Enabled</label>
              </div>
            ) : Array.isArray(settings[editingKey]) ? (
              <textarea
                value={editValue.join("\n")}
                onChange={(e) => setEditValue(e.target.value.split("\n"))}
                rows={4}
                className="w-full rounded-md border-dark-600 bg-dark-700 text-white"
              />
            ) : (
              <input
                type={
                  typeof settings[editingKey] === "number" ? "number" : "text"
                }
                value={editValue}
                onChange={(e) =>
                  setEditValue(
                    typeof settings[editingKey] === "number"
                      ? parseInt(e.target.value)
                      : e.target.value,
                  )
                }
                className="w-full rounded-md border-dark-600 bg-dark-700 text-white"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
