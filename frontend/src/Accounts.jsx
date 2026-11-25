
import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  Clock,
  Receipt,
  Calculator,
  RefreshCw,
  Search,
  ArrowDownLeft,
  Factory,
  PlusCircle,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

export default function Accounts({ token }) {
  const [data, setData] = useState({
    summary: {},
    payments: [],
    expenses: [],
  });

  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    invoice_number: "",
    amount: "",
    payment_method: "UPI",
    reference_number: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const fetchAccounts = useCallback(async () => {
    if (!token) {
      setError("Authentication token is missing. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/accounts/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API Error: ${response.status}`
        );
      }

      const result = await response.json();

      setData({
        summary: result.summary || {},
        payments: result.payments || [],
        expenses: result.expenses || [],
      });
    } catch (error) {
      console.error("Accounts fetch error:", error);
      setError(error.message || "Unable to load account records.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // FETCH INVOICES FOR PAYMENT SELECTION
  const fetchInvoices = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/sales/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load invoices for payment.");
      }

      const result = await response.json();
      setInvoices(result.invoices || []);
    } catch (error) {
      console.error("Invoice fetch error:", error);
      setPaymentError(error.message);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAccounts();
      fetchInvoices();
    }
  }, [token, fetchAccounts, fetchInvoices]);

  const summary = data.summary || {};

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const selectedInvoice = invoices.find(
    (invoice) =>
      invoice.invoice_number === paymentForm.invoice_number
  );

  const outstanding = Number(
    selectedInvoice?.outstanding_amount || 0
  );

  const filteredPayments = (data.payments || []).filter((payment) =>
    `${payment.reference || ""} ${payment.customer || ""} ${payment.invoice_number || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredExpenses = (data.expenses || []).filter((expense) =>
    `${expense.reference || ""} ${expense.expense_type || ""} ${expense.notes || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function handlePaymentChange(event) {
    const { name, value } = event.target;

    setPaymentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // RECORD CUSTOMER PAYMENT
  async function handleRecordPayment(event) {
    event.preventDefault();

    setPaymentMessage("");
    setPaymentError("");

    if (!paymentForm.invoice_number) {
      setPaymentError("Please select an invoice.");
      return;
    }

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    if (amount > outstanding) {
      setPaymentError(
        `Payment cannot exceed the outstanding amount of ${formatCurrency(outstanding)}.`
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/accounts/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoice_number: paymentForm.invoice_number,
          amount: amount.toFixed(2),
          payment_method: paymentForm.payment_method,
          reference_number:
            paymentForm.reference_number.trim() || null,
          notes: paymentForm.notes.trim() || null,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to record payment."
        );
      }

      setPaymentMessage(
        `Payment of ${formatCurrency(result.payment_amount)} recorded successfully for ${result.invoice_number}.`
      );

      setPaymentForm({
        invoice_number: "",
        amount: "",
        payment_method: "UPI",
        reference_number: "",
        notes: "",
      });

      // Refresh all account and invoice information
      await Promise.all([
        fetchAccounts(),
        fetchInvoices(),
      ]);

    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Accounts Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitor payments, expenses and outstanding receivables
          </p>
        </div>

        <button
          onClick={() =>
            Promise.all([fetchAccounts(), fetchInvoices()])
          }
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <SummaryCard
          title="Payments Received"
          value={formatCurrency(summary.total_payments)}
          icon={<Wallet size={20} />}
          color="green"
        />

        <SummaryCard
          title="Outstanding"
          value={formatCurrency(summary.total_outstanding)}
          icon={<Clock size={20} />}
          color="yellow"
        />

        <SummaryCard
          title="Production Expenses"
          value={formatCurrency(summary.production_expenses)}
          icon={<Factory size={20} />}
          color="blue"
        />

        <SummaryCard
          title="Recorded Transactions"
          value={summary.total_transactions ?? 0}
          icon={<Calculator size={20} />}
          color="purple"
        />

      </div>

      {/* RECORD PAYMENT */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="text-emerald-400" size={20} />
            <h3 className="text-white font-semibold">
              Record Customer Payment
            </h3>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Record payments against issued GST invoices
          </p>
        </div>

        <form
          onSubmit={handleRecordPayment}
          className="p-5 space-y-5"
        >

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* INVOICE */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Select Invoice *
              </label>

              <select
                name="invoice_number"
                value={paymentForm.invoice_number}
                onChange={handlePaymentChange}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="">Choose an invoice</option>

                {invoices
                  .filter(
                    (invoice) =>
                      Number(invoice.outstanding_amount) > 0
                  )
                  .map((invoice) => (
                    <option
                      key={invoice.invoice_number}
                      value={invoice.invoice_number}
                    >
                      {invoice.invoice_number} — {invoice.customer} — Outstanding: ₹
                      {Number(invoice.outstanding_amount).toFixed(2)}
                    </option>
                  ))}
              </select>
            </div>

            {/* AMOUNT */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Payment Amount *
              </label>

              <div className="relative">
                <IndianRupee
                  size={17}
                  className="absolute left-3 top-3.5 text-slate-400"
                />

                <input
                  type="number"
                  name="amount"
                  value={paymentForm.amount}
                  onChange={handlePaymentChange}
                  min="0.01"
                  max={outstanding || undefined}
                  step="0.01"
                  required
                  placeholder="Enter payment amount"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* PAYMENT METHOD */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Payment Method *
              </label>

              <select
                name="payment_method"
                value={paymentForm.payment_method}
                onChange={handlePaymentChange}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* REFERENCE */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Transaction Reference
              </label>

              <input
                type="text"
                name="reference_number"
                value={paymentForm.reference_number}
                onChange={handlePaymentChange}
                placeholder="Enter transaction reference"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

          </div>

          {/* NOTES */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Notes
            </label>

            <textarea
              name="notes"
              value={paymentForm.notes}
              onChange={handlePaymentChange}
              rows="2"
              placeholder="Optional payment notes..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* OUTSTANDING */}
          {selectedInvoice && (
            <div className="rounded-lg bg-slate-800/70 border border-slate-700 p-4 flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">
                  Selected Invoice
                </p>
                <p className="text-white font-medium mt-1">
                  {selectedInvoice.invoice_number}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Outstanding Balance
                </p>
                <p className="text-amber-400 font-semibold mt-1">
                  {formatCurrency(outstanding)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Balance After This Payment
                </p>
                <p className="text-emerald-400 font-semibold mt-1">
                  {formatCurrency(
                    Math.max(
                      0,
                      outstanding - Number(paymentForm.amount || 0)
                    )
                  )}
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {paymentMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 size={17} />
              {paymentMessage}
            </div>
          )}

          {/* ERROR MESSAGE */}
          {paymentError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {paymentError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !invoices.length}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium"
          >
            {submitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Recording Payment...
              </>
            ) : (
              <>
                <PlusCircle size={17} />
                Record Payment
              </>
            )}
          </button>

        </form>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search
          size={17}
          className="absolute left-3 top-3 text-slate-500"
        />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search payment or expense records..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400">
          Loading account records...
        </div>
      ) : error ? (
        <div className="p-10 text-center text-red-400">
          {error}
          <button
            onClick={fetchAccounts}
            className="block mx-auto mt-4 text-blue-400 hover:text-blue-300"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* PAYMENT HISTORY */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">

            <div className="p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="text-emerald-400" size={19} />
                <h3 className="text-white font-semibold">
                  Payment History
                </h3>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Customer payments received
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-slate-400 bg-slate-800/60">
                  <tr>
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Method</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-4 text-blue-400">
                        {payment.reference}
                      </td>

                      <td className="px-5 py-4 text-white">
                        {payment.customer}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {payment.invoice_number}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {payment.payment_method}
                      </td>

                      <td className="px-5 py-4 text-emerald-400 font-medium">
                        {formatCurrency(payment.amount)}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {payment.created_at
                          ? new Date(payment.created_at).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400">
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* EXPENSE RECORDS */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">

            <div className="p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="text-blue-400" size={19} />
                <h3 className="text-white font-semibold">
                  Expense Records
                </h3>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Recorded business and production expenses
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-slate-400 bg-slate-800/60">
                  <tr>
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">Expense Type</th>
                    <th className="px-5 py-4">Notes</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-4 text-blue-400">
                        {expense.reference}
                      </td>

                      <td className="px-5 py-4 text-white">
                        {expense.expense_type}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {expense.notes || "—"}
                      </td>

                      <td className="px-5 py-4 text-amber-400 font-medium">
                        {formatCurrency(expense.amount)}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {expense.created_at
                          ? new Date(expense.created_at).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400">
                        No expense records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon, color }) {
  const colors = {
    green: "bg-emerald-500/10 text-emerald-400",
    yellow: "bg-amber-500/10 text-amber-400",
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>

      <p className="text-sm text-slate-400 mt-4">{title}</p>
      <h3 className="text-xl font-bold text-white mt-1">{value}</h3>
    </div>
  );
}
