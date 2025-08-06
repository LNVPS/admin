import React from "react";
import { Card, StatCard } from "../components/Card";
import {
  ChartBarIcon,
  ServerIcon,
  UsersIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { Table } from "../components/Table";

interface StatData {
  totalUsers: number;
  activeVMs: number;
  revenue: number;
  growthRate: number;
}

interface RegionData {
  id: number;
  name: string;
  activeVMs: number;
  totalUsers: number;
  uptime: number;
  usage: number;
}

export function AnalyticsPage() {
  const [stats, setStats] = React.useState<StatData>({
    totalUsers: 156,
    activeVMs: 432,
    revenue: 25678,
    growthRate: 12.3,
  });

  const [regionData, setRegionData] = React.useState<RegionData[]>([
    {
      id: 1,
      name: "US East",
      activeVMs: 145,
      totalUsers: 89,
      uptime: 99.98,
      usage: 78,
    },
    {
      id: 2,
      name: "US West",
      activeVMs: 98,
      totalUsers: 67,
      uptime: 99.95,
      usage: 65,
    },
    {
      id: 3,
      name: "EU Central",
      activeVMs: 123,
      totalUsers: 92,
      uptime: 99.99,
      usage: 82,
    },
    {
      id: 4,
      name: "Asia Pacific",
      activeVMs: 66,
      totalUsers: 45,
      uptime: 99.97,
      usage: 45,
    },
  ]);

  const columns = [
    { header: "Region", key: "name" },
    {
      header: "Active VMs",
      key: "activeVMs",
      render: (item: RegionData) => (
        <div className="flex items-center">
          <ServerIcon className="mr-2 h-5 w-5 text-primary-500" />
          {item.activeVMs}
        </div>
      ),
    },
    {
      header: "Users",
      key: "totalUsers",
      render: (item: RegionData) => (
        <div className="flex items-center">
          <UsersIcon className="mr-2 h-5 w-5 text-primary-500" />
          {item.totalUsers}
        </div>
      ),
    },
    {
      header: "Uptime",
      key: "uptime",
      render: (item: RegionData) => (
        <span className="text-green-500">{item.uptime}%</span>
      ),
    },
    {
      header: "Usage",
      key: "usage",
      render: (item: RegionData) => (
        <div className="flex items-center">
          <div className="h-2 w-24 rounded-full bg-dark-700">
            <div
              className="h-2 rounded-full bg-primary-500"
              style={{ width: `${item.usage}%` }}
            />
          </div>
          <span className="ml-2 text-sm text-dark-400">{item.usage}%</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<UsersIcon className="h-6 w-6" />}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Active VMs"
          value={stats.activeVMs}
          icon={<ServerIcon className="h-6 w-6" />}
          trend={{ value: 12.3, isPositive: true }}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          trend={{ value: 15.4, isPositive: true }}
        />
        <StatCard
          title="Growth Rate"
          value={`${stats.growthRate}%`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          trend={{ value: 2.1, isPositive: true }}
        />
      </div>

      <Card title="Region Overview">
        <Table columns={columns} data={regionData} />
      </Card>
    </div>
  );
}
