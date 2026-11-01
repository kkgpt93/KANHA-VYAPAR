import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Users,
  Percent,
  CheckCircle,
} from 'lucide-react';
import { Invoice } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { exportInvoicesToCSV } from '../utils/reportExport';
import { computeInvoiceSlabBreakup, formatGstRate } from '../utils/gst';
import { printElementCleanly, syncMainDocumentPrintStyle } from '../utils/printEngine';

export interface InvoicesReportModalProps {
  invoices: Invoice[];
  isOpen: boolean;
  onClose: () => void;
  reportTitle?: string;
}

export const InvoicesReportModal: React.FC<InvoicesReportModalProps> = ({
  invoices,
  isOpen,
  onClose,
  reportTitle = 'Invoices & Sales Register Report',
}) => {
  const { settings, activeUser } = useApp();
  const [includeItemsDetail, setIncludeItemsDetail] = useState(true);
  const [customTitle, setCustomTitle] = useState(reportTitle);
  const reportSheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCustomTitle(reportTitle);
  }, [reportTitle]);

  useEffect(() => {
    if (!isOpen || invoices.length === 0) {
      syncMainDocumentPrintStyle(null);
      return;
    }
    syncMainDocumentPrintStyle('a4_report');
    return () => {
      syncMainDocumentPrintStyle(null);
    };
  }, [isOpen, invoices.length]);

  const handlePrint = useCallback(() => {
    void printElementCleanly(
      reportSheetRef.current,
      'a4_report',
      `Sales-Register-${new Date().toISOString().slice(0, 10)}`
    );
  }, []);

  // Keyboard shortcut listener for Escape and Ctrl+P
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrint]);

  if (!isOpen || invoices.length === 0) return null;

  const handleDownloadCSV = () => {
    exportInvoicesToCSV(
      invoices,
      settings,
      `Invoices_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // KPI Computations
  const totalCount = invoices.length;
  const totalGrand = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalTax = invoices.reduce((sum, inv) => sum + inv.taxTotal, 0);
  const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalDiscount = invoices.reduce((sum, inv) => sum + inv.discountTotal, 0);
  const totalItemsSold = invoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity, 0),
    0
  );

  const cashTotal = invoices
    .filter(inv => inv.paymentMethod === 'cash')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const upiTotal = invoices
    .filter(inv => inv.paymentMethod === 'upi')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const cardTotal = invoices
    .filter(inv => inv.paymentMethod === 'card')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const paidCount = invoices.filter(inv => inv.status === 'paid').length;
  const refundedCount = invoices.filter(inv => inv.status === 'refunded').length;

  const consolidatedSlabBreakup = computeInvoiceSlabBreakup(
    invoices.filter(inv => inv.status === 'paid').flatMap(inv => inv.items)
  );
  const isInterstate = settings.gstSupplyType === 'interstate';

  // Date range
  const dates = invoices.map(i => new Date(i.createdAt).getTime()).filter(t => !isNaN(t));
  const minDate = dates.length ? new Date(Math.min(...dates)) : null;
  const maxDate = dates.length ? new Date(Math.max(...dates)) : null;

  const renderReportDocument = (isPrintCopy: boolean) => (
          <div
            ref={isPrintCopy ? undefined : reportSheetRef}
            id={isPrintCopy ? 'printable-invoice-report-portal' : 'printable-invoice-report'}
            className="vyapar-print-sheet bg-white text-black border border-neutral-300 shadow-xl print:shadow-none print:border-0 rounded-sm w-[820px] max-w-[96vw] p-8 font-sans text-xs space-y-5"
          >
            {/* Header: Store Branding & Report Meta */}
            <div className="flex justify-between items-start border-b-2 border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-neutral-800" />
                  <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase">
                    {settings.storeName}
                  </h1>
                </div>
                {settings.tagline && (
                  <p className="text-xs text-neutral-600 font-medium">{settings.tagline}</p>
                )}
                {settings.address && (
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-snug">
                    {settings.address}
                  </p>
                )}
                <div className="text-xs text-neutral-600 mt-1 space-x-3 font-mono">
                  {settings.phone && <span>Ph: {settings.phone}</span>}
                  {settings.email && <span>Email: {settings.email}</span>}
                  {settings.gstin && (
                    <span className="font-bold text-neutral-900">GSTIN: {settings.gstin}</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider rounded-xs">
                  SALES REGISTER REPORT
                </div>
                <div className="mt-2 text-xs font-mono space-y-0.5">
                  <div>
                    <span className="text-neutral-500">Report Date: </span>
                    <span className="font-bold">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Generated By: </span>
                    <span>{activeUser.name} ({activeUser.role})</span>
                  </div>
                  {minDate && maxDate && (
                    <div className="text-[11px] text-neutral-600">
                      <span>Period: </span>
                      <span>
                        {minDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {' – '}
                        {maxDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Total Revenue
                </span>
                <span className="text-base font-extrabold text-neutral-900 font-mono block mt-0.5">
                  {formatCurrency(totalGrand, settings.currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {totalCount} invoices ({paidCount} paid, {refundedCount} ref.)
                </span>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Total Tax (GST)
                </span>
                <span className="text-base font-extrabold text-neutral-900 font-mono block mt-0.5">
                  {formatCurrency(totalTax, settings.currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Subtotal: {formatCurrency(totalSubtotal, settings.currencySymbol)}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Payment Split
                </span>
                <div className="text-[10px] font-mono text-neutral-700 mt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Cash:</span>
                    <span className="font-bold">{formatCurrency(cashTotal, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UPI/QR:</span>
                    <span className="font-bold">{formatCurrency(upiTotal, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card:</span>
                    <span className="font-bold">{formatCurrency(cardTotal, settings.currencySymbol)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Total Items Sold
                </span>
                <span className="text-base font-extrabold text-neutral-900 font-mono block mt-0.5">
                  {totalItemsSold} Units
                </span>
                {totalDiscount > 0 && (
                  <span className="text-[10px] text-rose-600 font-mono block">
                    Discounts: -{formatCurrency(totalDiscount, settings.currencySymbol)}
                  </span>
                )}
              </div>
            </div>

            {/* Consolidated Slab-Wise GST Summary Table */}
            {consolidatedSlabBreakup.length > 0 && (
              <div className="border border-neutral-300 rounded-xs overflow-hidden">
                <div className="px-3 py-1.5 bg-neutral-100 border-b border-neutral-300 text-[11px] font-bold uppercase text-neutral-800 flex justify-between">
                  <span>
                    Slab-Wise GST Tax Register ({isInterstate ? 'IGST' : 'CGST + SGST'})
                  </span>
                  <span className="font-mono">
                    Paid Bills Tax: ₹
                    {consolidatedSlabBreakup
                      .reduce((s, r) => s + r.totalTax, 0)
                      .toFixed(2)}
                  </span>
                </div>
                <table className="w-full text-left text-xs font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-sans font-semibold text-[11px]">
                      <th className="p-2 border-r border-neutral-200">GST Slab</th>
                      <th className="p-2 border-r border-neutral-200 text-center">Units Sold</th>
                      <th className="p-2 border-r border-neutral-200 text-right">Taxable Value (₹)</th>
                      {isInterstate ? (
                        <th className="p-2 border-r border-neutral-200 text-right">IGST (₹)</th>
                      ) : (
                        <>
                          <th className="p-2 border-r border-neutral-200 text-right">CGST (₹)</th>
                          <th className="p-2 border-r border-neutral-200 text-right">SGST (₹)</th>
                        </>
                      )}
                      <th className="p-2 text-right">Total GST (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {consolidatedSlabBreakup.map(row => (
                      <tr key={row.rate}>
                        <td className="p-2 border-r border-neutral-200 font-bold text-neutral-900">
                          GST {formatGstRate(row.rate)}
                        </td>
                        <td className="p-2 border-r border-neutral-200 text-center">
                          {row.itemCount}
                        </td>
                        <td className="p-2 border-r border-neutral-200 text-right">
                          {row.taxableAmount.toFixed(2)}
                        </td>
                        {isInterstate ? (
                          <td className="p-2 border-r border-neutral-200 text-right">
                            {row.igstAmount.toFixed(2)}
                          </td>
                        ) : (
                          <>
                            <td className="p-2 border-r border-neutral-200 text-right">
                              {row.cgstAmount.toFixed(2)}
                            </td>
                            <td className="p-2 border-r border-neutral-200 text-right">
                              {row.sgstAmount.toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="p-2 text-right font-bold text-neutral-900">
                          {row.totalTax.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Invoices Detailed Table */}
            <div className="border border-neutral-300 rounded-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-800 font-bold text-[11px] uppercase">
                    <th className="p-2 border-r border-neutral-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-neutral-300 w-28">Invoice No</th>
                    <th className="p-2 border-r border-neutral-300 w-24">Date</th>
                    <th className="p-2 border-r border-neutral-300">Customer Details</th>
                    {includeItemsDetail && (
                      <th className="p-2 border-r border-neutral-300">Items Sold</th>
                    )}
                    <th className="p-2 border-r border-neutral-300 text-center w-16">Mode</th>
                    <th className="p-2 border-r border-neutral-300 text-right w-20">Tax</th>
                    <th className="p-2 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                    >
                      <td className="p-2 border-r border-neutral-200 text-center text-neutral-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-neutral-200 font-mono font-bold text-neutral-900">
                        {inv.invoiceNumber}
                        {inv.status === 'refunded' && (
                          <span className="block text-[9px] text-rose-600 font-sans font-normal uppercase">
                            [Refunded]
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-neutral-200 text-neutral-600 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(inv.createdAt)}
                      </td>
                      <td className="p-2 border-r border-neutral-200">
                        <div className="font-semibold text-neutral-900">
                          {inv.customerName || 'Walk-in'}
                        </div>
                        {inv.customerPhone && (
                          <div className="text-[10px] text-neutral-500 font-mono">
                            +91 {inv.customerPhone}
                          </div>
                        )}
                        {inv.customerGstin && (
                          <div className="text-[9px] text-neutral-500 font-mono">
                            GST: {inv.customerGstin}
                          </div>
                        )}
                      </td>
                      {includeItemsDetail && (
                        <td className="p-2 border-r border-neutral-200 text-[11px] text-neutral-600 max-w-xs">
                          {inv.items.map((it, i) => (
                            <span key={i} className="inline-block mr-1.5 leading-tight">
                              {it.name} <span className="text-neutral-400 font-mono">×{it.quantity}</span>
                              {i < inv.items.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </td>
                      )}
                      <td className="p-2 border-r border-neutral-200 text-center uppercase font-mono font-medium text-[10px]">
                        {inv.paymentMethod}
                      </td>
                      <td className="p-2 border-r border-neutral-200 text-right font-mono text-neutral-600">
                        {formatCurrency(inv.taxTotal, settings.currencySymbol)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-neutral-900">
                        {formatCurrency(inv.grandTotal, settings.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-100 border-t-2 border-neutral-800 font-bold text-neutral-900">
                    <td
                      colSpan={includeItemsDetail ? 5 : 4}
                      className="p-2 border-r border-neutral-300 text-right uppercase text-[11px]"
                    >
                      Total ({totalCount} Invoices)
                    </td>
                    <td className="p-2 border-r border-neutral-300 text-center text-[10px] font-mono">
                      {totalItemsSold} Items
                    </td>
                    <td className="p-2 border-r border-neutral-300 text-right font-mono">
                      {formatCurrency(totalTax, settings.currencySymbol)}
                    </td>
                    <td className="p-2 text-right font-mono text-sm font-extrabold">
                      {formatCurrency(totalGrand, settings.currencySymbol)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Signatory & System Footer */}
            <div className="pt-4 flex justify-between items-end text-neutral-500 text-[10px]">
              <div>
                <p className="font-semibold text-neutral-700">Notice:</p>
                <p>This is a computer-generated consolidated invoices register from VyaparPOS.</p>
                <p>Report ID: REP-{Date.now().toString().slice(-8)} · Timestamp: {new Date().toISOString()}</p>
              </div>

              <div className="text-right w-48">
                <div className="h-10 border-b border-dashed border-neutral-400 mb-1" />
                <span className="font-semibold uppercase text-neutral-800 block">
                  For {settings.storeName}
                </span>
                <span>Authorized Signatory</span>
              </div>
            </div>
          </div>
  );

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto no-print">
      {/* Container */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-5xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Control Bar (no-print) */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 no-print gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  PDF & Print Report Preview
                </h3>
                <span className="text-neutral-400">·</span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                  {totalCount} Invoices Selected
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Consolidated sales summary and tax statement. Press <kbd className="font-mono px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-[10px]">Ctrl+P</kbd> to save as PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeItemsDetail}
                onChange={e => setIncludeItemsDetail(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Include Items Breakdown</span>
            </label>

            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
              title="Export Selected Invoices to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Print or Save PDF (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Canvas Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-200/70 dark:bg-neutral-950 flex flex-col items-center justify-start min-h-[380px]">
          {renderReportDocument(false)}
        </div>

        {/* Modal Bottom Actions (no-print) */}
        <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            Selected: <span className="font-bold text-neutral-900 dark:text-neutral-100">{totalCount} invoices</span> · Total: <span className="font-bold font-mono text-emerald-600">{formatCurrency(totalGrand, settings.currencySymbol)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV File</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    {typeof document !== 'undefined' &&
      createPortal(
        <div id="vyapar-print-portal" data-print-mode="a4_report">
          {renderReportDocument(true)}
        </div>,
        document.body
      )}
    </>
  );
};
