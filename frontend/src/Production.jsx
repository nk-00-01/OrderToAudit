
import { useCallback, useEffect, useState } from "react";
import {
  Factory,
  Package,
  IndianRupee,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  ClipboardList,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

const MATERIALS = [
  { sku: "RAW-FLOUR", name: "Flour", unit: "kg" },
  { sku: "RAW-OIL", name: "Oil", unit: "litres" },
  { sku: "RAW-SPICE", name: "Spice", unit: "kg" },
  { sku: "PKG-POUCH", name: "Packaging Pouch", unit: "pieces" },
  { sku: "PKG-CARTON", name: "Carton", unit: "pieces" },
];

const emptyMaterials = () =>
  MATERIALS.map((material) => ({
    ...material,
    quantity: "",
  }));

const emptyExpense = () => ({
  reference: "",
  expense_type: "",
  amount: "",
  notes: "",
});

function Production({ token }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    batch_number: "",
    product_sku: "MUR-200",
    planned_output: "",
    actual_good_output: "",
    damaged_pouches: "",
  });

  const [materials, setMaterials] = useState(emptyMaterials());
  const [expenses, setExpenses] = useState([emptyExpense()]);

  const fetchProduction = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/production/batches`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to fetch production data.");
      }

      const data = await response.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not connect to the production API.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProduction();
  }, [fetchProduction]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateMaterial = (index, value) => {
    setMaterials((previous) =>
      previous.map((material, i) =>
        i === index ? { ...material, quantity: value } : material
      )
    );
  };

  const updateExpense = (index, field, value) => {
    setExpenses((previous) =>
      previous.map((expense, i) =>
        i === index ? { ...expense, [field]: value } : expense
      )
    );
  };

  const resetForm = () => {
    setForm({
      batch_number: "",
      product_sku: "MUR-200",
      planned_output: "",
      actual_good_output: "",
      damaged_pouches: "",
    });
    setMaterials(emptyMaterials());
    setExpenses([emptyExpense()]);
  };

  const submitProduction = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const planned = Number(form.planned_output);
    const actual = Number(form.actual_good_output);
    const damaged = Number(form.damaged_pouches);

    if (!form.batch_number.trim()) {
      setError("Please enter a batch number.");
      return;
    }

    if (
      !Number.isInteger(planned) ||
      !Number.isInteger(actual) ||
      !Number.isInteger(damaged) ||
      planned <= 0 ||
      actual <= 0 ||
      damaged < 0
    ) {
      setError("Enter valid whole-number production quantities.");
      return;
    }

    if (actual + damaged > planned) {
      setError("Good output plus damaged pouches cannot exceed planned output.");
      return;
    }

    const invalidMaterial = materials.find(
      (material) =>
        material.quantity === "" ||
        !Number.isFinite(Number(material.quantity)) ||
        Number(material.quantity) <= 0
    );

    if (invalidMaterial) {
      setError(`Enter a valid quantity for ${invalidMaterial.name}.`);
      return;
    }

    const enteredExpenses = expenses.filter(
      (expense) =>
        expense.reference.trim() ||
        expense.expense_type.trim() ||
        expense.amount !== "" ||
        expense.notes.trim()
    );

    for (const expense of enteredExpenses) {
      if (
        !expense.reference.trim() ||
        !expense.expense_type.trim() ||
        expense.amount === "" ||
        !Number.isFinite(Number(expense.amount)) ||
        Number(expense.amount) <= 0
      ) {
        setError("Complete the reference, expense type and positive amount for each expense.");
        return;
      }
    }

    const payload = {
      batch_number: form.batch_number.trim(),
      product_sku: form.product_sku,
      planned_output: planned,
      actual_good_output: actual,
      damaged_pouches: damaged,
      materials: materials.map((material) => ({
        sku: material.sku,
        quantity: Number(material.quantity),
      })),
      expenses: enteredExpenses.map((expense) => ({
        reference: expense.reference.trim(),
        expense_type: expense.expense_type.trim(),
        amount: Number(expense.amount),
        notes: expense.notes.trim(),
      })),
    };

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/production/batches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Production batch could not be recorded."
        );
      }

      setSuccess(
        `Production batch ${data.batch_number} recorded successfully.`
      );

      resetForm();
      setShowForm(false);
      await fetchProduction();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not record production batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPlanned = batches.reduce(
    (sum, batch) => sum + Number(batch.planned_output || 0),
    0
  );

  const totalActual = batches.reduce(
    (sum, batch) => sum + Number(batch.actual_good_output || 0),
    0
  );

  const totalExpenses = batches.reduce(
    (sum, batch) => sum + Number(batch.expenses || 0),
    0
  );

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-8 p-5 sm:p-7 xl:p-9">

      {/* Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 text-xs text-slate-500">
            Workspace / <span className="text-blue-400">Production</span>
          </div>

          <h2 className="text-2xl font-bold text-white sm:text-[28px]">
            Production Management
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Monitor production batches, output, material usage and expenses.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchProduction}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.07] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={() => {
              setShowForm((previous) => !previous);
              setError("");
              setSuccess("");
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? "Close Form" : "Create Production Batch"}
          </button>
        </div>
      </section>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle2 size={19} />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {/* Create Production Form */}
      {showForm && (
        <form
          onSubmit={submitProduction}
          className="space-y-7 rounded-2xl border border-blue-500/20 bg-[#101a2c] p-5 sm:p-7"
        >
          <div>
            <div className="flex items-center gap-2">
              <Factory className="text-blue-400" size={21} />
              <h3 className="text-xl font-bold text-white">
                Create Production Batch
              </h3>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Enter the production details and actual materials consumed.
            </p>
          </div>

          {/* Basic details */}
          <div>
            <h4 className="mb-4 font-semibold text-white">Batch Details</h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Batch Number">
                <input
                  required
                  value={form.batch_number}
                  onChange={(e) => updateForm("batch_number", e.target.value)}
                  placeholder="Example: PROD-003"
                  className="form-input"
                />
              </FormField>

              <FormField label="Product">
                <select
                  value={form.product_sku}
                  onChange={(e) => updateForm("product_sku", e.target.value)}
                  className="form-input"
                >
                  <option value="MUR-200">Murukku 200g (MUR-200)</option>
                </select>
              </FormField>

              <FormField label="Planned Output (packets)">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.planned_output}
                  onChange={(e) => updateForm("planned_output", e.target.value)}
                  placeholder="Example: 200"
                  className="form-input"
                />
              </FormField>

              <FormField label="Actual Good Output">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.actual_good_output}
                  onChange={(e) =>
                    updateForm("actual_good_output", e.target.value)
                  }
                  placeholder="Example: 188"
                  className="form-input"
                />
              </FormField>

              <FormField label="Damaged Pouches">
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.damaged_pouches}
                  onChange={(e) =>
                    updateForm("damaged_pouches", e.target.value)
                  }
                  placeholder="Example: 6"
                  className="form-input"
                />
              </FormField>
            </div>
          </div>

          {/* Material consumption */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Package size={19} className="text-blue-400" />
              <h4 className="font-semibold text-white">
                Actual Material Consumption
              </h4>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Actual Quantity</th>
                  </tr>
                </thead>

                <tbody>
                  {materials.map((material, index) => (
                    <tr
                      key={material.sku}
                      className="border-t border-white/[0.06]"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {material.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {material.sku}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {material.unit}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          required
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={material.quantity}
                          onChange={(e) =>
                            updateMaterial(index, e.target.value)
                          }
                          placeholder="Enter quantity"
                          className="form-input min-w-[150px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Enter the actual quantities consumed for this batch. These
              quantities will be deducted from inventory.
            </p>
          </div>

          {/* Expenses */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IndianRupee size={19} className="text-amber-400" />
                <h4 className="font-semibold text-white">
                  Production Expenses
                </h4>
              </div>

              <button
                type="button"
                onClick={() =>
                  setExpenses((previous) => [...previous, emptyExpense()])
                }
                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-blue-300 hover:bg-white/[0.05]"
              >
                <Plus size={14} />
                Add Expense
              </button>
            </div>

            <div className="space-y-4">
              {expenses.map((expense, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <FormField label="Reference">
                    <input
                      value={expense.reference}
                      onChange={(e) =>
                        updateExpense(index, "reference", e.target.value)
                      }
                      placeholder="EXP-PROD-003-LAB"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Expense Type">
                    <input
                      value={expense.expense_type}
                      onChange={(e) =>
                        updateExpense(index, "expense_type", e.target.value)
                      }
                      placeholder="Labour / Power"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Amount (₹)">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={expense.amount}
                      onChange={(e) =>
                        updateExpense(index, "amount", e.target.value)
                      }
                      placeholder="Example: 120"
                      className="form-input"
                    />
                  </FormField>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <FormField label="Notes">
                        <input
                          value={expense.notes}
                          onChange={(e) =>
                            updateExpense(index, "notes", e.target.value)
                          }
                          placeholder="Optional notes"
                          className="form-input"
                        />
                      </FormField>
                    </div>

                    {expenses.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpenses((previous) =>
                            previous.filter((_, i) => i !== index)
                          )
                        }
                        className="mb-1 rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10"
                        title="Remove expense"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Leave an expense row completely empty if you do not want to
              record that expense.
            </p>
          </div>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
                setError("");
              }}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/[0.05]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={17} />
              )}
              {submitting ? "Recording Batch..." : "Record Production Batch"}
            </button>
          </div>
        </form>
      )}

      {loading && (
        <p className="rounded-xl bg-blue-500/10 p-4 text-sm text-blue-300">
          Loading production data...
        </p>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Production Batches"
          value={batches.length}
          detail="Recorded batches"
          icon={Factory}
          color="blue"
        />

        <SummaryCard
          title="Planned Output"
          value={totalPlanned}
          detail="Total planned packets"
          icon={Package}
          color="violet"
        />

        <SummaryCard
          title="Actual Good Output"
          value={totalActual}
          detail="Successfully produced"
          icon={CheckCircle2}
          color="emerald"
        />

        <SummaryCard
          title="Production Expenses"
          value={`₹${totalExpenses.toLocaleString("en-IN")}`}
          detail="Recorded batch expenses"
          icon={IndianRupee}
          color="amber"
        />
      </section>

      {/* Batch details */}
      {batches.map((batch) => (
        <section
          key={batch.batch_number}
          className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#101a2c] p-5 sm:p-7"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-xs text-blue-400">
                {batch.batch_number}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                {batch.product}
              </h3>
            </div>

            <span className="flex w-fit items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 size={14} />
              {batch.status}
            </span>
          </div>

          {/* Output metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric
              label="Planned Output"
              value={`${batch.planned_output} packets`}
            />

            <Metric
              label="Actual Good Output"
              value={`${batch.actual_good_output} packets`}
            />

            <Metric
              label="Yield Variance"
              value={`${Number(batch.yield_variance_percent || 0).toFixed(2)}%`}
              negative={Number(batch.yield_variance_percent || 0) < 0}
            />
          </div>

          {/* Material consumption */}
          <div>
            <h4 className="mb-4 font-semibold text-white">
              Material Consumption
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">Standard</th>
                    <th className="px-4 py-3">Actual</th>
                    <th className="px-4 py-3">Variance</th>
                    <th className="px-4 py-3">Variance %</th>
                  </tr>
                </thead>

                <tbody>
                  {(batch.materials || []).map((material) => (
                    <tr
                      key={material.material}
                      className="border-t border-white/[0.05]"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        {material.material}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {material.standard_usage} {material.unit}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {material.actual_usage} {material.unit}
                      </td>

                      <td
                        className={`px-4 py-4 font-semibold ${
                          Number(material.variance) > 0
                            ? "text-amber-400"
                            : Number(material.variance) < 0
                              ? "text-emerald-400"
                              : "text-slate-300"
                        }`}
                      >
                        {Number(material.variance) > 0 ? "+" : ""}
                        {Number(material.variance || 0).toFixed(3)}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {Number(material.variance_percent || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses and damaged pouches */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <IndianRupee size={17} />
                <span className="text-sm">Recorded Expenses</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                ₹{Number(batch.expenses || 0).toLocaleString("en-IN")}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <AlertCircle size={17} />
                <span className="text-sm">Damaged Pouches</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                {batch.damaged_pouches}
              </p>
            </div>
          </div>
        </section>
      ))}

      {!loading && !error && batches.length === 0 && (
        <div className="rounded-xl border border-white/10 p-8 text-center text-slate-400">
          <ClipboardList size={30} className="mx-auto mb-3 opacity-60" />
          No production batches found. Create your first batch.
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ title, value, detail, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400",
    violet: "bg-violet-500/10 text-violet-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#101a2c] p-6">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}
      >
        <Icon size={21} />
      </div>

      <p className="mt-5 text-sm text-slate-400">{title}</p>
      <h3 className="mt-1 text-3xl font-bold text-white">{value}</h3>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Metric({ label, value, negative }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-2 text-xl font-bold ${
          negative ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default Production;
