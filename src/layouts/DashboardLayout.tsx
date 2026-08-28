import {
  ArrowPathIcon,
  ArrowRightStartOnRectangleIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  CreditCardIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  GiftIcon,
  GlobeAltIcon,
  GlobeEuropeAfricaIcon,
  KeyIcon,
  ListBulletIcon,
  MoonIcon,
  RocketLaunchIcon,
  ScaleIcon,
  ServerIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SignalIcon,
  Squares2X2Icon,
  SunIcon,
  TagIcon,
  UsersIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialogContainer } from "../components/ConfirmDialogContainer";
import { ServerSelector } from "../components/ServerSelector";
import { TasksWidget } from "../components/TasksWidget";
import { ToastContainer } from "../components/Toast";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import { LoginState } from "../lib/login";

type NavAccent = "blue" | "teal" | "violet" | "emerald" | "amber";

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  requiredPermissions: string[];
}

interface NavSection {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  /** Visual accent. The network fabric uses "teal" as its signature. */
  accent?: NavAccent;
}

// Accent tokens. Blue is the default product accent; teal is reserved for the
// network fabric (routers, tunnels, DNS, IP space) so those screens
// read as one distinct system rather than blending into the rest of the admin.
// Violet is the marketplace, amber managed apps, emerald the VPN product.
const ACCENTS: Record<
  NavAccent,
  { rail: string; node: string; activeNode: string; activeLink: string; sectionIcon: string }
> = {
  blue: {
    rail: "border-slate-700/70",
    node: "bg-slate-600 ring-slate-800",
    activeNode: "bg-blue-400 ring-blue-400/30",
    activeLink: "nav-active-blue bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/30",
    sectionIcon: "text-slate-500",
  },
  teal: {
    rail: "border-teal-400/25",
    node: "bg-teal-500/40 ring-slate-800",
    activeNode: "bg-teal-300 ring-teal-400/40",
    activeLink: "nav-active-teal bg-teal-500/10 text-teal-200 ring-1 ring-inset ring-teal-400/30",
    sectionIcon: "text-teal-400",
  },
  violet: {
    rail: "border-violet-400/25",
    node: "bg-violet-500/40 ring-slate-800",
    activeNode: "bg-violet-300 ring-violet-400/40",
    activeLink: "nav-active-violet bg-violet-500/10 text-violet-200 ring-1 ring-inset ring-violet-400/30",
    sectionIcon: "text-violet-400",
  },
  emerald: {
    rail: "border-emerald-400/25",
    node: "bg-emerald-500/40 ring-slate-800",
    activeNode: "bg-emerald-300 ring-emerald-400/40",
    activeLink: "nav-active-emerald bg-emerald-500/10 text-emerald-200 ring-1 ring-inset ring-emerald-400/30",
    sectionIcon: "text-emerald-400",
  },
  amber: {
    rail: "border-amber-400/25",
    node: "bg-amber-500/40 ring-slate-800",
    activeNode: "bg-amber-300 ring-amber-400/40",
    activeLink: "nav-active-amber bg-amber-500/10 text-amber-200 ring-1 ring-inset ring-amber-400/30",
    sectionIcon: "text-amber-400",
  },
};

