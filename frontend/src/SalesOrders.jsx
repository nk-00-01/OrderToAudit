import { useEffect, useState } from "react";

const API_URL = "https://ordertoaudit-backend.onrender.com";

export default function SalesOrders({ token }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    order_number: "",
    customer_id: "",
    product_sku: "MUR-200",
    quantity: "",
  });

  async function fetchOrders() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/sales/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load sales orders.");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOptions() {
    try {
      const response = await fetch(`${API_URL}/sales/order-options`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load customers and products.");
      }

      const data = await response.json();

      setCustomers(data.customers || []);
      setProducts(data.products || []);

      setForm((previous) => ({
        ...previous,
        customer_id:
          previous.customer_id || String(data.customers?.[0]?.id || ""),
        product_sku: data.products?.some(
          (product) => product.sku === previous.product_sku,
        )
          ? previous.product_sku
          : data.products?.[0]?.sku || "",
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchOptions();
    }
  }, [token]);

  const selectedProduct = products.find(
    (product) => product.sku === form.product_sku,
  );

  async function handleCreateOrder(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.customer_id || !form.product_sku) {
      setError("Please select a customer and product.");
      return;
    }

    if (!form.order_number.trim() || Number(form.quantity) <= 0) {
      setError("Enter a valid order number and quantity.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/sales/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_number: form.order_number.trim(),
          customer_id: Number(form.customer_id),
          product_sku: form.product_sku,
          quantity: Number(form.quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create order.");
      }

      setSuccess(`Order ${data.order_number} created successfully.`);

      setForm({
        order_number: "",
        customer_id: form.customer_id,
        product_sku: form.product_sku,
        quantity: "",
      });

      setShowForm(false);
      await fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.toLowerCase().includes(search.toLowerCase()) ||
      order.product?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalOrders = orders.length;
  const dispatched = orders.filter(
    (order) => order.status === "DISPATCHED",
  ).length;
  const pending = orders.filter((order) => order.status === "PENDING").length;
  const totalShortage = orders.reduce(
    (sum, order) => sum + Number(order.shortage || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Orders</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage customer orders and stock availability.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm(!showForm);
          }}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Close Form" : "+ Create Order"}
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-green-700 bg-green-900/30 p-3 text-green-300">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreateOrder}
          className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6"
        >
          <h2 className="text-lg font-semibold text-white">
            Create New Sales Order
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Order Number
              </label>
              <input
                className="form-input"
                placeholder="Example: ORD-005"
                value={form.order_number}
                onChange={(e) =>
                  setForm({ ...form, order_number: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Customer
              </label>
              <select
                className="form-input"
                value={form.customer_id}
                onChange={(e) =>
                  setForm({ ...form, customer_id: e.target.value })
                }
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} — {customer.customer_type} ({customer.state}
                    )
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Product
              </label>
              <select
                className="form-input"
                value={form.product_sku}
                onChange={(e) =>
                  setForm({ ...form, product_sku: e.target.value })
                }
                required
              >
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product.sku} value={product.sku}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-input"
                placeholder="Enter quantity"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          {selectedProduct && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
              <p className="text-sm text-gray-400">Selected product price</p>
              <p className="mt-1 text-lg font-semibold text-white">
                ₹{selectedProduct.selling_price} / {selectedProduct.unit}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || customers.length === 0 || products.length === 0}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Sales Order"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Orders" value={totalOrders} />
        <SummaryCard title="Dispatched" value={dispatched} />
        <SummaryCard title="Pending" value={pending} />
        <SummaryCard title="Total Shortage" value={totalShortage} />
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="form-input min-w-[220px] flex-1"
          placeholder="Search order, customer or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="form-input w-full sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="DISPATCHED">Dispatched</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Product</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Available</th>
              <th className="p-4">Shortage</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800 text-gray-300">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-6 text-center">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500">
                  No sales orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.order_number} className="hover:bg-gray-800/60">
                  <td className="p-4 font-semibold text-white">
                    {order.order_number}
                  </td>
                  <td className="p-4">{order.customer}</td>
                  <td className="p-4">{order.product}</td>
                  <td className="p-4">{order.quantity}</td>
                  <td className="p-4">{order.available_quantity}</td>
                  <td className="p-4">{order.shortage}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === "DISPATCHED"
                          ? "bg-green-900/40 text-green-300"
                          : "bg-yellow-900/40 text-yellow-300"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
