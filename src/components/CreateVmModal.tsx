import { useState, useEffect } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  AdminUserInfo,
  AdminVmTemplateInfo,
  AdminVmOsImageInfo,
  AdminSshKeyInfo,
} from "../lib/api";
import {
  UserIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface CreateVmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (jobId: string) => void;
  preselectedUser?: AdminUserInfo;
}

interface FormData {
  user_id: string;
  template_id: string;
  image_id: string;
  ssh_key_id: string;
  ref_code: string;
  reason: string;
}

export function CreateVmModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedUser,
}: CreateVmModalProps) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Data arrays
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [templates, setTemplates] = useState<AdminVmTemplateInfo[]>([]);
  const [images, setImages] = useState<AdminVmOsImageInfo[]>([]);
  const [sshKeys, setSshKeys] = useState<AdminSshKeyInfo[]>([]);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    user_id: preselectedUser?.id.toString() || "",
    template_id: "",
    image_id: "",
    ssh_key_id: "",
    ref_code: "",
    reason: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset form
      setFormData({
        user_id: preselectedUser?.id.toString() || "",
        template_id: "",
        image_id: "",
        ssh_key_id: "",
        ref_code: "",
        reason: "",
      });
      setError(null);
    }
  }, [isOpen, preselectedUser]);

  useEffect(() => {
    // Load SSH keys when user changes
    if (formData.user_id) {
      loadSshKeys(parseInt(formData.user_id));
    } else {
      setSshKeys([]);
      setFormData((prev) => ({ ...prev, ssh_key_id: "" }));
    }
  }, [formData.user_id]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Load users, templates, and images in parallel
      const [usersResponse, templatesResponse, imagesResponse] =
        await Promise.all([
          adminApi.getUsers({ limit: 1000 }), // Get more users for selection
          adminApi.getVmTemplates({ limit: 1000 }),
          adminApi.getVmOsImages({ limit: 1000 }),
        ]);

      setUsers(usersResponse.data);
      setTemplates(templatesResponse.data.filter((t) => t.enabled));
      setImages(imagesResponse.data.filter((i) => i.enabled));
    } catch (err) {
      console.error("Failed to load VM creation data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load required data",
      );
    } finally {
      setLoadingData(false);
    }
  };

  const loadSshKeys = async (userId: number) => {
    try {
      const keys = await adminApi.getUserSshKeys(userId);
      setSshKeys(keys);
    } catch (err) {
      console.error("Failed to load SSH keys:", err);
      setSshKeys([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.user_id ||
      !formData.template_id ||
      !formData.image_id ||
      !formData.ssh_key_id
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const vmData = {
        user_id: parseInt(formData.user_id),
        template_id: parseInt(formData.template_id),
        image_id: parseInt(formData.image_id),
        ssh_key_id: parseInt(formData.ssh_key_id),
        ...(formData.ref_code.trim() && { ref_code: formData.ref_code.trim() }),
        ...(formData.reason.trim() && { reason: formData.reason.trim() }),
      };

      const result = await adminApi.createVM(vmData);
      onSuccess(result.job_id);
      onClose();
    } catch (err) {
      console.error("Failed to create VM:", err);
      setError(err instanceof Error ? err.message : "Failed to create VM");
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.id.toString() === formData.user_id);
  const selectedTemplate = templates.find(
    (t) => t.id.toString() === formData.template_id,
  );
  const selectedImage = images.find(
    (i) => i.id.toString() === formData.image_id,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create VM for User"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={loading}
            disabled={loadingData}
          >
            Create VM
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Warning */}
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-medium">Admin VM Creation</h4>
              <p className="text-blue-300/80 text-sm mt-1">
                This will create a VM for the specified user. The VM creation
                process is asynchronous and you will receive real-time updates
                via notifications.
              </p>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading VM creation data...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <UserIcon className="h-4 w-4 inline mr-2" />
                Target User *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, user_id: e.target.value }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                required
                disabled={!!preselectedUser}
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email || user.pubkey.slice(0, 16)}... (ID: {user.id})
                  </option>
                ))}
              </select>
              {selectedUser && (
                <div className="text-sm text-gray-400 mt-1">
                  Pubkey: {selectedUser.pubkey.slice(0, 32)}...
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <ComputerDesktopIcon className="h-4 w-4 inline mr-2" />
                VM Template *
              </label>
              <select
                value={formData.template_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    template_id: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.cpu}C •{" "}
                    {Math.round(template.memory / (1024 * 1024 * 1024))}GB •{" "}
                    {Math.round(template.disk_size / (1024 * 1024 * 1024))}GB)
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <div className="text-sm text-gray-400 mt-1">
                  Region: {selectedTemplate.region_name || "Unknown"}
                </div>
              )}
            </div>

            {/* OS Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <CommandLineIcon className="h-4 w-4 inline mr-2" />
                OS Image *
              </label>
              <select
                value={formData.image_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, image_id: e.target.value }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select an OS image...</option>
                {images.map((image) => (
                  <option key={image.id} value={image.id}>
                    {image.distribution} {image.flavour} {image.version}
                  </option>
                ))}
              </select>
              {selectedImage && (
                <div className="text-sm text-gray-400 mt-1">
                  Default user: {selectedImage.default_username || "root"}
                </div>
              )}
            </div>

            {/* SSH Key Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <KeyIcon className="h-4 w-4 inline mr-2" />
                SSH Key *
              </label>
              {formData.user_id ? (
                <select
                  value={formData.ssh_key_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ssh_key_id: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select an SSH key...</option>
                  {sshKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.fingerprint})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-400">
                  Select a user first to load their SSH keys
                </div>
              )}
              {sshKeys.length === 0 && formData.user_id && (
                <div className="text-sm text-yellow-400 mt-1">
                  No SSH keys found for this user
                </div>
              )}
            </div>

            {/* Referral Code (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Referral Code (Optional)
              </label>
              <input
                type="text"
                value={formData.ref_code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, ref_code: e.target.value }))
                }
                placeholder="Enter referral code if applicable"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Reason (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Reason (Optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Enter reason for creating this VM (for audit trail)"
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
}