// Organised by operator domain: the machines and what they are built from
// (Compute), managed apps (Apps), the network fabric (Network), the VPN product
// (VPN), people (Customers), the selling entities and what they charge
// (Business), and consolidated reporting (Reports).
//
// Apps and VPN are products sold on top of the fabric rather than parts of it,
// so each carries its own accent: a deployment is not a VM template, and a VPN
// plan is not a router.
const navigation: NavSection[] = [
  {
    label: "Compute",
    icon: CpuChipIcon,
    items: [
      { name: "Virtual Machines", to: "/vms", icon: ServerIcon, requiredPermissions: ["virtual_machines::view"] },
      // The ranges VMs are addressed from, and what currently holds those
      // addresses. Both are about the guests rather than about the fabric that
      // carries them, so they read with the machines.
      { name: "IP Ranges", to: "/ip-ranges", icon: ListBulletIcon, requiredPermissions: ["ip_range::view"] },
      {
        name: "IP Assignments",
        to: "/vm-ip-assignments",
        icon: GlobeAltIcon,
        requiredPermissions: ["ip_range::view"],
      },
      { name: "Hosts", to: "/hosts", icon: ComputerDesktopIcon, requiredPermissions: ["hosts::view"] },
      {
        name: "Templates",
        to: "/vm-templates",
        icon: DocumentDuplicateIcon,
        requiredPermissions: ["vm_template::view"],
      },
      { name: "OS Images", to: "/os-images", icon: CommandLineIcon, requiredPermissions: ["vm_os_image::view"] },
      {
        name: "Custom Pricing",
        to: "/custom-pricing",
        icon: CurrencyDollarIcon,
        requiredPermissions: ["vm_custom_pricing::view"],
      },
    ],
  },
  {
    label: "Apps",
    icon: CubeIcon,
    accent: "amber",
    items: [
      { name: "Catalogue", to: "/apps", icon: CubeIcon, requiredPermissions: ["app::view"] },
      { name: "Clusters", to: "/app-clusters", icon: Squares2X2Icon, requiredPermissions: ["app::view"] },
      {
        name: "Deployments",
        to: "/app-deployments",
        icon: RocketLaunchIcon,
        requiredPermissions: ["app_deployment::view"],
      },
    ],
  },
  {
    label: "Network",
    icon: WifiIcon,
    accent: "teal",
    items: [
      {
        name: "Access Policies",
        to: "/access-policies",
        icon: KeyIcon,
        requiredPermissions: ["access_policy::view"],
      },
      { name: "Routers", to: "/routers", icon: ServerIcon, requiredPermissions: ["router::view"] },
      { name: "Tunnel Pools", to: "/tunnel-pools", icon: GlobeAltIcon, requiredPermissions: ["router::view"] },
      { name: "DNS Servers", to: "/dns-servers", icon: ServerStackIcon, requiredPermissions: ["dns_server::view"] },
      { name: "IP Space", to: "/ip-spaces", icon: GlobeAltIcon, requiredPermissions: ["ip_space::view"] },
    ],
  },
  {
    label: "VPN",
    icon: ShieldCheckIcon,
    accent: "emerald",
    items: [
      { name: "Services", to: "/vpn-services", icon: ShieldCheckIcon, requiredPermissions: ["vpn_service::view"] },
      {
        name: "Subscriptions",
        to: "/vpn-subscriptions",
        icon: DevicePhoneMobileIcon,
        requiredPermissions: ["vpn_subscription::view"],
      },
    ],
  },
  {
    label: "Marketplace",
    icon: CpuChipIcon,
    accent: "violet",
    items: [
      {
        name: "Nodes",
        to: "/marketplace/nodes",
        icon: ServerStackIcon,
        requiredPermissions: ["marketplace_node::view"],
      },
      {
        name: "Operators",
        to: "/marketplace/operators",
        icon: UsersIcon,
        requiredPermissions: ["marketplace_operator::view"],
      },
    ],
  },
  {
    label: "Customers",
    icon: UsersIcon,
    items: [
      { name: "Users", to: "/users", icon: ListBulletIcon, requiredPermissions: ["users::view"] },
      { name: "Roles", to: "/roles", icon: KeyIcon, requiredPermissions: ["roles::view"] },
      {
        name: "Support Chats",
        to: "/agent/conversations",
        icon: ChatBubbleLeftRightIcon,
        requiredPermissions: ["support_agent::view"],
      },
      {
        name: "Bulk Message",
        to: "/bulk-message",
        icon: ChatBubbleLeftRightIcon,
        requiredPermissions: ["users::update"],
      },
    ],
  },
  {
    label: "Business",
    icon: BanknotesIcon,
    items: [
      {
        name: "Subscriptions",
        to: "/subscriptions",
        icon: DocumentTextIcon,
        requiredPermissions: ["subscriptions::view"],
      },
      { name: "Companies", to: "/companies", icon: BuildingOfficeIcon, requiredPermissions: ["company::view"] },
      // A region belongs to the company that bills for it and carries the country
      // that decides the VAT, so it sits with the selling entity rather than with
      // the machines that happen to run there.
      { name: "Regions", to: "/regions", icon: GlobeAltIcon, requiredPermissions: ["host_region::view"] },
      {
        name: "Payment Methods",
        to: "/payment-methods",
        icon: CreditCardIcon,
        requiredPermissions: ["payment_method_config::view"],
      },
      {
        name: "Referral Program",
        to: "/referral-program",
        icon: GiftIcon,
        requiredPermissions: ["referral::view", "virtual_machines::view"],
      },
      {
        name: "Discounts",
        to: "/discounts",
        icon: TagIcon,
        requiredPermissions: ["discount::view"],
      },
      {
        name: "Resource Costs",
        to: "/resource-costs",
        icon: BanknotesIcon,
        requiredPermissions: ["resource_cost::view"],
      },
    ],
  },
  {
    label: "Reports",
    icon: ChartBarIcon,
    items: [
      { name: "Sales", to: "/sales-report", icon: ChartBarIcon, requiredPermissions: ["analytics::view"] },
      { name: "Referral Usage", to: "/referrals-report", icon: ChartBarIcon, requiredPermissions: ["analytics::view"] },
      { name: "Profit & Loss", to: "/profit-loss", icon: ScaleIcon, requiredPermissions: ["analytics::view"] },
      {
        name: "Renewals & Churn",
        to: "/renewals-report",
        icon: ArrowPathIcon,
        requiredPermissions: ["analytics::view"],
      },
      { name: "OSS VAT", to: "/oss-report", icon: GlobeEuropeAfricaIcon, requiredPermissions: ["analytics::view"] },
      { name: "Fleet Traffic", to: "/traffic-report", icon: SignalIcon, requiredPermissions: ["analytics::view"] },
    ],
  },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyPermission } = useUserRoles();
  const { theme, toggleTheme } = useTheme();
  const { toasts, dismiss } = useToast();

  const handleLogout = () => {
    LoginState.logout();
    navigate("/login");
  };

  // Keep only the sections (and items within them) the user can see.
  const visibleSections = React.useMemo(
    () =>
      navigation
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => hasAnyPermission(item.requiredPermissions)),
        }))
        .filter((section) => section.items.length > 0),
    [hasAnyPermission],
  );

  return (
    <div className="h-screen bg-slate-900 text-white flex">
      {/* Sidebar */}
      <div
        className={`w-64 bg-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed md:relative z-50 md:z-auto h-screen flex flex-col`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold text-blue-500">LNVPS Admin</span>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 min-h-0 mt-2 px-2 pb-4 overflow-y-auto">
          {visibleSections.map((section) => {
            const accent = ACCENTS[section.accent ?? "blue"];
            return (
              <div key={section.label} className="mt-4 first:mt-1">
                {/* Section eyebrow */}
                <div className="flex items-center gap-2 px-3 pb-1.5 select-none">
                  <section.icon className={`h-3.5 w-3.5 shrink-0 ${accent.sectionIcon}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {section.label}
                  </span>
                </div>

                {/* Items on an accent rail */}
                <div className="relative ml-4 pl-3">
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-0 top-1 bottom-1 border-l ${accent.rail}`}
                  />
                  {section.items.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.name}
                        to={item.to}
                        className={`group relative mt-0.5 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active ? accent.activeLink : "text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute -left-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ring-2 transition-colors ${
                            active ? accent.activeNode : `${accent.node} group-hover:bg-slate-400`
                          }`}
                        />
                        <item.icon className="mr-2.5 h-4 w-4 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-2 mt-auto shrink-0 space-y-2 border-t border-slate-700/60">
          <TasksWidget />
          <ServerSelector />
          <button
            onClick={toggleTheme}
            className="flex w-full items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunIcon className="mr-3 h-5 w-5" /> : <MoonIcon className="mr-3 h-5 w-5" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <ArrowRightStartOnRectangleIcon className="mr-3 h-5 w-5" />
            Logout
          </button>
          <div className="px-4 pb-1 text-xs text-slate-500">
            <a
              href="/SKILL.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300"
              title="Agent skill for the LNVPS Admin API"
            >
              SKILL.md
            </a>
            {" | "}
            <a
              href="/REFERENCE.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300"
              title="Admin API type reference"
            >
              REFERENCE.md
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center justify-between bg-slate-800 p-4">
          <span className="text-xl font-bold text-white">LNVPS Admin</span>
          <button onClick={() => setSidebarOpen(true)} className="text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <main className="flex-1 p-4 overflow-y-auto h-full">
          <Outlet />
        </main>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Confirm / prompt dialogs */}
      <ConfirmDialogContainer />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
