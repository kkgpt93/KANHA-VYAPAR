import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Printer,
  Share2,
  RotateCcw,
  CheckCircle2,
  FileText,
  MessageCircle,
  Phone,
  Download,
  X,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice } from '../types';
import { formatCurrency, formatDateTime, buildWhatsAppInvoiceText } from '../utils/formatters';
import { exportInvoicesToCSV } from '../utils/reportExport';
import { InvoiceModal } from './InvoiceModal';
import { InvoicesReportModal } from './InvoicesReportModal';
import { AddInvoiceItemModal } from './AddInvoiceItemModal';

export const InvoicesList: React.FC = () => {
  const { invoices, cancelOrRefundInvoice, settings, activeUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [openAddItemImmediately, setOpenAddItemImmediately] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null);

  // Batch Selection State
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter(inv => {
      const matchSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerPhone && inv.customerPhone.includes(q)) ||
        inv.items.some(it => it.name.toLowerCase().includes(q));

      const matchPayment = paymentFilter === 'all' || inv.paymentMethod === paymentFilter;
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;

      return matchSearch && matchPayment && matchStatus;
    });
  }, [invoices, searchQuery, paymentFilter, statusFilter]);

  // Selected invoices array and calculations
  const selectedInvoices = useMemo(() => {
    return invoices.filter(inv => selectedInvoiceIds.has(inv.id));
  }, [invoices, selectedInvoiceIds]);

  const totalSelectedAmount = useMemo(() => {
    return selectedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [selectedInvoices]);

  const isAllFilteredSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every(inv => selectedInvoiceIds.has(inv.id));

  const isSomeFilteredSelected =
    filteredInvoices.some(inv => selectedInvoiceIds.has(inv.id)) &&
    !isAllFilteredSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeFilteredSelected;
    }
  }, [isSomeFilteredSelected]);

  const handleToggleSelect = (id: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect filtered
      setSelectedInvoiceIds(prev => {
        const next = new Set(prev);
        filteredInvoices.forEach(inv => next.delete(inv.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedInvoiceIds(prev => {
        const next = new Set(prev);
        filteredInvoices.forEach(inv => next.add(inv.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedInvoiceIds(new Set());
  };

  // Determine which invoices to export (selected takes priority over all filtered)
  const invoicesToExport = selectedInvoiceIds.size > 0 ? selectedInvoices : filteredInvoices;

  const handleExportCSV = () => {
    if (invoicesToExport.length === 0) return;
    const count = invoicesToExport.length;
    const dateStr = new Date().toISOString().slice(0, 10);
    exportInvoicesToCSV(
      invoicesToExport,
      settings,
      `VyaparPOS_Invoices_${count}_${dateStr}.csv`
    );
  };

  const handleOpenPDFReport = () => {
    if (invoicesToExport.length === 0) return;
    setIsReportModalOpen(true);
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const text = buildWhatsAppInvoiceText(inv, settings);
    const phone = inv.customerPhone ? inv.customerPhone.replace(/\D/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleConfirmRefund = (inv: Invoice) => {
    cancelOrRefundInvoice(inv.id);
    setConfirmRefundId(null);
  };

  const canRefund = activeUser.role === 'admin' || activeUser.role === 'manager';

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Invoice Archive & Receipts</span>
            {selectedInvoiceIds.size > 0 && (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                · {selectedInvoiceIds.size} Selected
              </span>
            )}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Total {invoices.length} invoices recorded · Add items to any active invoice or export CSV / PDF
          </p>
        </div>

        {/* Create Invoice / Add Item & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewInvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Create New Invoice & Add Items (नया इनवॉइस बनाएं / आइटम जोड़ें)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Invoice / Add Item</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={invoicesToExport.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
            title={
              selectedInvoiceIds.size > 0
                ? `Export ${selectedInvoiceIds.size} selected invoices to CSV`
                : `Export all ${filteredInvoices.length} filtered invoices to CSV`
            }
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Export CSV</span>
            <span className="text-neutral-400 text-[10px] font-mono">
              ({selectedInvoiceIds.size > 0 ? selectedInvoiceIds.size : filteredInvoices.length})
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenPDFReport}
            disabled={invoicesToExport.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={
              selectedInvoiceIds.size > 0
                ? `Generate PDF Report for ${selectedInvoiceIds.size} selected invoices`
                : `Generate PDF Report for all ${filteredInvoices.length} filtered invoices`
            }
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Report</span>
            <span className="text-neutral-400 dark:text-neutral-500 text-[10px] font-mono">
              ({selectedInvoiceIds.size > 0 ? selectedInvoiceIds.size : filteredInvoices.length})
            </span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 sm:px-4 bg-white dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number, customer name, phone, item..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
        >
          <option value="all">All Payment Modes</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI / QR</option>
          <option value="card">Card</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Floating / Sticky Batch Action Toolbar when items are selected */}
      {selectedInvoiceIds.size > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{selectedInvoiceIds.size} of {invoices.length} invoices selected</span>
            </span>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              Total Amount:{' '}
              <strong className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                {formatCurrency(totalSelectedAmount, settings.currencySymbol)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPDFReport}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors ml-1"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 uppercase font-semibold">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAllFiltered}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title={isAllFilteredSelected ? 'Deselect All Filtered' : 'Select All Filtered'}
                  />
                </th>
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {invoices.length === 0
                        ? 'अभी कोई इनवॉइस रिकॉर्ड नहीं है (No invoices recorded yet).'
                        : 'No invoices found matching your filters.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsNewInvoiceModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Create Invoice & Add Item (इनवॉइस में आइटम जोड़ें)</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isSelected = selectedInvoiceIds.has(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inv.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="Select invoice"
                        />
                      </td>

                      {/* Invoice ID */}
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {inv.invoiceNumber}
                        {inv.isOfflineCreated && (
                          <span className="block text-[10px] text-amber-600 font-sans font-normal">
                            Offline Created
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-neutral-500 font-mono text-[11px]">
                        {formatDateTime(inv.createdAt)}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {inv.customerName || 'Walk-in'}
                        </div>
                        {inv.customerPhone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono mt-0.5">
                            <span>{inv.customerPhone}</span>
                            <a
                              href={`https://wa.me/91${inv.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded"
                              title="WhatsApp Customer"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                            <a
                              href={`tel:${inv.customerPhone.replace(/\D/g, '')}`}
                              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded"
                              title="Call Customer"
                            >
                              <Phone className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Items Count */}
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
                        {inv.items.reduce((s, it) => s + it.quantity, 0)}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-2.5 px-3 uppercase font-medium text-[11px] text-neutral-700 dark:text-neutral-300">
                        {inv.paymentMethod}
                      </td>

                      {/* Grand Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(inv.grandTotal, settings.currencySymbol)}
                      </td>

                      {/* Status (Clean unboxed typographic metadata) */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wide ${
                            inv.status === 'paid'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Direct + Add Item Button on Active Invoice Row */}
                          {inv.status === 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenAddItemImmediately(true);
                                setSelectedInvoice(inv);
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              title="Add Item to this Invoice (इस इनवॉइस में आइटम जोड़ें)"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Item</span>
                            </button>
                          )}

                          {/* View & Print Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenAddItemImmediately(false);
                              setSelectedInvoice(inv);
                            }}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="View & Print Bill"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(inv)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Refund with Inline Confirmation */}
                          {inv.status === 'paid' && canRefund && (
                            confirmRefundId === inv.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmRefund(inv)}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold whitespace-nowrap cursor-pointer"
                                >
                                  Confirm Refund
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRefundId(null)}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRefundId(inv.id)}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Refund & Restore Stock"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Invoice Detail / Print Modal (with live Add Item capability) */}
      <InvoiceModal
        invoice={selectedInvoice}
        initialAddItemOpen={openAddItemImmediately}
        onClose={() => {
          setSelectedInvoice(null);
          setOpenAddItemImmediately(false);
        }}
      />

      {/* Create New Invoice & Add Items Directly Modal */}
      <AddInvoiceItemModal
        isOpen={isNewInvoiceModalOpen}
        mode="new-invoice"
        onClose={() => setIsNewInvoiceModalOpen(false)}
        onInvoiceCreated={created => {
          setOpenAddItemImmediately(false);
          setSelectedInvoice(created);
        }}
      />

      {/* Consolidated Invoices Report Modal for PDF & Printing */}
      <InvoicesReportModal
        invoices={invoicesToExport}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportTitle={
          selectedInvoiceIds.size > 0
            ? `Invoices Report (${selectedInvoiceIds.size} Selected Bills)`
            : 'Invoices & Sales Register Statement'
        }
      />
    </div>
  );
};
