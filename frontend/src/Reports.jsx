
import { useEffect, useState } from "react";
import {
  RefreshCw,
  Package,
  Factory,
  ShoppingCart,
  FileText,
  IndianRupee,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Boxes,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

export default function Reports({ token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  async function fetchReports() {
    if (!token) {
      setError("Authentication token is missing. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const endpoints = [
        "/inventory/summary",
        "/inventory/stock",
        "/production/batches",
        "/sales/orders",
        "/sales/invoices",
        "/accounts/overview",
      ];

      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          fetch(`${API}${endpoint}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );

      const failedResponse = responses.find(
        (response) => !response.ok
      );

      if (failedResponse) {
        throw new Error(
          `Report API Error: ${failedResponse.status} (${failedResponse.url})`
        );
      }

      const [
        inventory,
        stock,
        production,
        sales,
        invoice,
        accounts,
      ] = await Promise.all(
        responses.map((response) => response.json())
      );

      setReport({
        inventory,
        stock,
        production,
        sales,
        invoice,
        accounts,
      });
    } catch (err) {
      console.error("Reports fetch error:", err);
      setError(err.message || "Unable to generate reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [token]);
const downloadBusinessReport = async () => {
  try {
    setPdfLoading(true);

    const response = await fetch(`${API}/reports/business/pdf`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to download business report.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Business_Performance_Report.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("PDF download error:", err);
    alert(err.message || "PDF download failed.");
  } finally {
    setPdfLoading(false);
  }
};
  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Generating business reports...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-400">
        {error}
        <button
          onClick={fetchReports}
          className="block mx-auto mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    inventory,
    stock,
    production,
    sales,
    invoice,
    accounts,
  } = report;

  const summary = accounts.summary || {};
  const batches = production.batches || [];
  const orders = sales.orders || [];
  const invoices = invoice.invoices || [];
  const stockItems = stock.items || [];

  const rawMaterials = stockItems.filter(
    (item) => item.category === "Raw Material"
  );

  const packagingItems = stockItems.filter(
    (item) => item.category === "Packaging"
  );

  const finishedGoods = stockItems.filter(
    (item) => item.category === "Finished Goods"
  );

  const zeroStockItems = stockItems.filter(
    (item) => Number(item.quantity) <= 0
  );

  const totalGST = invoices.reduce(
    (sum, item) =>
      sum +
      Number(item.cgst_amount || 0) +
      Number(item.sgst_amount || 0) +
      Number(item.igst_amount || 0),
    0
  );

  const taxableValue = invoices.reduce(
    (sum, item) => sum + Number(item.taxable_amount || 0),
    0
  );

  const totalCGST = invoices.reduce(
    (sum, item) => sum + Number(item.cgst_amount || 0),
    0
  );

  const totalSGST = invoices.reduce(
    (sum, item) => sum + Number(item.sgst_amount || 0),
    0
  );

  const plannedOutput = batches.reduce(
    (sum, batch) => sum + Number(batch.planned_output || 0),
    0
  );

  const actualOutput = batches.reduce(
    (sum, batch) => sum + Number(batch.actual_good_output || 0),
    0
  );

  const yieldVariance = plannedOutput
    ? ((actualOutput - plannedOutput) / plannedOutput) * 100
    : 0;

  // Sales order calculations
  const getOrderStatus = (order) =>
    String(order.status || "").toUpperCase();

  const dispatchedOrders = orders.filter(
    (order) => getOrderStatus(order) === "DISPATCHED"
  ).length;

  const pendingOrders = orders.filter(
    (order) => getOrderStatus(order) === "PENDING"
  ).length;

  const approvedOrders = orders.filter(
    (order) => getOrderStatus(order) === "APPROVED"
  ).length;

  const totalOrderedQuantity = orders.reduce(
    (sum, order) => sum + Number(order.quantity || 0),
    0
  );

  const totalDispatchedQuantity = orders.reduce(
    (sum, order) => sum + Number(order.dispatched_quantity || 0),
    0
  );

  const totalShortage = orders.reduce(
    (sum, order) => sum + Number(order.shortage || 0),
    0
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case "DISPATCHED":
        return "bg-emerald-500/10 text-emerald-400";

      case "APPROVED":
        return "bg-blue-500/10 text-blue-400";

      case "PENDING":
        return "bg-amber-500/10 text-amber-400";

      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  return (
    <div className="space-y-6">

     {/* Header */}
<div className="flex flex-wrap justify-between items-center gap-4">
  <div>
    <h2 className="text-xl font-semibold text-white">
      Business Reports
    </h2>
    <p className="text-sm text-slate-400 mt-1">
      Unified business performance and financial overview
    </p>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    <button
      onClick={downloadBusinessReport}
      disabled={pdfLoading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm"
    >
      <FileText size={16} />
      {pdfLoading ? "Downloading..." : "Download PDF"}
    </button>

    <button
      onClick={fetchReports}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
    >
      <RefreshCw size={16} />
      Refresh Reports
    </button>
  </div>
</div>

      {/* Business Overview */}
      <section className="space-y-3">
        <h3 className="text-white font-semibold">
          Business Overview
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ReportCard
            title="Tracked Inventory Items"
            value={inventory.tracked_items ?? stock.total_items ?? 0}
            icon={<Package size={20} />}
            color="blue"
          />

          <ReportCard
            title="Production Batches"
            value={production.total_batches ?? batches.length}
            icon={<Factory size={20} />}
            color="purple"
          />

          <ReportCard
            title="Sales Orders"
            value={sales.total_orders ?? orders.length}
            icon={<ShoppingCart size={20} />}
            color="green"
          />

          <ReportCard
            title="Total Invoices"
            value={invoice.total_invoices ?? invoices.length}
            icon={<FileText size={20} />}
            color="yellow"
          />
        </div>
      </section>

      {/* Inventory Report */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">

        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-white font-semibold">
              Inventory Report
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Current stock position across all inventory categories
            </p>
          </div>

          <div className="flex items-center gap-2 text-blue-400">
            <Boxes size={20} />
            <span className="text-sm">
              {stock.total_items ?? stockItems.length} Items
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GSTCard
            label="Raw Materials"
            value={`${inventory.raw_materials ?? rawMaterials.length} Items`}
          />

          <GSTCard
            label="Packaging Items"
            value={`${inventory.packaging_items ?? packagingItems.length} Items`}
          />

          <GSTCard
            label="Finished Goods"
            value={`${inventory.finished_goods_quantity ?? 0} Packets`}
          />
        </div>

        {zeroStockItems.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <AlertTriangle
              size={20}
              className="text-amber-400 mt-0.5"
            />

            <div>
              <p className="text-amber-300 font-semibold text-sm">
                Stock Attention Required
              </p>

              <p className="text-slate-300 text-sm mt-1">
                {zeroStockItems.length} item(s) currently have zero stock:
                {" "}
                {zeroStockItems.map((item) => item.name).join(", ")}.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-400 bg-slate-800/60">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Available Stock</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {stockItems.map((item) => {
                const isOutOfStock = Number(item.quantity) <= 0;

                return (
                  <tr key={item.sku} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-blue-400">
                      {item.sku}
                    </td>

                    <td className="px-4 py-3 text-white">
                      {item.name}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {item.category}
                    </td>

                    <td className={`px-4 py-3 font-semibold ${
                      isOutOfStock ? "text-red-400" : "text-white"
                    }`}>
                      {Number(item.quantity).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {item.unit}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {item.cost == null ? "Not set" : money(item.cost)}
                    </td>

                    <td className="px-4 py-3">
                      {isOutOfStock ? (
                        <span className="px-2 py-1 rounded-md text-xs bg-red-500/10 text-red-400">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-xs bg-emerald-500/10 text-emerald-400">
                          Available
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {stockItems.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-slate-400 py-6">
                    No inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Financial Overview */}
      <section className="space-y-3">
        <h3 className="text-white font-semibold">
          Financial Overview
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ReportCard
            title="Invoice Value"
            value={money(
              invoices.reduce(
                (sum, item) => sum + Number(item.total_amount || 0),
                0
              )
            )}
            icon={<IndianRupee size={20} />}
            color="blue"
          />

          <ReportCard
            title="Payments Received"
            value={money(summary.total_payments)}
            icon={<TrendingUp size={20} />}
            color="green"
          />

          <ReportCard
            title="Outstanding"
            value={money(summary.total_outstanding)}
            icon={<AlertTriangle size={20} />}
            color="yellow"
          />

          <ReportCard
            title="Production Expenses"
            value={money(summary.production_expenses)}
            icon={<Receipt size={20} />}
            color="purple"
          />
        </div>
      </section>

      {/* GST Report */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold">
          GST Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <GSTCard label="Taxable Value" value={money(taxableValue)} />
          <GSTCard label="CGST" value={money(totalCGST)} />
          <GSTCard label="SGST" value={money(totalSGST)} />
          <GSTCard label="Total GST" value={money(totalGST)} />
        </div>
      </section>

      {/* Material Variance Report */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">

        <div>
          <h3 className="text-white font-semibold">
            Material Variance Report
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Standard material consumption compared with actual consumption
          </p>
        </div>

        {(() => {
          const varianceItems = batches.flatMap((batch) =>
            (batch.materials || []).map((material) => ({
              ...material,
              batch_number: batch.batch_number,
            }))
          );

          const excessCount = varianceItems.filter(
            (item) => Number(item.variance) > 0
          ).length;

          const lowerCount = varianceItems.filter(
            (item) => Number(item.variance) < 0
          ).length;

          const normalCount = varianceItems.filter(
            (item) => Number(item.variance) === 0
          ).length;

          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <GSTCard
                  label="Excess Consumption"
                  value={`${excessCount} Records`}
                  warning
                />

                <GSTCard
                  label="Lower Consumption"
                  value={`${lowerCount} Records`}
                />

                <GSTCard
                  label="Within Standard"
                  value={`${normalCount} Records`}
                />
              </div>

              {batches.map((batch) => (
                <div
                  key={batch.batch_number}
                  className="border border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-800/60 px-4 py-3">
                    <div>
                      <p className="text-blue-400 font-semibold">
                        {batch.batch_number}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        {batch.product}
                      </p>
                    </div>

                    <div className="text-right text-xs text-slate-400">
                      Yield Variance:{" "}
                      <span className={
                        Number(batch.yield_variance_percent) < 0
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }>
                        {Number(batch.yield_variance_percent || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase text-slate-400 bg-slate-800/30">
                        <tr>
                          <th className="px-4 py-3">Material</th>
                          <th className="px-4 py-3">Standard</th>
                          <th className="px-4 py-3">Actual</th>
                          <th className="px-4 py-3">Variance</th>
                          <th className="px-4 py-3">Variance %</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800">
                        {(batch.materials || []).map((material, index) => {
                          const variance = Number(material.variance || 0);
                          const percentage = Number(
                            material.variance_percent || 0
                          );

                          const status =
                            variance > 0
                              ? "Excess Usage"
                              : variance < 0
                              ? "Lower Usage"
                              : "On Standard";

                          return (
                            <tr
                              key={`${batch.batch_number}-${material.material}-${index}`}
                            >
                              <td className="px-4 py-3 text-white">
                                {material.material}
                              </td>

                              <td className="px-4 py-3 text-slate-300">
                                {material.standard_usage} {material.unit}
                              </td>

                              <td className="px-4 py-3 text-slate-300">
                                {material.actual_usage} {material.unit}
                              </td>

                              <td className={`px-4 py-3 font-semibold ${
                                variance > 0
                                  ? "text-amber-400"
                                  : variance < 0
                                  ? "text-emerald-400"
                                  : "text-slate-300"
                              }`}>
                                {variance > 0 ? "+" : ""}
                                {variance} {material.unit}
                              </td>

                              <td className={`px-4 py-3 ${
                                percentage > 0
                                  ? "text-amber-400"
                                  : percentage < 0
                                  ? "text-emerald-400"
                                  : "text-slate-300"
                              }`}>
                                {percentage > 0 ? "+" : ""}
                                {percentage.toFixed(2)}%
                              </td>

                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-md text-xs ${
                                  variance > 0
                                    ? "bg-amber-500/10 text-amber-400"
                                    : variance < 0
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-slate-700 text-slate-300"
                                }`}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {batches.length === 0 && (
                <p className="text-center text-slate-400 py-6">
                  No production variance records found.
                </p>
              )}
            </>
          );
        })()}
      </section>

      {/* Production Report */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold">
          Production Performance
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GSTCard
            label="Planned Output"
            value={`${plannedOutput} packets`}
          />

          <GSTCard
            label="Actual Good Output"
            value={`${actualOutput} packets`}
          />

          <GSTCard
            label="Yield Variance"
            value={`${yieldVariance.toFixed(2)}%`}
            warning={yieldVariance < 0}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-400 bg-slate-800/60">
              <tr>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Planned</th>
                <th className="px-4 py-3">Actual</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {batches.map((batch) => (
                <tr key={batch.batch_number}>
                  <td className="px-4 py-3 text-blue-400">
                    {batch.batch_number}
                  </td>

                  <td className="px-4 py-3 text-white">
                    {batch.product}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {batch.planned_output}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {batch.actual_good_output}
                  </td>

                  <td className="px-4 py-3 text-emerald-400">
                    {batch.status}
                  </td>
                </tr>
              ))}

              {batches.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-slate-400 py-6">
                    No production batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Sales Report */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">

        <div>
          <h3 className="text-white font-semibold">
            Sales Report
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Order status, customer details, dispatch and stock availability
          </p>
        </div>

        {/* Sales Order Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <GSTCard
            label="Total Orders"
            value={orders.length}
          />

          <GSTCard
            label="Dispatched Orders"
            value={dispatchedOrders}
          />

          <GSTCard
            label="Approved Orders"
            value={approvedOrders}
          />

          <GSTCard
            label="Pending Orders"
            value={pendingOrders}
            warning={pendingOrders > 0}
          />
        </div>

        {/* Quantity Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GSTCard
            label="Total Ordered Quantity"
            value={`${totalOrderedQuantity} Packets`}
          />

          <GSTCard
            label="Total Dispatched Quantity"
            value={`${totalDispatchedQuantity} Packets`}
          />

          <GSTCard
            label="Total Shortage"
            value={`${totalShortage} Packets`}
            warning={totalShortage > 0}
          />
        </div>

        {/* Order Details Table */}
        <div>
          <h4 className="text-white font-medium mb-3">
            Sales Order Details
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">

              <thead className="text-xs uppercase text-slate-400 bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Ordered</th>
                  <th className="px-4 py-3">Available Qty</th>
                  <th className="px-4 py-3">Dispatched</th>
                  <th className="px-4 py-3">Shortage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created At</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">

                {orders.map((order) => {
                  const status = getOrderStatus(order);

                  return (
                    <tr
                      key={order.order_number}
                      className="hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 text-blue-400 font-medium whitespace-nowrap">
                        {order.order_number}
                      </td>

                      <td className="px-4 py-3 text-white whitespace-nowrap">
                        {order.customer || "Not available"}
                      </td>

                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {order.product || "Not available"}
                      </td>

                      <td className="px-4 py-3 text-white">
                        {Number(order.quantity || 0)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {Number(order.available_quantity || 0)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {Number(order.dispatched_quantity || 0)}
                      </td>

                      <td className={`px-4 py-3 font-semibold ${
                        Number(order.shortage || 0) > 0
                          ? "text-red-400"
                          : "text-slate-300"
                      }`}>
                        {Number(order.shortage || 0)}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs whitespace-nowrap ${getStatusStyle(status)}`}>
                          {status || "UNKNOWN"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  );
                })}

                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center text-slate-400 py-6"
                    >
                      No sales orders found.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Print */}
      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
        >
          Print Reports
        </button>
      </div>

    </div>
  );
}

function ReportCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-emerald-500/10 text-emerald-400",
    yellow: "bg-amber-500/10 text-amber-400",
    purple: "bg-purple-500/10 text-purple-400",
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}
      >
        {icon}
      </div>

      <p className="text-sm text-slate-400 mt-4">
        {title}
      </p>

      <h3 className="text-xl font-bold text-white mt-1">
        {value}
      </h3>
    </div>
  );
}

function GSTCard({ label, value, warning = false }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <h4
        className={`text-lg font-semibold mt-2 ${
          warning ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </h4>
    </div>
  );
}
