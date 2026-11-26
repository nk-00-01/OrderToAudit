import { useEffect, useState } from "react";
import {
  Search,
  Boxes,
  Package,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList,
  RefreshCw,
  X,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";

const API_URL = "https://ordertoaudit-backend.onrender.com";

const getItemIcon = (sku) => {
  const icons = {
    "RAW-FLOUR": "🌾",
    "RAW-OIL": "🫗",
    "RAW-SPICE": "🌶️",
    "PKG-POUCH": "📦",
    "PKG-CARTON": "🗃️",
    "MUR-200": "🥨",
  };

  return icons[sku] || "📦";
};

const emptyForm = {
  sku: "",
  name: "",
  unit: "kg",
  unit_cost: "",
  quantity: "",
  direction: "IN",
  reference: "",
  notes: "",
};

function Inventory({ token }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [stockItems, setStockItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [summary, setSummary] = useState({
    tracked_items: 0,
    raw_materials: 0,
    packaging_items: 0,
    finished_goods_quantity: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [activeAction, setActiveAction] = useState("purchase");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  // Fetch inventory data
  const fetchInventory = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        stockResponse,
        movementResponse,
        summaryResponse,
        lowStockResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/inventory/stock`, { headers }),
        fetch(`${API_URL}/inventory/movements?limit=100`, { headers }),
        fetch(`${API_URL}/inventory/summary`, { headers }),
        fetch(`${API_URL}/inventory/low-stock`, { headers }),
      ]);

      if (
        !stockResponse.ok ||
        !movementResponse.ok ||
        !summaryResponse.ok ||
        !lowStockResponse.ok
      ) {
        throw new Error("Unable to retrieve inventory data.");
      }

      const [stockData, movementData, summaryData, lowStockData] =
        await Promise.all([
          stockResponse.json(),
          movementResponse.json(),
          summaryResponse.json(),
          lowStockResponse.json(),
        ]);

      setStockItems(stockData.items || []);
      setMovements(movementData.movements || []);
      setSummary(summaryData);
      setLowStockAlerts(lowStockData.alerts || []);
    } catch (err) {
      console.error("Inventory API error:", err);
      setError(
        "Could not connect to the backend. Check whether FastAPI is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchInventory();
    }
  }, [token]);

  // Form helpers
  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openModal = (action) => {
    setActiveAction(action);
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;

    setShowModal(false);
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
  };

  const getDisplayUnit = (unit) => {
    const units = {
      litre: "L",
      piece: "pcs",
      packet: "packets",
    };

    return units[unit] || unit;
  };

  const getDisplayCost = (item) => {
    const cost = item.unit_cost ?? item.cost;

    if (cost !== null && cost !== undefined && Number(cost) > 0) {
      return `₹${Number(cost).toFixed(2)}`;
    }

    if (item.sku === "MUR-200") {
      return "₹19.15*";
    }

    return "Not set";
  };

  // Submit form to backend
  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (!token) {
      setFormError("Please log in again.");
      return;
    }

    try {
      setSubmitting(true);

      let endpoint = "";
      let payload = {};

      if (activeAction === "material") {
        endpoint = "/inventory/materials";

        payload = {
          sku: form.sku.trim().toUpperCase(),
          name: form.name.trim(),
          unit: form.unit,
          unit_cost: Number(form.unit_cost),
        };

        if (
          !payload.sku.startsWith("RAW-") &&
          !payload.sku.startsWith("PKG-")
        ) {
          throw new Error("SKU must start with RAW- or PKG-.");
        }

        if (!payload.unit_cost || payload.unit_cost < 0) {
          throw new Error("Enter a valid unit cost.");
        }
      }

      if (activeAction === "purchase") {
        endpoint = "/inventory/purchases";

        payload = {
          sku: form.sku,
          quantity: Number(form.quantity),
          unit_cost: Number(form.unit_cost),
          reference: form.reference.trim(),
          notes: form.notes.trim() || null,
        };

        if (!payload.sku) {
  throw new Error("Select an inventory item.");
}

        if (payload.quantity <= 0 || payload.unit_cost <= 0) {
          throw new Error("Quantity and unit cost must be greater than zero.");
        }

        if (!payload.reference) {
          throw new Error("Enter a purchase reference.");
        }
      }

      if (activeAction === "adjustment") {
        endpoint = "/inventory/adjustments";

        payload = {
          sku: form.sku,
          direction: form.direction,
          quantity: Number(form.quantity),
          reference: form.reference.trim(),
          notes: form.notes.trim() || null,
        };

        if (!payload.sku) {
          throw new Error("Select an inventory item.");
        }

        if (payload.quantity <= 0) {
          throw new Error("Quantity must be greater than zero.");
        }

        if (!payload.reference) {
          throw new Error("Enter an adjustment reference.");
        }
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Unable to complete the inventory operation.",
        );
      }

      const message =
        result.message || "Inventory operation completed successfully.";

      setSuccessMessage(message);
      setForm(emptyForm);

      // Refresh stock and ledger
      await fetchInventory();
    } catch (err) {
      console.error("Inventory operation error:", err);
      setFormError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // Only raw materials and packaging can be selected for purchases/adjustments
  const materialItems = stockItems.filter(
  (item) =>
    item.category === "Raw Material" ||
    item.category === "Packaging",
);

const finishedGoodItem = stockItems.find(
  (item) => item.sku === "MUR-200",
);

const adjustmentItems = [
  ...materialItems,
  finishedGoodItem || {
    sku: "MUR-200",
    name: "Murukku 200g",
    category: "Finished Goods",
    quantity: 0,
    unit: "packet",
  },
];
  const filteredItems = stockItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === "All" || item.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-8 p-5 sm:p-7 xl:p-9">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-blue-400">Inventory</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">
            Inventory Management
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Track raw materials, packaging, finished goods and stock movements.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07]"
          >
            <Download size={16} />
            Export / Print
          </button>

          <button
            onClick={() => openModal("material")}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07]"
          >
            <Plus size={17} />
            Add Material
          </button>

          <button
            onClick={() => openModal("purchase")}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
          >
            <ShoppingCart size={17} />
            Record Purchase
          </button>

          <button
            onClick={() => openModal("adjustment")}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07]"
          >
            <SlidersHorizontal size={16} />
            Adjustment
          </button>

          <button
            onClick={fetchInventory}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {/* Loading and error messages */}
      {loading && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
          Loading live inventory data from the backend...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
          <button
            onClick={fetchInventory}
            className="ml-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Tracked Items"
          value={summary.tracked_items}
          detail="Across all categories"
          icon={Boxes}
          color="blue"
        />

        <SummaryCard
          title="Raw Materials"
          value={summary.raw_materials}
          detail="Flour, oil and spice"
          icon={Package}
          color="violet"
        />

        <SummaryCard
          title="Packaging Items"
          value={summary.packaging_items}
          detail="Pouches and cartons"
          icon={ClipboardList}
          color="amber"
        />

        <SummaryCard
          title="Finished Goods"
          value={summary.finished_goods_quantity}
          detail="Murukku 200g packets"
          icon={ArrowUpRight}
          color="emerald"
        />
      </section>
      {/* Low stock alerts */}
      <section className="rounded-2xl border border-amber-500/20 bg-[#101a2c] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Inventory Stock Alerts</h3>
            <p className="mt-1 text-xs text-slate-500">
              Materials at or below their minimum stock level
            </p>
          </div>

          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              lowStockAlerts.length > 0
                ? "bg-amber-500/10 text-amber-400"
                : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {lowStockAlerts.length} Alerts
          </span>
        </div>

        {lowStockAlerts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {lowStockAlerts.map((alert) => (
              <div
                key={alert.sku}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
              >
                <div>
                  <p className="font-medium text-white">{alert.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {alert.sku}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Available: {alert.available_quantity}{" "}
                    {getDisplayUnit(alert.unit)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Minimum: {alert.minimum_stock} {getDisplayUnit(alert.unit)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                    alert.status === "OUT_OF_STOCK"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {alert.status === "OUT_OF_STOCK"
                    ? "Out of Stock"
                    : "Low Stock"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-emerald-500/5 p-4 text-sm text-emerald-400">
            All materials are above their minimum stock levels.
          </p>
        )}
      </section>

      {/* Stock table */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101a2c]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h3 className="font-semibold text-white">Current Stock</h3>
            <p className="mt-1 text-xs text-slate-500">
              Live available quantity from PostgreSQL
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1424] px-3 py-2">
              <Search size={16} className="text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item or SKU..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:w-48"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1424] px-3 py-2">
              <Filter size={15} className="text-slate-500" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-transparent text-sm text-slate-300 outline-none"
              >
                <option className="bg-[#101a2c]" value="All">
                  All Categories
                </option>
                <option className="bg-[#101a2c]" value="Raw Material">
                  Raw Materials
                </option>
                <option className="bg-[#101a2c]" value="Packaging">
                  Packaging
                </option>
                <option className="bg-[#101a2c]" value="Finished Goods">
                  Finished Goods
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.025] text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Available Stock</th>
                <th className="px-6 py-4 font-medium">Unit Cost</th>
                <th className="px-6 py-4 text-right font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.sku}
                  className="border-t border-white/[0.05] transition hover:bg-white/[0.025]"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-lg">
                        {getItemIcon(item.sku)}
                      </div>
                      <span className="font-medium text-white">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5 font-mono text-xs text-slate-400">
                    {item.sku}
                  </td>

                  <td className="px-6 py-5">
                    <span className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-xs text-slate-300">
                      {item.category}
                    </span>
                  </td>

                  <td className="px-6 py-5 font-semibold text-white">
                    {Number(item.quantity).toLocaleString("en-IN")}{" "}
                    {getDisplayUnit(item.unit)}
                  </td>

                  <td className="px-6 py-5 text-slate-400">
                    {getDisplayCost(item)}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() =>
                        alert(
                          `${item.name}\nSKU: ${item.sku}\nStock: ${item.quantity} ${item.unit}\nUnit cost: ${getDisplayCost(item)}`,
                        )
                      }
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                      aria-label={`View ${item.name} details`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No inventory items match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/[0.07] px-6 py-4 text-xs text-slate-500">
          Showing {filteredItems.length} of {stockItems.length} tracked items
        </div>
      </section>

      {/* Stock movement ledger */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101a2c]">
        <div className="flex items-center justify-between border-b border-white/[0.07] p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-white">Recent Stock Movements</h3>
            <p className="mt-1 text-xs text-slate-500">
              Live inventory transaction history
            </p>
          </div>

          <span className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
            {movements.length} transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-white/[0.025] text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Movement Type</th>
                <th className="px-6 py-4 font-medium">Direction</th>
                <th className="px-6 py-4 font-medium">Quantity</th>
              </tr>
            </thead>

            <tbody>
              {movements.map((movement, index) => (
                <tr
                  key={`${movement.reference}-${movement.item}-${index}`}
                  className="border-t border-white/[0.05] hover:bg-white/[0.025]"
                >
                  <td className="px-6 py-4 font-mono text-xs text-blue-400">
                    {movement.reference}
                  </td>

                  <td className="px-6 py-4 font-medium text-white">
                    {movement.item}
                  </td>

                  <td className="px-6 py-4 text-slate-400">{movement.type}</td>

                  <td className="px-6 py-4">
                    {movement.direction === "IN" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400">
                        <ArrowDownRight size={14} />
                        Stock In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400">
                        <ArrowUpRight size={14} />
                        Stock Out
                      </span>
                    )}
                  </td>

                  <td
                    className={`px-6 py-4 font-semibold ${
                      movement.direction === "IN"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {movement.direction === "IN" ? "+" : "-"}
                    {movement.quantity}
                  </td>
                </tr>
              ))}

              {!loading && movements.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No stock movements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-[11px] text-slate-600">
        * ₹19.15 is the currently calculated partial production cost per packet.
        Some material costs are not yet recorded.
      </p>

      {/* Inventory operation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#101a2c] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Inventory Operations
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Manage materials and stock transactions
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Operation tabs */}
            <div className="grid grid-cols-3 gap-2 border-b border-white/[0.07] p-4">
              <ActionTab
                active={activeAction === "material"}
                onClick={() => openModal("material")}
              >
                <Plus size={15} />
                Add Material
              </ActionTab>

              <ActionTab
                active={activeAction === "purchase"}
                onClick={() => openModal("purchase")}
              >
                <ShoppingCart size={15} />
                Purchase
              </ActionTab>

              <ActionTab
                active={activeAction === "adjustment"}
                onClick={() => openModal("adjustment")}
              >
                <SlidersHorizontal size={15} />
                Adjustment
              </ActionTab>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
              {activeAction === "material" && (
                <>
                  <FormField label="Material SKU">
                    <input
                      required
                      value={form.sku}
                      onChange={(e) => updateForm("sku", e.target.value)}
                      placeholder="Example: RAW-FLOUR"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Unit">
                    <select
                      value={form.unit}
                      onChange={(e) => updateForm("unit", e.target.value)}
                      className="form-input"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="litre">Litre</option>
                      <option value="piece">Piece</option>
                      <option value="packet">Packet</option>
                    </select>
                  </FormField>

                  <FormField label="Initial Unit Cost (₹)">
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.unit_cost}
                      onChange={(e) => updateForm("unit_cost", e.target.value)}
                      placeholder="Enter unit cost"
                      className="form-input"
                    />
                  </FormField>
                </>
              )}

              {activeAction === "purchase" && (
                <>
                  <FormField label="Select Material">
                    <select
                      required
                      value={form.sku}
                      onChange={(e) => updateForm("sku", e.target.value)}
                      className="form-input"
                    >
                      <option value="">Choose a material</option>
                      {materialItems.map((item) => (
  <option key={item.sku} value={item.sku}>
    {item.name} ({item.sku}) — {item.quantity} {item.unit}
  </option>
))}
                    </select>
                  </FormField>

                  <FormField label="Quantity Purchased">
                    <input
                      required
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.quantity}
                      onChange={(e) => updateForm("quantity", e.target.value)}
                      placeholder="Enter quantity"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Unit Cost (₹)">
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.unit_cost}
                      onChange={(e) => updateForm("unit_cost", e.target.value)}
                      placeholder="Enter cost per unit"
                      className="form-input"
                    />
                  </FormField>

                  {form.quantity && form.unit_cost && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                      <p className="text-xs text-slate-400">Purchase Value</p>
                      <p className="mt-1 text-xl font-bold text-blue-400">
                        ₹
                        {(
                          Number(form.quantity) * Number(form.unit_cost)
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}

                  <FormField label="Purchase Reference">
                    <input
                      required
                      value={form.reference}
                      onChange={(e) => updateForm("reference", e.target.value)}
                      placeholder="Example: PUR-002"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Notes (Optional)">
                    <textarea
                      rows="2"
                      value={form.notes}
                      onChange={(e) => updateForm("notes", e.target.value)}
                      placeholder="Additional purchase details"
                      className="form-input resize-none"
                    />
                  </FormField>
                </>
              )}

              {activeAction === "adjustment" && (
                <>
                  <FormField label="Select Inventory Item">
                    <select
                      required
                      value={form.sku}
                      onChange={(e) => updateForm("sku", e.target.value)}
                      className="form-input"
                    >
                      <option value="">Choose an inventory item</option>
                      {adjustmentItems.map((item) => (
                        <option key={item.sku} value={item.sku}>
                          {item.name} ({item.sku}) — {item.quantity} {item.unit}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Adjustment Direction">
                    <select
                      value={form.direction}
                      onChange={(e) => updateForm("direction", e.target.value)}
                      className="form-input"
                    >
                      <option value="IN">Stock In — Increase stock</option>
                      <option value="OUT">Stock Out — Decrease stock</option>
                    </select>
                  </FormField>

                  <FormField label="Quantity">
                    <input
                      required
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.quantity}
                      onChange={(e) => updateForm("quantity", e.target.value)}
                      placeholder="Enter adjustment quantity"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Adjustment Reference">
                    <input
                      required
                      value={form.reference}
                      onChange={(e) => updateForm("reference", e.target.value)}
                      placeholder="Example: ADJ-002"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Notes (Optional)">
                    <textarea
                      rows="2"
                      value={form.notes}
                      onChange={(e) => updateForm("notes", e.target.value)}
                      placeholder="Reason for stock adjustment"
                      className="form-input resize-none"
                    />
                  </FormField>

                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                    Stock cannot be reduced below zero. The backend validates
                    the available quantity before recording an OUT adjustment.
                  </p>
                </>
              )}

              {/* API messages */}
              {formError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                  {successMessage}
                  <p className="mt-1 text-xs text-emerald-400">
                    Inventory data has been refreshed.
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && (
                    <RefreshCw size={15} className="animate-spin" />
                  )}
                  {submitting ? "Processing..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function ActionTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-xs font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ title, value, detail, icon: Icon, color }) {
  const colorStyles = {
    blue: "bg-blue-500/10 text-blue-400",
    violet: "bg-violet-500/10 text-violet-400",
    amber: "bg-amber-500/10 text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#101a2c] p-6 transition hover:border-blue-500/20">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorStyles[color]}`}
        >
          <Icon size={21} />
        </div>
        <MoreHorizontal size={19} className="text-slate-600" />
      </div>

      <p className="mt-5 text-sm text-slate-400">{title}</p>
      <h3 className="mt-1 text-3xl font-bold tracking-tight text-white">
        {value}
      </h3>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default Inventory;
