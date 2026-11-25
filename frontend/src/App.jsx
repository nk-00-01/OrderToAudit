
import { useEffect, useState } from "react";

import Inventory from "./Inventory";
import Production from "./Production";
import Invoices from "./Invoices";
import Accounts from "./Accounts";
import Reports from "./Reports";
import Login from "./Login";
import SalesOrders from "./SalesOrders";

import {
  LayoutDashboard,
  Boxes,
  Factory,
  ShoppingCart,
  FileText,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  HelpCircle,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  Package,
  IndianRupee,
  Activity,
  Clock3,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// ================= NAVIGATION =================

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Inventory", icon: Boxes },
  { name: "Production", icon: Factory },
  { name: "Sales Orders", icon: ShoppingCart },
  { name: "Invoices", icon: FileText },
  { name: "Accounts", icon: Wallet },
  { name: "Reports", icon: ChartNoAxesCombined },
];

const API_URL = "http://127.0.0.1:8000";

// ================= MAIN APP =================

function App() {
  const [active, setActive] = useState("Dashboard");
  const [auth, setAuth] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [dashboardData, setDashboardData] = useState({});
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardRefresh, setDashboardRefresh] = useState(0);

  // ================= LOGIN =================

  const handleLogin = (data) => {
    setAuth({
      token: data.access_token,
      user: data.user,
    });

    setActive("Dashboard");
  };

  // ================= LOGOUT =================

  const handleLogout = () => {
    setAuth(null);
    setActive("Dashboard");
    setSidebarOpen(false);
    setSearch("");
    setDashboardData({});
  };

  // ================= ROLE CONFIGURATION =================

  const roleNames = {
    1: "Owner",
    2: "Admin",
    3: "Salesman",
    4: "Production Supervisor",
    5: "Accountant/Auditor",
  };

  const permissions = {
    1: [
      "Dashboard",
      "Inventory",
      "Production",
      "Sales Orders",
      "Invoices",
      "Accounts",
      "Reports",
    ],

    2: [
      "Dashboard",
      "Inventory",
      "Production",
      "Sales Orders",
      "Invoices",
      "Accounts",
      "Reports",
    ],

    3: ["Dashboard", "Sales Orders"],

    4: ["Dashboard", "Inventory", "Production"],

    5: [
      "Dashboard",
      "Inventory",
      "Production",
      "Invoices",
      "Accounts",
    ],
  };

  const roleId = Number(auth?.user?.role_id);

  const visibleNavigation = navigation.filter((item) =>
    (permissions[roleId] || ["Dashboard"]).includes(item.name)
  );

  // ================= LIVE DASHBOARD DATA =================

  useEffect(() => {
    if (!auth?.token) return;

    let cancelled = false;

    const endpoints = [];

    // Owner and Admin
    if (roleId === 1 || roleId === 2) {
      endpoints.push(
        ["inventory", "/inventory/summary"],
        ["production", "/production/batches"],
        ["orders", "/sales/orders"],
        ["invoices", "/sales/invoices"],
        ["accounts", "/accounts/overview"]
      );
    }

    // Salesman
    if (roleId === 3) {
      endpoints.push(["orders", "/sales/orders"]);
    }

    // Production Supervisor
    if (roleId === 4) {
      endpoints.push(
        ["inventory", "/inventory/summary"],
        ["production", "/production/batches"]
      );
    }

    // Accountant / Auditor
    if (roleId === 5) {
      endpoints.push(
        ["inventory", "/inventory/summary"],
        ["production", "/production/batches"],
        ["invoices", "/sales/invoices"],
        ["accounts", "/accounts/overview"]
      );
    }

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError("");
      setDashboardData({});

      try {
        const results = await Promise.all(
          endpoints.map(async ([key, endpoint]) => {
            const response = await fetch(
              `${API_URL}${endpoint}`,
              {
                headers: {
                  Authorization: `Bearer ${auth.token}`,
                },
              }
            );

            if (!response.ok) {
              throw new Error(
                `${endpoint} failed with status ${response.status}`
              );
            }

            return [key, await response.json()];
          })
        );

        if (!cancelled) {
          setDashboardData(Object.fromEntries(results));
        }
      } catch (error) {
        if (!cancelled) {
          setDashboardError(
            error.message || "Unable to load dashboard data."
          );
        }
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [auth?.token, roleId, dashboardRefresh]);

  // ================= DERIVED DASHBOARD DATA =================

  const latestBatch = dashboardData.production?.batches?.[0];

  const invoiceList =
    dashboardData.invoices?.invoices || [];

  const orderList =
    dashboardData.orders?.orders || [];

  const totalInvoiceValue = invoiceList.reduce(
    (total, invoice) =>
      total + Number(invoice.total_amount || 0),
    0
  );

  const totalOutstanding =
    dashboardData.accounts?.summary?.total_outstanding ??
    invoiceList.reduce(
      (total, invoice) =>
        total + Number(invoice.outstanding_amount || 0),
      0
    );

  // ================= DYNAMIC KPI CARDS =================

  const stats = [];

  if (dashboardData.invoices) {
    stats.push({
      title: "Invoice Value",
      value: `₹${totalInvoiceValue.toLocaleString("en-IN")}`,
      detail: `${dashboardData.invoices.total_invoices || 0} issued invoice(s)`,
      icon: IndianRupee,
      trend: "Invoiced",
      positive: true,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
    });
  }

  if (dashboardData.inventory) {
    stats.push({
      title: "Finished Stock",
      value: Number(
        dashboardData.inventory.finished_goods_quantity || 0
      ).toLocaleString("en-IN"),
      detail: "Finished goods packets",
      icon: Package,
      trend: "In stock",
      positive: true,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10",
    });
  }

  if (dashboardData.production && latestBatch) {
    const yieldPercent = latestBatch.planned_output
      ? Math.round(
          (latestBatch.actual_good_output /
            latestBatch.planned_output) *
            100
        )
      : 0;

    stats.push({
      title: "Production Output",
      value: Number(
        latestBatch.actual_good_output || 0
      ).toLocaleString("en-IN"),
      detail: `${latestBatch.product || "Latest batch"} · ${latestBatch.batch_number}`,
      icon: Factory,
      trend: `${yieldPercent}% yield`,
      positive: yieldPercent >= 90,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
    });
  }

  if (dashboardData.accounts || dashboardData.invoices) {
    stats.push({
      title: "Outstanding",
      value: `₹${Number(totalOutstanding || 0).toLocaleString("en-IN")}`,
      detail: "Pending customer payments",
      icon: Wallet,
      trend: "Receivables",
      positive: Number(totalOutstanding || 0) === 0,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
    });
  }

  if (dashboardData.accounts) {
    stats.push({
      title: "Payments Received",
      value: `₹${Number(
        dashboardData.accounts.summary?.total_payments || 0
      ).toLocaleString("en-IN")}`,
      detail: "Customer payments recorded",
      icon: IndianRupee,
      trend: "Collected",
      positive: true,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10",
    });
  }

  if (dashboardData.orders && !dashboardData.invoices) {
    const pendingOrders = orderList.filter(
      (order) =>
        String(order.status).toUpperCase() !== "DISPATCHED"
    ).length;

    const totalShortage = orderList.reduce(
      (total, order) =>
        total + Number(order.shortage || 0),
      0
    );

    stats.push(
      {
        title: "Total Orders",
        value: String(
          dashboardData.orders.total_orders || 0
        ),
        detail: "Customer orders recorded",
        icon: ShoppingCart,
        trend: "Orders",
        positive: true,
        iconColor: "text-blue-400",
        iconBg: "bg-blue-500/10",
      },
      {
        title: "Pending Orders",
        value: String(pendingOrders),
        detail: "Orders awaiting completion",
        icon: Clock3,
        trend: "Pending",
        positive: pendingOrders === 0,
        iconColor: "text-amber-400",
        iconBg: "bg-amber-500/10",
      },
      {
        title: "Order Shortage",
        value: String(totalShortage),
        detail: "Packets not currently available",
        icon: Package,
        trend: "Packets",
        positive: totalShortage === 0,
        iconColor: "text-violet-400",
        iconBg: "bg-violet-500/10",
      }
    );
  }

  if (roleId === 4 && dashboardData.production) {
    stats.push({
      title: "Production Expenses",
      value: `₹${Number(
        latestBatch?.expenses || 0
      ).toLocaleString("en-IN")}`,
      detail: "Expenses recorded for latest batch",
      icon: IndianRupee,
      trend: "Recorded",
      positive: true,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
    });
  }

  // ================= CHART DATA =================

  const chartData = dashboardData.orders
    ? orderList.map((order) => ({
        label: order.order_number,
        quantity: Number(order.quantity || 0),
      }))
    : (dashboardData.production?.batches || []).map(
        (batch) => ({
          label: batch.batch_number,
          quantity: Number(batch.actual_good_output || 0),
        })
      );

  // ================= RECENT ACTIVITY =================

  const activityRows = dashboardData.orders
    ? orderList.map((order) => ({
        id: order.order_number,
        customer: order.customer,
        quantity: `${order.quantity} packets`,
        status: order.status,
      }))
    : dashboardData.invoices
      ? invoiceList.map((invoice) => ({
          id: invoice.invoice_number,
          customer: invoice.customer,
          quantity: `₹${Number(
            invoice.total_amount || 0
          ).toLocaleString("en-IN")}`,
          status: invoice.payment_status,
        }))
      : (dashboardData.production?.batches || []).map(
          (batch) => ({
            id: batch.batch_number,
            customer: batch.product,
            quantity: `${batch.actual_good_output} packets`,
            status: batch.status,
          })
        );

  // ================= INVENTORY SUMMARY =================

  const inventoryRows = dashboardData.inventory
    ? [
        [
          "Tracked items",
          dashboardData.inventory.tracked_items,
        ],
        [
          "Raw materials",
          dashboardData.inventory.raw_materials,
        ],
        [
          "Packaging items",
          dashboardData.inventory.packaging_items,
        ],
        [
          "Finished goods",
          `${dashboardData.inventory.finished_goods_quantity} packets`,
        ],
      ]
    : [];

  // ================= USER DETAILS =================

  const userName = auth?.user?.full_name || "User";
  const userRole = roleNames[roleId] || "User";

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ================= LOGIN SCREEN =================

  if (!auth) {
    return <Login onLogin={handleLogin} />;
  }

  // ================= DASHBOARD UI =================

  return (
    <div className="min-h-screen bg-[#080d19] text-slate-200">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.07] bg-[#0c1424] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* LOGO */}

        <div className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
              <Activity size={22} className="text-white" />
            </div>

            <div>
              <h1 className="text-[15px] font-bold tracking-wide text-white">
                OrderToAudit
              </h1>

              <p className="text-[10px] tracking-[2px] text-slate-500">
                BUSINESS ERP
              </p>
            </div>

          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 lg:hidden"
          >
            <X size={20} />
          </button>

        </div>

        {/* NAVIGATION */}

        <div className="px-4 pt-7">

          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[2px] text-slate-500">
            WORKSPACE
          </p>

          <nav className="space-y-1">

            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const selected = active === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActive(item.name);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                    selected
                      ? "bg-blue-600/15 font-semibold text-blue-400"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >

                  <Icon size={19} />

                  <span>{item.name}</span>

                  {selected && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                  )}

                </button>
              );
            })}

          </nav>

        </div>

        {/* SIDEBAR BOTTOM */}

        <div className="mt-auto space-y-1 border-t border-white/[0.07] p-4">

          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-white/[0.04] hover:text-white">
            <Settings size={19} />
            Settings
          </button>

          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-white/[0.04] hover:text-white">
            <HelpCircle size={19} />
            Help & Support
          </button>

          {/* USER PROFILE */}

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400">
              {initials}
            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-medium text-white">
                {userName}
              </p>

              <p className="text-xs text-slate-500">
                {userRole}
              </p>

            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={18} />
            </button>

          </div>

        </div>

      </aside>

      {/* MAIN AREA */}

      <main className="dashboard-main min-h-screen lg:ml-[260px]">

        {/* TOPBAR */}

        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#080d19]/90 px-5 backdrop-blur-xl sm:px-8">

          <div className="flex items-center gap-4">

            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-xs text-slate-500">
                Workspace / Overview
              </p>

              <h2 className="text-lg font-semibold text-white">
                {active}
              </h2>
            </div>

          </div>

          <div className="flex items-center gap-3 sm:gap-5">

            {/* SEARCH */}

            <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:flex">

              <Search size={16} className="text-slate-500" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-32 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />

              <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500">
                /
              </span>

            </div>

            {/* NOTIFICATIONS */}

            <button className="relative rounded-xl p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white">
              <Bell size={19} />

              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#080d19] bg-blue-400" />
            </button>

            {/* USER AVATAR */}

            <div className="hidden items-center gap-2 border-l border-white/10 pl-4 sm:flex">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                {initials}
              </div>

              <ChevronDown size={15} className="text-slate-500" />

            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}

        {active === "Inventory" ? (

          <Inventory token={auth.token} />

        ) : active === "Production" ? (

          <Production token={auth.token} />

        ) : active === "Sales Orders" ? (

          <SalesOrders token={auth.token} />

        ) : active === "Invoices" ? (

          <Invoices token={auth.token} />

        ) : active === "Accounts" ? (

          <Accounts token={auth.token} />

        ) : active === "Reports" ? (

          <Reports token={auth.token} />

        ) : (

          /* ================= DASHBOARD ================= */

          <div className="mx-auto w-full max-w-[1700px] space-y-8 p-5 sm:p-7 xl:p-9">

            {/* WELCOME */}

            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">
                  Business Overview
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Live operational data from your OrderToAudit database.
                </p>
              </div>

              <button
                onClick={() =>
                  setDashboardRefresh((value) => value + 1)
                }
                disabled={dashboardLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Activity size={17} />

                {dashboardLoading
                  ? "Refreshing..."
                  : "Refresh Dashboard"}
              </button>

            </section>

            {/* LOADING */}

            {dashboardLoading && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                Loading live dashboard data...
              </div>
            )}

            {/* ERROR */}

            {dashboardError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                Unable to load dashboard data: {dashboardError}.
                Check that the backend is running and sign in again if your token has expired.
              </div>
            )}

            {/* KPI CARDS */}

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-4">

              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.title}
                    className="group rounded-2xl border border-white/[0.07] bg-[#101a2c] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-500/30"
                  >

                    <div className="flex items-center justify-between">

                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg}`}>
                        <Icon size={21} className={stat.iconColor} />
                      </div>

                      <MoreHorizontal size={20} className="text-slate-600" />

                    </div>

                    <p className="mt-5 text-sm text-slate-400">
                      {stat.title}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2">

                      <h3 className="text-[27px] font-bold tracking-tight text-white">
                        {stat.value}
                      </h3>

                      <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
                        stat.positive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>

                        {stat.positive
                          ? <ArrowUpRight size={12} />
                          : <Clock3 size={12} />}

                        {stat.trend}

                      </span>

                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {stat.detail}
                    </p>

                  </div>
                );
              })}

            </section>

            {/* CHART + INVENTORY */}

            <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">

              {/* OPERATIONAL CHART */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#101a2c] p-7 xl:col-span-2">

                <div className="mb-6">
                  <h3 className="font-semibold text-white">
                    {dashboardData.orders
                      ? "Order Quantity Overview"
                      : "Production Output Overview"}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {dashboardData.orders
                      ? "Packet quantities from recorded customer orders"
                      : "Good packets recorded in production batches"}
                  </p>
                </div>

                {chartData.length > 0 ? (

                  <div className="h-[300px] w-full">

                    <ResponsiveContainer width="100%" height="100%">

                      <AreaChart data={chartData}>

                        <defs>
                          <linearGradient
                            id="liveDashboardGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />

                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          stroke="#263247"
                          strokeDasharray="3 3"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 11 }}
                          dy={10}
                        />

                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 11 }}
                        />

                        <Tooltip
                          contentStyle={{
                            background: "#172338",
                            border: "1px solid #334155",
                            borderRadius: "12px",
                            color: "#fff",
                          }}
                          formatter={(value) => [
                            `${value} packets`,
                            "Quantity",
                          ]}
                        />

                        <Area
                          type="monotone"
                          dataKey="quantity"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fill="url(#liveDashboardGradient)"
                        />

                      </AreaChart>

                    </ResponsiveContainer>

                  </div>

                ) : (

                  <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                    Sales or production chart data is not available for this role.
                  </div>

                )}

              </div>

              {/* INVENTORY SNAPSHOT */}

              <div className="h-fit rounded-2xl border border-white/[0.07] bg-[#101a2c] p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="font-semibold text-white">
                      Inventory Snapshot
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Live inventory summary
                    </p>
                  </div>

                  <Boxes size={19} className="text-blue-400" />

                </div>

                {inventoryRows.length > 0 ? (

                  <div className="mt-6 space-y-4">

                    {inventoryRows.map(([label, value]) => (

                      <div
                        key={label}
                        className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-3 last:border-0"
                      >

                        <span className="text-xs text-slate-400">
                          {label}
                        </span>

                        <span className="text-sm font-semibold text-white">
                          {value}
                        </span>

                      </div>

                    ))}

                  </div>

                ) : (

                  <div className="mt-6 text-sm text-slate-500">
                    Inventory summary is not available for this role.
                  </div>

                )}

              </div>

            </section>

            {/* RECENT ACTIVITY + PRODUCTION */}

            <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">

              {/* RECENT ACTIVITY */}

              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101a2c] xl:col-span-2">

                <div className="flex items-center justify-between border-b border-white/[0.07] p-5">

                  <div>
                    <h3 className="font-semibold text-white">
                      {dashboardData.orders
                        ? "Recent Orders"
                        : dashboardData.invoices
                          ? "Recent Invoices"
                          : "Production Batches"}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Latest records available to your role
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    {activityRows.length} record(s)
                  </span>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[480px] text-left text-sm">

                    <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">

                      <tr>
                        <th className="px-5 py-4 font-medium">
                          Reference
                        </th>

                        <th className="px-5 py-4 font-medium">
                          Customer / Product
                        </th>

                        <th className="px-5 py-4 font-medium">
                          Quantity / Value
                        </th>

                        <th className="px-5 py-4 font-medium">
                          Status
                        </th>
                      </tr>

                    </thead>

                    <tbody>

                      {activityRows.length > 0 ? (

                        activityRows.map((row) => (

                          <tr
                            key={row.id}
                            className="border-t border-white/[0.05] hover:bg-white/[0.02]"
                          >

                            <td className="px-5 py-4 font-medium text-blue-400">
                              {row.id}
                            </td>

                            <td className="px-5 py-4 text-slate-300">
                              {row.customer}
                            </td>

                            <td className="px-5 py-4 font-medium text-white">
                              {row.quantity}
                            </td>

                            <td className="px-5 py-4">

                              <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-300">
                                {row.status}
                              </span>

                            </td>

                          </tr>

                        ))

                      ) : (

                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-8 text-center text-sm text-slate-500"
                          >
                            No dashboard records are available yet.
                          </td>
                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* PRODUCTION PERFORMANCE */}

              <div className="h-fit rounded-2xl border border-white/[0.07] bg-[#101a2c] p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="font-semibold text-white">
                      Production Performance
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Latest production batch
                    </p>
                  </div>

                  <Factory size={19} className="text-emerald-400" />

                </div>

                {latestBatch ? (

                  <>

                    <div className="mt-6 flex items-center gap-5">

                      <div
                        className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#10b981 0% ${
                            latestBatch.planned_output
                              ? (latestBatch.actual_good_output /
                                  latestBatch.planned_output) *
                                100
                              : 0
                          }%, #263247 ${
                            latestBatch.planned_output
                              ? (latestBatch.actual_good_output /
                                  latestBatch.planned_output) *
                                100
                              : 0
                          }% 100%)`,
                        }}
                      >

                        <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-[#101a2c]">

                          <span className="text-2xl font-bold text-white">
                            {latestBatch.planned_output
                              ? Math.round(
                                  (latestBatch.actual_good_output /
                                    latestBatch.planned_output) *
                                    100
                                )
                              : 0}%
                          </span>

                          <span className="text-[9px] text-slate-500">
                            Yield
                          </span>

                        </div>

                      </div>

                      <div className="space-y-3">

                        <div>
                          <p className="text-xs text-slate-500">
                            Actual output
                          </p>

                          <p className="font-semibold text-white">
                            {latestBatch.actual_good_output} packets
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Planned output
                          </p>

                          <p className="font-semibold text-white">
                            {latestBatch.planned_output} packets
                          </p>
                        </div>

                      </div>

                    </div>

                    <div className="mt-6 rounded-xl bg-white/[0.03] p-3">

                      <div className="flex items-center justify-between gap-2">

                        <span className="text-xs text-slate-400">
                          {latestBatch.batch_number}
                        </span>

                        <span className="text-[10px] font-medium text-emerald-400">
                          {latestBatch.status}
                        </span>

                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {latestBatch.damaged_pouches || 0} damaged pouches
                        {" · "}
                        {latestBatch.yield_variance_percent > 0
                          ? "+"
                          : ""}
                        {latestBatch.yield_variance_percent}% yield variance
                      </p>

                    </div>

                  </>

                ) : dashboardData.accounts ? (

                  <div className="mt-6 space-y-3">

                    <div>
                      <p className="text-xs text-slate-500">
                        Total payments received
                      </p>

                      <p className="font-semibold text-white">
                        ₹{Number(
                          dashboardData.accounts.summary?.total_payments || 0
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Production expenses
                      </p>

                      <p className="font-semibold text-white">
                        ₹{Number(
                          dashboardData.accounts.summary?.production_expenses || 0
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Total transactions
                      </p>

                      <p className="font-semibold text-white">
                        {dashboardData.accounts.summary?.total_transactions || 0}
                      </p>
                    </div>

                  </div>

                ) : (

                  <div className="mt-6 text-sm text-slate-500">
                    Production data is not available for this role.
                  </div>

                )}

              </div>

            </section>

            {/* FOOTER */}

            <footer className="border-t border-white/[0.07] py-5 text-center text-[11px] text-slate-600">
              OrderToAudit ERP · Manufacturing Management System
            </footer>

          </div>

        )}

      </main>

    </div>
  );
}

export default App;
