import React, { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { LoginState } from "../lib/login";
import { useUserRoles } from "../hooks/useUserRoles";
import { ServerSelector } from "../components/ServerSelector";
import {
  UsersIcon,
  ServerIcon,
  KeyIcon,
  ChartBarIcon,
  ArrowRightStartOnRectangleIcon,
  ComputerDesktopIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ListBulletIcon,
  GlobeAltIcon,
  CommandLineIcon,
  DocumentDuplicateIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  WifiIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface SidebarItem {
  name: string;
  to?: string;
  icon: React.ElementType;
  requiredPermissions: string[];
  children?: SidebarItem[];
}

const navigation: SidebarItem[] = [
  {
    name: "Users",
    icon: UsersIcon,
    requiredPermissions: ["users::view"],
    children: [
      {
        name: "List",
        to: "/users",
        icon: ListBulletIcon,
        requiredPermissions: ["users::view"],
      },
      {
        name: "Roles",
        to: "/roles",
        icon: KeyIcon,
        requiredPermissions: ["roles::view"],
      },
    ],
  },
  {
    name: "Virtual Machines",
    icon: ServerIcon,
    requiredPermissions: ["virtual_machines::view"],
    children: [
      {
        name: "List",
        to: "/vms",
        icon: ListBulletIcon,
        requiredPermissions: ["virtual_machines::view"],
      },
      {
        name: "Hosts",
        to: "/hosts",
        icon: ComputerDesktopIcon,
        requiredPermissions: ["hosts::view"],
      },
      {
        name: "Regions",
        to: "/regions",
        icon: GlobeAltIcon,
        requiredPermissions: ["host_region::view"],
      },
      {
        name: "OS Images",
        to: "/os-images",
        icon: CommandLineIcon,
        requiredPermissions: ["vm_os_image::view"],
      },
      {
        name: "Templates",
        to: "/vm-templates",
        icon: DocumentDuplicateIcon,
        requiredPermissions: ["vm_template::view"],
      },
      {
        name: "Custom Pricing",
        to: "/custom-pricing",
        icon: CurrencyDollarIcon,
        requiredPermissions: ["vm_custom_pricing::view"],
      },
    ],
  },
  {
    name: "Networking",
    icon: WifiIcon,
    requiredPermissions: [
      "ip_range::view",
      "access_policy::view",
      "router::view",
    ],
    children: [
      {
        name: "IP Ranges",
        to: "/ip-ranges",
        icon: ListBulletIcon,
        requiredPermissions: ["ip_range::view"],
      },
      {
        name: "Access Policies",
        to: "/access-policies",
        icon: KeyIcon,
        requiredPermissions: ["access_policy::view"],
      },
      {
        name: "Routers",
        to: "/routers",
        icon: ServerIcon,
        requiredPermissions: ["router::view"],
      },
    ],
  },
  {
    name: "Companies",
    to: "/companies",
    icon: BuildingOfficeIcon,
    requiredPermissions: ["company::view"],
  },
  {
    name: "Analytics",
    icon: ChartBarIcon,
    requiredPermissions: ["analytics::view"],
    children: [
      {
        name: "Sales Report",
        to: "/sales-report",
        icon: ChartBarIcon,
        requiredPermissions: ["analytics::view"],
      },
      {
        name: "Referrals Report",
        to: "/referrals-report",
        icon: UserGroupIcon,
        requiredPermissions: ["analytics::view"],
      },
    ],
  },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyPermission } = useUserRoles();

  const handleLogout = () => {
    LoginState.logout();
    navigate("/login");
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const filterNavigationItems = (items: SidebarItem[]): SidebarItem[] => {
    return items
      .filter((item) => {
        if (!hasAnyPermission(item.requiredPermissions)) {
          return false;
        }
        if (item.children) {
          const visibleChildren = filterNavigationItems(item.children);
          return visibleChildren.length > 0;
        }
        return true;
      })
      .map((item) => ({
        ...item,
        children: item.children
          ? filterNavigationItems(item.children)
          : undefined,
      }));
  };

  // Filter navigation items based on user permissions
  const visibleNavigation = React.useMemo(
    () => filterNavigationItems(navigation),
    [hasAnyPermission],
  );

  // Auto-expand parent items when their child routes are active
  React.useEffect(() => {
    const activeParents = new Set<string>();
    visibleNavigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.to === location.pathname,
        );
        if (hasActiveChild) {
          activeParents.add(item.name);
        }
      }
    });
    setExpandedItems((prev) => new Set([...prev, ...activeParents]));
  }, [location.pathname]);

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
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 mt-4 px-2 overflow-y-auto">
          {visibleNavigation.map((item) => (
            <div key={item.name}>
              {item.children ? (
                // Parent item with children
                <div>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className="w-full mt-1 flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                    {expandedItems.has(item.name) ? (
                      <ChevronDownIcon className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="ml-auto h-4 w-4" />
                    )}
                  </button>
                  {expandedItems.has(item.name) && (
                    <div className="ml-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          to={child.to!}
                          className={`
                            mt-1 flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors
                            ${
                              location.pathname === child.to
                                ? "bg-blue-600 text-white"
                                : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }
                          `}
                        >
                          <child.icon className="mr-3 h-4 w-4" />
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular item without children
                <Link
                  to={item.to!}
                  className={`
                    mt-1 flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors
                    ${
                      location.pathname === item.to
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-2 mt-auto space-y-2">
          <ServerSelector />
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
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <main className="flex-1 p-6 overflow-y-auto h-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
