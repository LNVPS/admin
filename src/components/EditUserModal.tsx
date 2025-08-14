import { useState, useEffect } from "react";
import * as React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useAdminApi } from "../hooks/useAdminApi";
import { AdminUserInfo, getAllCountries } from "../lib/api";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserInfo;
  onSuccess: () => void;
}

interface EditUserForm {
  email: string;
  contact_nip17: boolean;
  contact_email: boolean;
  country_code: string;
  billing_name: string;
  billing_address_1: string;
  billing_address_2: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  billing_tax_id: string;
}

export function EditUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: EditUserModalProps) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EditUserForm>({
    email: "",
    contact_nip17: false,
    contact_email: false,
    country_code: "",
    billing_name: "",
    billing_address_1: "",
    billing_address_2: "",
    billing_city: "",
    billing_state: "",
    billing_postcode: "",
    billing_tax_id: "",
  });

  // Initialize form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        email: user.email || "",
        contact_nip17: user.contact_nip17,
        contact_email: user.contact_email,
        country_code: user.country_code || "",
        billing_name: user.billing_name || "",
        billing_address_1: user.billing_address_1 || "",
        billing_address_2: user.billing_address_2 || "",
        billing_city: user.billing_city || "",
        billing_state: user.billing_state || "",
        billing_postcode: user.billing_postcode || "",
        billing_tax_id: user.billing_tax_id || "",
      });
    }
  }, [isOpen, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {
        email: formData.email || undefined,
        contact_nip17: formData.contact_nip17,
        contact_email: formData.contact_email,
        country_code: formData.country_code || undefined,
        billing_name: formData.billing_name || undefined,
        billing_address_1: formData.billing_address_1 || undefined,
        billing_address_2: formData.billing_address_2 || undefined,
        billing_city: formData.billing_city || undefined,
        billing_state: formData.billing_state || undefined,
        billing_postcode: formData.billing_postcode || undefined,
        billing_tax_id: formData.billing_tax_id || undefined,
      };

      await adminApi.updateUser(user.id, updates);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className=""
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Country
            </label>
            <select
              name="country_code"
              value={formData.country_code}
              onChange={handleInputChange}
              className=""
            >
              <option value="">Select a country...</option>
              {getAllCountries().map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contact_email"
              name="contact_email"
              checked={formData.contact_email}
              onChange={handleInputChange}
              className=""
            />
            <label htmlFor="contact_email" className="ml-2 text-xs text-white">
              Contact via Email
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contact_nip17"
              name="contact_nip17"
              checked={formData.contact_nip17}
              onChange={handleInputChange}
              className=""
            />
            <label htmlFor="contact_nip17" className="ml-2 text-xs text-white">
              Contact via Nostr (NIP-17)
            </label>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-white mb-2">
            Billing Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="billing_name"
                value={formData.billing_name}
                onChange={handleInputChange}
                className=""
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Tax ID
              </label>
              <input
                type="text"
                name="billing_tax_id"
                value={formData.billing_tax_id}
                onChange={handleInputChange}
                className=""
                placeholder="Tax ID"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                name="billing_address_1"
                value={formData.billing_address_1}
                onChange={handleInputChange}
                className=""
                placeholder="Address line 1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                name="billing_address_2"
                value={formData.billing_address_2}
                onChange={handleInputChange}
                className=""
                placeholder="Address line 2"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                City
              </label>
              <input
                type="text"
                name="billing_city"
                value={formData.billing_city}
                onChange={handleInputChange}
                className=""
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                State
              </label>
              <input
                type="text"
                name="billing_state"
                value={formData.billing_state}
                onChange={handleInputChange}
                className=""
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Postcode
              </label>
              <input
                type="text"
                name="billing_postcode"
                value={formData.billing_postcode}
                onChange={handleInputChange}
                className=""
                placeholder="Postcode"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
