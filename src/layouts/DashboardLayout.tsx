import {
  ArrowRightStartOnRectangleIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  KeyIcon,
  ListBulletIcon,
  MoonIcon,
  ServerIcon,
  ServerStackIcon,
  SunIcon,
  UserGroupIcon,
  UsersIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ServerSelector } from "../components/ServerSelector";
import { TasksWidget } from "../components/TasksWidget";
import { useTheme } from "../hooks/useTheme";
import { useUserRoles } from "../hooks/useUserRoles";
import { LoginState } from "../lib/login";

type NavAccent = "blue" | "teal";

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
// network fabric (IP ranges, assignments, routers, IP space) so those screens
// read as one distinct system rather than blending into the rest of the admin.
const ACCENTS: Record<
  NavAccent,
  { rail: string; node: string; activeNode: string; activeLink: string; sectionIcon: string }
> = {
  blue: {
    rail: "border-slate-700/70",
    node: "bg-slate-600 ring-slate-800",
    activeNode: "bg-blue-400 ring-blue-400/30",
    activeLink: "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/30",
    sectionIcon: "text-slate-500",
  },
  teal: {
    rail: "border-teal-400/25",
    node: "bg-teal-500/40 ring-slate-800",
    activeNode: "bg-teal-300 ring-teal-400/40",
    activeLink: "bg-teal-500/10 text-teal-200 ring-1 ring-inset ring-teal-400/30",
    sectionIcon: "text-teal-400",
  },
};

// Organised by operator domain: running infra (Compute), the priced catalogue
// (Catalog), the network fabric (Network), people (Customers), commerce
// (Business), and consolidated reporting (Reports).
const navigation: NavSection[] = [
  {
    label: "Compute",
    icon: CpuChipIcon,
    items: [
      { name: "Virtual Machines", to: "/vms", icon: ServerIcon, requiredPermissions: ["virtual_machines::view"] },
      { name: "Hosts", to: "/hosts", icon: ComputerDesktopIcon, requiredPermissions: ["hosts::view"] },
      { name: "Regions", to: "/regions", icon: GlobeAltIcon, requiredPermissions: ["host_region::view"] },
    ],
  },
  {
    label: "Catalog",
    icon: DocumentDuplicateIcon,
    items: [
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
    label: "Network",
    icon: WifiIcon,
    accent: "teal",
    items: [
      { name: "IP Ranges", to: "/ip-ranges", icon: ListBulletIcon, requiredPermissions: ["ip_range::view"] },
      {
        name: "IP Assignments",
        to: "/vm-ip-assignments",
        icon: GlobeAltIcon,
        requiredPermissions: ["ip_range::view"],
      },
      {
        name: "Access Policies",
        to: "/access-policies",
        icon: KeyIcon,
        requiredPermissions: ["access_policy::view"],
      },
      { name: "Routers", to: "/routers", icon: ServerIcon, requiredPermissions: ["router::view"] },
      { name: "DNS Servers", to: "/dns-servers", icon: ServerStackIcon, requiredPermissions: ["dns_server::view"] },
      { name: "IP Space", to: "/ip-spaces", icon: GlobeAltIcon, requiredPermissions: ["ip_space::view"] },
    ],
  },
  {
    label: "Customers",
    icon: UsersIcon,
    items: [
      { name: "Users", to: "/users", icon: ListBulletIcon, requiredPermissions: ["users::view"] },
      { name: "Roles", to: "/roles", icon: KeyIcon, requiredPermissions: ["roles::view"] },
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
      {
        name: "Payment Methods",
        to: "/payment-methods",
        icon: CreditCardIcon,
        requiredPermissions: ["payment_method_config::view"],
      },
      { name: "Referrals", to: "/referrals", icon: UserGroupIcon, requiredPermissions: ["virtual_machines::view"] },
    ],
  },
  {
    label: "Reports",
    icon: ChartBarIcon,
    items: [
      { name: "Sales", to: "/sales-report", icon: ChartBarIcon, requiredPermissions: ["analytics::view"] },
      { name: "Referrals", to: "/referrals-report", icon: ChartBarIcon, requiredPermissions: ["analytics::view"] },
    ],
  },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyPermission } = useUserRoles();
  const { theme, toggleTheme } = useTheme();

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

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
