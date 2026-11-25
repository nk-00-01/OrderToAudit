
import { useEffect, useState } from "react";
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  Clock,
  Search,
  Receipt,
  Download,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

export default function Invoices({ token }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState("");
  const [downloadError, setDownloadError] = useState("");

  async function fetchInvoices() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/sales/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to fetch invoices");
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchInvoices();
    }
  }, [token]);

  // DOWNLOAD INVOICE PDF
  async function downloadInvoice(invoiceNumber) {
    try {
      setDownloadingInvoice(invoiceNumber);
      setDownloadError("");

      const response = await fetch(
        `${API_URL}/sales/invoices/${encodeURIComponent(invoiceNumber)}/pdf`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to download invoice PDF");
      }

      const blob = await response.blob();

      const fileURL = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = fileURL;
      link.download = `${invoiceNumber}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileURL);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloadingInvoice("");
    }
  }

  const filteredInvoices = invoices.filter((invoice) =>
    (invoice.invoice_number || "")
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    (invoice.customer || "")
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    (invoice.order_number || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalInvoiceValue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || 0),
    0
  );

  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.paid_amount || 0),
    0
  );

  const totalOutstanding = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.outstanding_amount || 0),
    0
  );

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Invoice Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage GST invoices, payments and outstanding balances
          </p>
        </div>

        <button
          onClick={fetchInvoices}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <SummaryCard
          title="Total Invoices"
          value={invoices.length}
          icon={<FileText size={20} />}
          color="blue"
        />

        <SummaryCard
          title="Invoice Value"
          value={formatCurrency(totalInvoiceValue)}
          icon={<Receipt size={20} />}
          color="purple"
        />

        <SummaryCard
          title="Amount Received"
          value={formatCurrency(totalPaid)}
          icon={<CheckCircle2 size={20} />}
          color="green"
        />

        <SummaryCard
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={<Clock size={20} />}
          color="yellow"
        />

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
          placeholder="Search invoice, order or customer..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>

      {/* DOWNLOAD ERROR */}
      {downloadError && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          {downloadError}
        </div>
      )}

      {/* INVOICE TABLE */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-5 border-b border-slate-800">
          <h3 className="text-white font-semibold">
            Invoice Records
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            GST and payment information from the database
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading invoices...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-400">
            {error}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">

              <thead className="text-xs uppercase text-slate-400 bg-slate-800/60">
                <tr>
                  <th className="px-5 py-4">Invoice</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Taxable</th>
                  <th className="px-5 py-4">GST</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Paid</th>
                  <th className="px-5 py-4">Outstanding</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredInvoices.map((invoice) => {
                  const gst =
                    Number(invoice.cgst_amount || 0) +
                    Number(invoice.sgst_amount || 0) +
                    Number(invoice.igst_amount || 0);

                  const isDownloading =
                    downloadingInvoice === invoice.invoice_number;

                  return (
                    <tr
                      key={invoice.invoice_number}
                      className="hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-medium text-blue-400">
                        {invoice.invoice_number}
                      </td>

                      <td className="px-5 py-4 text-white">
                        {invoice.customer}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {invoice.order_number}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {formatCurrency(invoice.taxable_amount)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {formatCurrency(gst)}
                      </td>

                      <td className="px-5 py-4 text-white font-medium">
                        {formatCurrency(invoice.total_amount)}
                      </td>

                      <td className="px-5 py-4 text-emerald-400">
                        {formatCurrency(invoice.paid_amount)}
                      </td>

                      <td className="px-5 py-4 text-amber-400">
                        {formatCurrency(invoice.outstanding_amount)}
                      </td>

                      <td className="px-5 py-4">
                        <InvoiceStatus
                          status={invoice.payment_status}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() =>
                            downloadInvoice(invoice.invoice_number)
                          }
                          disabled={!!downloadingInvoice}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition text-xs font-medium whitespace-nowrap"
                        >
                          {isDownloading ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download size={14} />
                              Download PDF
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    green: "bg-emerald-500/10 text-emerald-400",
    yellow: "bg-amber-500/10 text-amber-400",
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

function InvoiceStatus({ status }) {
  const paid = status === "PAID";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
        paid
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-amber-500/10 text-amber-400"
      }`}
    >
      {paid ? <CheckCircle2 size={13} /> : <Clock size={13} />}
      {status || "UNPAID"}
    </span>
  );
}
