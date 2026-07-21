import { BuildingOfficeIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminCompanyInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";

export function CompaniesPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<AdminCompanyInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (company: AdminCompanyInfo) => {
    setSelectedCompany(company);
    setShowEditModal(true);
  };

  const handleDelete = async (company: AdminCompanyInfo) => {
    if (company.region_count > 0) {
      toastService.error(
        "Cannot delete company",
        `"${company.name}" has ${company.region_count} region(s) assigned to it. Please reassign or remove all regions before deleting.`,
      );
      return;
    }

    if (
      await confirmDialog({
        title: "Delete Company",
        message: `Are you sure you want to delete company "${company.name}"?`,
      })
    ) {
      try {
        await adminApi.deleteCompany(company.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete company:", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Company</th>
      <th>Location</th>
      <th>Contact</th>
      <th>Regions &amp; Created</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (company: AdminCompanyInfo, index: number) => {
    const cityLine = [company.city, company.state, company.postcode].filter(Boolean).join(", ");
    return (
      <tr key={company.id || index}>
        <td className="whitespace-nowrap align-top text-white">{company.id}</td>
        {/* Company: name / base currency / tax id */}
        <td className="align-top">
          <div className="min-w-0 max-w-[18rem]">
            <div className="truncate font-medium text-white" title={company.name}>
              {company.name}
            </div>
            <div className="mt-0.5 truncate font-mono text-xs text-blue-400">{company.base_currency}</div>
            <div className="truncate text-xs text-slate-400">Referral rate: {company.referral_rate}%</div>
            {company.max_prepay_days > 0 && (
              <div className="truncate text-xs text-slate-400">Max prepay: {company.max_prepay_days} days</div>
            )}
            {company.tax_id && (
              <div className="truncate text-xs text-slate-400" title={company.tax_id}>
                Tax ID: {company.tax_id}
              </div>
            )}
          </div>
        </td>
        {/* Location: address / city·state·postcode / country */}
        <td className="align-top text-gray-300">
          <div className="min-w-0 max-w-[18rem] text-sm">
            {company.address_1 && (
              <div className="truncate" title={company.address_1}>
                {company.address_1}
              </div>
            )}
            {company.address_2 && (
              <div className="truncate text-xs text-slate-400" title={company.address_2}>
                {company.address_2}
              </div>
            )}
            {cityLine && (
              <div className="mt-0.5 truncate text-xs text-slate-400" title={cityLine}>
                {cityLine}
              </div>
            )}
            {company.country_code && <div className="mt-0.5 text-xs text-slate-500">{company.country_code}</div>}
          </div>
        </td>
        {/* Contact: email / phone */}
        <td className="align-top text-gray-300">
          <div className="min-w-0 max-w-[16rem] text-sm">
            {company.email && (
              <div className="truncate" title={company.email}>
                {company.email}
              </div>
            )}
            {company.phone && (
              <div className="mt-0.5 truncate text-xs text-slate-400" title={company.phone}>
                {company.phone}
              </div>
            )}
          </div>
        </td>
        {/* Regions + created */}
        <td className="align-top text-gray-300">
          <div className="font-medium">{company.region_count} regions</div>
          <div className="mt-0.5 text-xs text-slate-400">{formatDate(company.created)}</div>
        </td>
        <td className="text-right align-top">
          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="secondary" onClick={() => handleEdit(company)} className="p-1">
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleDelete(company)}
              className="text-red-400 hover:text-red-300 p-1"
              disabled={company.region_count > 0}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No companies found</p>
    </div>
  );

  const calculateStats = (companies: AdminCompanyInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      totalRegions: companies.reduce((sum, company) => sum + company.region_count, 0),
      withRegions: companies.filter((company) => company.region_count > 0).length,
    };

    return (
      <StatsHeader
        title="Companies"
        stats={[
          { label: "Total", value: stats.total },
          { label: "With Regions", value: stats.withRegions, tone: "accent" },
          { label: "Total Regions", value: stats.totalRegions, tone: "success" },
        ]}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getCompanies(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view companies"
        loadingMessage="Loading companies..."
        dependencies={[refreshTrigger]}
        minWidth="900px"
      />

      {/* Create Company Modal */}
      <CreateCompanyModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={refreshData} />

      {/* Edit Company Modal */}
      {selectedCompany && (
        <EditCompanyModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCompany(null);
          }}
          company={selectedCompany}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Create Company Modal Component
function CreateCompanyModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    country_code: "",
    tax_id: "",
    base_currency: "USD",
    postcode: "",
    phone: "",
    email: "",
    referral_rate: "0",
    max_prepay_days: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        address_1: formData.address_1 || null,
        address_2: formData.address_2 || null,
        city: formData.city || null,
        state: formData.state || null,
        country_code: formData.country_code || null,
        tax_id: formData.tax_id || null,
        base_currency: formData.base_currency,
        postcode: formData.postcode || null,
        phone: formData.phone || null,
        email: formData.email || null,
        referral_rate: parseFloat(formData.referral_rate) || 0,
        max_prepay_days: parseInt(formData.max_prepay_days, 10) || 0,
      };

      await adminApi.createCompany(data);
      onSuccess();
      onClose();
      setFormData({
        name: "",
        address_1: "",
        address_2: "",
        city: "",
        state: "",
        country_code: "",
        tax_id: "",
        base_currency: "USD",
        postcode: "",
        phone: "",
        email: "",
        referral_rate: "0",
        max_prepay_days: "0",
      });
    } catch (error) {
      console.error("Failed to create company:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Company">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">Company Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Base Currency *</label>
          <select
            value={formData.base_currency}
            onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
            className=""
            required
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="CHF">CHF - Swiss Franc</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="JPY">JPY - Japanese Yen</option>
            <option value="BTC">BTC - Bitcoin</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Address Line 1</label>
            <input
              type="text"
              value={formData.address_1}
              onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Address Line 2</label>
            <input
              type="text"
              value={formData.address_2}
              onChange={(e) => setFormData({ ...formData, address_2: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">State/Province</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Postal Code</label>
            <input
              type="text"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Country Code</label>
            <input
              type="text"
              value={formData.country_code}
              onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
              className=""
              placeholder="e.g., US, CA, GB"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Tax ID</label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Referral Rate (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={formData.referral_rate}
            onChange={(e) => setFormData({ ...formData, referral_rate: e.target.value })}
            className=""
          />
          <p className="mt-1 text-xs text-slate-400">
            Default commission applied to a referred VM's first payment when the referrer has no override.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Max Prepay Days</label>
          <input
            type="number"
            step="1"
            min="0"
            value={formData.max_prepay_days}
            onChange={(e) => setFormData({ ...formData, max_prepay_days: e.target.value })}
            className=""
          />
          <p className="mt-1 text-xs text-slate-400">
            Maximum window renewals may prepay into the future. 0 inherits the global default.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Company Modal Component
function EditCompanyModal({
  isOpen,
  onClose,
  company,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: AdminCompanyInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name,
    address_1: company.address_1 || "",
    address_2: company.address_2 || "",
    city: company.city || "",
    state: company.state || "",
    country_code: company.country_code || "",
    tax_id: company.tax_id || "",
    base_currency: company.base_currency || "USD",
    postcode: company.postcode || "",
    phone: company.phone || "",
    email: company.email || "",
    referral_rate: String(company.referral_rate ?? 0),
    max_prepay_days: String(company.max_prepay_days ?? 0),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        name: formData.name,
        address_1: formData.address_1 || null,
        address_2: formData.address_2 || null,
        city: formData.city || null,
        state: formData.state || null,
        country_code: formData.country_code || null,
        tax_id: formData.tax_id || null,
        base_currency: formData.base_currency,
        postcode: formData.postcode || null,
        phone: formData.phone || null,
        email: formData.email || null,
        referral_rate: parseFloat(formData.referral_rate) || 0,
        max_prepay_days: parseInt(formData.max_prepay_days, 10) || 0,
      };

      await adminApi.updateCompany(company.id, updates);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update company:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Company">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">Company Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Base Currency *</label>
          <select
            value={formData.base_currency}
            onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
            className=""
            required
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="CHF">CHF - Swiss Franc</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="JPY">JPY - Japanese Yen</option>
            <option value="BTC">BTC - Bitcoin</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Address Line 1</label>
            <input
              type="text"
              value={formData.address_1}
              onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Address Line 2</label>
            <input
              type="text"
              value={formData.address_2}
              onChange={(e) => setFormData({ ...formData, address_2: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">State/Province</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Postal Code</label>
            <input
              type="text"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Country Code</label>
            <input
              type="text"
              value={formData.country_code}
              onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
              className=""
              placeholder="e.g., US, CA, GB"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Tax ID</label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className=""
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className=""
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Referral Rate (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={formData.referral_rate}
            onChange={(e) => setFormData({ ...formData, referral_rate: e.target.value })}
            className=""
          />
          <p className="mt-1 text-xs text-slate-400">
            Default commission applied to a referred VM's first payment when the referrer has no override.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Max Prepay Days</label>
          <input
            type="number"
            step="1"
            min="0"
            value={formData.max_prepay_days}
            onChange={(e) => setFormData({ ...formData, max_prepay_days: e.target.value })}
            className=""
          />
          <p className="mt-1 text-xs text-slate-400">
            Maximum window renewals may prepay into the future. 0 inherits the global default.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
