import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Share2,
  X,
  CheckCircle2,
  Copy,
  Receipt,
  Download,
  Phone,
  QrCode,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Check,
  FileText,
  Building2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Invoice } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime, buildWhatsAppInvoiceText } from '../utils/formatters';

export type ReceiptFormat = 'thermal80' | 'tax_invoice' | 'thermal58';

export interface PrintPreviewModalProps {
  invoice: Invoice | null;
  isOpen?: boolean;
  isDraft?: boolean;
  onClose: () => void;
  onCompleteSale?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  invoice,
  isOpen = true,
  isDraft = false,
  onClose,
  onCompleteSale,
}) => {
  const { settings } = useApp();
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [format, setFormat] = useState<ReceiptFormat>('thermal80');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState(false);

  // Customization toggles
  const [showQr, setShowQr] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Generate UPI QR Code
  useEffect(() => {
    if (!invoice) return;

    const upiString = `upi://pay?pa=${encodeURIComponent(
      settings.upiVpa || 'vyapar@okhdfcbank'
    )}&pn=${encodeURIComponent(settings.storeName)}&am=${invoice.grandTotal.toFixed(
      2
    )}&cu=INR&tn=${encodeURIComponent(invoice.invoiceNumber)}`;

    QRCode.toDataURL(upiString, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(url => setUpiQrUrl(url))
      .catch(() => setUpiQrUrl(''));
  }, [invoice, settings]);

  // Keyboard shortcut listener for Escape and Ctrl+P
  useEffect(() => {
    if (!invoice && !isOpen) return;

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
  }, [invoice, isOpen, onClose]);

  if (!invoice && !isOpen) return null;
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = buildWhatsAppInvoiceText(invoice, settings);
    const phone = invoice.customerPhone ? invoice.customerPhone.replace(/\D/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopySummary = () => {
    const text = decodeURIComponent(buildWhatsAppInvoiceText(invoice, settings));
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert number to approximate Indian Rupee words
  const numberToIndianWords = (num: number): string => {
    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
      'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const rounded = Math.round(num);
    if (rounded === 0) return 'Zero Rupees Only';

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
    };

    return inWords(rounded).trim() + ' Rupees Only';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-4xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Toolbar Header (no-print) */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 no-print gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isDraft ? 'Draft Bill Print Preview' : 'Print Preview & Invoice'}
                </h3>
                {isDraft ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded">
                    Draft / Pre-Check
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-mono">
                    {invoice.invoiceNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Preview exact printer output according to CSS media rules. Press <kbd className="font-mono px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-[10px]">Ctrl+P</kbd> to print.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector Pills */}
            <div className="flex items-center bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setFormat('thermal80')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  format === 'thermal80'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setFormat('tax_invoice')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  format === 'tax_invoice'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                A4 Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setFormat('thermal58')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  format === 'thermal58'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                58mm Mini
              </button>
            </div>

            {/* Customizer Toggle */}
            <button
              type="button"
              onClick={() => setShowCustomizer(!showCustomizer)}
              title="Customize Print Layout"
              className={`p-1.5 rounded-lg border transition-colors ${
                showCustomizer
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secondary Options Drawer (no-print) */}
        {showCustomizer && (
          <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Display Options:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={e => setShowQr(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>UPI QR Code</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTaxBreakup}
                  onChange={e => setShowTaxBreakup(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Tax Breakdown</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAddress}
                  onChange={e => setShowAddress(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Store Address</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTerms}
                  onChange={e => setShowTerms(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Return Terms</span>
              </label>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-500 mr-1">Zoom:</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(75, prev - 10))}
                className="p-1 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-10 text-center font-medium">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                className="p-1 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="px-1.5 py-0.5 text-[10px] rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 ml-1"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Paper Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-200/70 dark:bg-neutral-950 flex flex-col items-center justify-start min-h-[380px]">
          {/* Paper Sheet Preview Info Badge (no-print) */}
          <div className="mb-3 px-3 py-1 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xs rounded-full border border-neutral-300 dark:border-neutral-700 text-[11px] font-mono text-neutral-600 dark:text-neutral-300 flex items-center gap-2 no-print shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {format === 'thermal80'
                ? '80mm Roll Width (~320px) • Direct Thermal POS Output'
                : format === 'tax_invoice'
                ? 'A4 Sheet Size (210mm × 297mm) • Formal GST Tax Invoice'
                : '58mm Roll Width (~240px) • Mini Mobile Bluetooth POS'}
            </span>
          </div>

          {/* Printable Document Container (Hooked to #printable-receipt for Print Media Queries) */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
            }}
            className="transition-transform duration-150"
          >
            <div
              id="printable-receipt"
              className={`bg-white text-neutral-900 border border-neutral-300 shadow-xl print:shadow-none print:border-0 rounded-sm font-mono text-xs ${
                format === 'thermal80'
                  ? 'w-[340px] p-5'
                  : format === 'thermal58'
                  ? 'w-[260px] p-3 text-[11px]'
                  : 'w-[720px] max-w-[95vw] p-8 font-sans'
              }`}
            >
              {/* ===================================================================== */}
              {/* FORMAT 1 & 3: THERMAL POS RECEIPTS (80mm & 58mm)                      */}
              {/* ===================================================================== */}
              {format !== 'tax_invoice' && (
                <div>
                  {/* Brand Header */}
                  <div className="text-center pb-3 border-b border-dashed border-neutral-400">
                    <h2 className="text-base font-bold tracking-tight text-neutral-900 uppercase">
                      {settings.storeName}
                    </h2>
                    {settings.tagline && (
                      <p className="text-[11px] text-neutral-600 mt-0.5">{settings.tagline}</p>
                    )}
                    {showAddress && settings.address && (
                      <p className="text-[10px] text-neutral-500 mt-1 leading-tight whitespace-pre-line">
                        {settings.address}
                      </p>
                    )}
                    <div className="text-[10px] text-neutral-600 mt-1 flex flex-wrap justify-center gap-2">
                      {settings.phone && <span>Ph: {settings.phone}</span>}
                      {settings.gstin && <span>GSTIN: {settings.gstin}</span>}
                    </div>
                  </div>

                  {/* Invoice & Customer Meta */}
                  <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 font-semibold">INVOICE:</span>
                      <span className="font-bold font-mono">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">DATE & TIME:</span>
                      <span>{formatDateTime(invoice.createdAt)}</span>
                    </div>

                    {/* Customer Name */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-neutral-600 font-semibold shrink-0">CUSTOMER:</span>
                      <span className="font-bold text-neutral-900 text-right break-words max-w-[200px]">
                        {invoice.customerName || 'Walk-in Customer'}
                      </span>
                    </div>

                    {/* Customer Mobile Number */}
                    {invoice.customerPhone ? (
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-neutral-600 font-semibold shrink-0">MOBILE NO:</span>
                        <span className="font-mono font-bold text-neutral-900 text-right">
                          +91 {invoice.customerPhone.replace(/\D/g, '')}
                        </span>
                      </div>
                    ) : (
                      invoice.customerName && invoice.customerName !== 'Walk-in Customer' ? (
                        <div className="flex justify-between items-center gap-2 text-neutral-400">
                          <span className="text-neutral-500">MOBILE NO:</span>
                          <span className="font-mono text-[10px]">--</span>
                        </div>
                      ) : null
                    )}

                    {/* Customer Address (if provided) */}
                    {invoice.customerAddress && (
                      <div className="flex justify-between items-start gap-2 text-[10px]">
                        <span className="text-neutral-600 shrink-0">ADDRESS:</span>
                        <span className="text-right text-neutral-700 max-w-[190px] leading-tight break-words">
                          {invoice.customerAddress}
                        </span>
                      </div>
                    )}

                    {/* Customer GSTIN (if provided) */}
                    {invoice.customerGstin && (
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-neutral-600 shrink-0">CUST. GSTIN:</span>
                        <span className="font-mono font-bold text-neutral-900">{invoice.customerGstin}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-neutral-600">CASHIER:</span>
                      <span>{invoice.cashierName}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="py-2 border-b border-dashed border-neutral-400">
                    <div className="grid grid-cols-12 font-bold text-neutral-800 pb-1 border-b border-neutral-300 text-[10px] uppercase">
                      <span className="col-span-6">ITEM</span>
                      <span className="col-span-2 text-center">QTY</span>
                      <span className="col-span-2 text-right">RATE</span>
                      <span className="col-span-2 text-right">AMT</span>
                    </div>

                    <div className="divide-y divide-neutral-200 py-1 space-y-1">
                      {invoice.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 text-[11px] pt-1">
                          <div className="col-span-6 pr-1">
                            <p className="font-semibold text-neutral-900 leading-tight truncate">
                              {item.name}
                            </p>
                            {showTaxBreakup && item.taxRate > 0 && (
                              <p className="text-[9px] text-neutral-500">GST {item.taxRate}%</p>
                            )}
                          </div>
                          <span className="col-span-2 text-center tabular-nums font-mono">
                            {item.quantity}
                          </span>
                          <span className="col-span-2 text-right tabular-nums font-mono">
                            ₹{item.unitPrice.toFixed(0)}
                          </span>
                          <span className="col-span-2 text-right font-bold tabular-nums font-mono">
                            ₹{item.total.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1 text-[11px]">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal ({invoice.items.length} items):</span>
                      <span className="tabular-nums font-mono">₹{invoice.subtotal.toFixed(2)}</span>
                    </div>

                    {invoice.discountTotal > 0 && (
                      <div className="flex justify-between text-neutral-700">
                        <span>Discount:</span>
                        <span className="tabular-nums font-mono">-₹{invoice.discountTotal.toFixed(2)}</span>
                      </div>
                    )}

                    {showTaxBreakup && invoice.taxTotal > 0 && (
                      <div className="flex justify-between text-neutral-600">
                        <span>GST / Tax Total:</span>
                        <span className="tabular-nums font-mono">₹{invoice.taxTotal.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-extrabold pt-1 text-neutral-900 border-t border-neutral-300">
                      <span>GRAND TOTAL:</span>
                      <span className="tabular-nums font-mono">₹{invoice.grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[10px] text-neutral-700 pt-1">
                      <span>Payment Method:</span>
                      <span className="uppercase font-bold">
                        {invoice.paymentMethod} ({invoice.status})
                      </span>
                    </div>

                    {invoice.paymentMethod === 'cash' && invoice.amountTendered !== undefined && (
                      <>
                        <div className="flex justify-between text-[10px] text-neutral-600">
                          <span>Cash Tendered:</span>
                          <span className="tabular-nums font-mono">
                            ₹{invoice.amountTendered.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-neutral-900 font-bold">
                          <span>Change Returned:</span>
                          <span className="tabular-nums font-mono">
                            ₹{(invoice.changeDue || 0).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dynamic UPI Payment QR Code */}
                  {showQr && upiQrUrl && (
                    <div className="py-3 flex flex-col items-center justify-center text-center border-b border-dashed border-neutral-400">
                      <img
                        src={upiQrUrl}
                        alt="UPI Payment QR"
                        className="w-24 h-24 rounded border border-neutral-300 p-1"
                      />
                      <p className="text-[10px] font-bold text-neutral-800 mt-1">
                        Scan to Pay via any UPI App
                      </p>
                      <p className="text-[9px] text-neutral-500 font-mono">{settings.upiVpa}</p>
                    </div>
                  )}

                  {/* Return Terms & Store Message */}
                  <div className="pt-2.5 text-center text-[10px] text-neutral-600 space-y-1">
                    <p className="font-bold text-neutral-900">
                      Thank you for visiting {settings.storeName}!
                    </p>
                    {showTerms && (
                      <p className="text-[9px] text-neutral-500">
                        Goods once sold can be exchanged within 7 days on presenting original bill.
                      </p>
                    )}
                    <p className="text-[9px] text-neutral-400 tracking-wider pt-0.5">
                      --- VyaparPOS System ---
                    </p>
                  </div>
                </div>
              )}

              {/* ===================================================================== */}
              {/* FORMAT 2: FORMAL A4 GST TAX INVOICE FORMAT                             */}
              {/* ===================================================================== */}
              {format === 'tax_invoice' && (
                <div className="space-y-4">
                  {/* Top Header Row with Company Details & Tax Invoice Badge */}
                  <div className="flex justify-between items-start border-b-2 border-neutral-800 pb-3">
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
                        TAX INVOICE
                      </div>
                      <div className="mt-2 text-xs font-mono space-y-0.5">
                        <div>
                          <span className="text-neutral-500">Invoice No: </span>
                          <span className="font-bold text-neutral-900">{invoice.invoiceNumber}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500">Date: </span>
                          <span>{formatDateTime(invoice.createdAt)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500">Cashier: </span>
                          <span>{invoice.cashierName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bill To / Customer Information Box */}
                  <div className="grid grid-cols-2 gap-4 p-3.5 bg-neutral-50 border border-neutral-300 rounded-sm text-xs">
                    <div>
                      <h4 className="font-bold text-neutral-800 uppercase text-[11px] pb-1 border-b border-neutral-200 mb-2">
                        Billed To (Customer Details):
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <span className="text-neutral-500 text-[11px] w-24 shrink-0 font-medium">Customer Name:</span>
                          <span className="font-bold text-neutral-900 text-sm">
                            {invoice.customerName || 'Walk-in Customer'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-neutral-500 text-[11px] font-sans w-24 shrink-0 font-medium">Mobile No:</span>
                          <span className="font-bold text-neutral-900 text-xs">
                            {invoice.customerPhone
                              ? `+91 ${invoice.customerPhone.replace(/\D/g, '')}`
                              : 'Walk-in (Not Specified)'}
                          </span>
                        </div>
                        {invoice.customerAddress && (
                          <div className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-neutral-500 w-24 shrink-0 font-medium">Address:</span>
                            <span className="text-neutral-700 leading-snug">
                              {invoice.customerAddress}
                            </span>
                          </div>
                        )}
                        {invoice.customerGstin && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-neutral-500 font-sans w-24 shrink-0 font-medium">GSTIN / UIN:</span>
                            <span className="font-bold text-neutral-900">
                              {invoice.customerGstin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-800 uppercase text-[11px] mb-1">
                          Payment Details:
                        </h4>
                        <p className="font-semibold text-neutral-900 uppercase">
                          Mode: {invoice.paymentMethod}
                        </p>
                        <p className="text-neutral-600 text-[11px]">
                          Status: <span className="font-bold text-emerald-700 uppercase">{invoice.status}</span>
                        </p>
                      </div>

                      {showQr && upiQrUrl && (
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <img
                            src={upiQrUrl}
                            alt="UPI QR"
                            className="w-16 h-16 border border-neutral-300 p-0.5 bg-white"
                          />
                          <div className="text-left text-[10px]">
                            <p className="font-bold">Scan to Pay UPI</p>
                            <p className="font-mono text-neutral-500 text-[9px]">{settings.upiVpa}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Formal Line Items Table */}
                  <div className="border border-neutral-300 rounded-xs overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-800 font-bold text-[11px] uppercase">
                          <th className="p-2 border-r border-neutral-300 w-10 text-center">#</th>
                          <th className="p-2 border-r border-neutral-300">Item Description</th>
                          <th className="p-2 border-r border-neutral-300 text-center w-16">Unit</th>
                          <th className="p-2 border-r border-neutral-300 text-center w-14">Qty</th>
                          <th className="p-2 border-r border-neutral-300 text-right w-20">Rate (₹)</th>
                          <th className="p-2 border-r border-neutral-300 text-center w-16">GST %</th>
                          <th className="p-2 border-r border-neutral-300 text-right w-20">Tax (₹)</th>
                          <th className="p-2 text-right w-24">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {invoice.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50">
                            <td className="p-2 border-r border-neutral-200 text-center text-neutral-500">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-r border-neutral-200">
                              <span className="font-bold text-neutral-900 block">{item.name}</span>
                              {item.barcode && (
                                <span className="text-[10px] text-neutral-500 font-mono">
                                  SKU: {item.barcode}
                                </span>
                              )}
                            </td>
                            <td className="p-2 border-r border-neutral-200 text-center text-neutral-600">
                              {item.unit || 'pcs'}
                            </td>
                            <td className="p-2 border-r border-neutral-200 text-center font-mono font-bold">
                              {item.quantity}
                            </td>
                            <td className="p-2 border-r border-neutral-200 text-right font-mono">
                              {item.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-2 border-r border-neutral-200 text-center font-mono">
                              {item.taxRate}%
                            </td>
                            <td className="p-2 border-r border-neutral-200 text-right font-mono text-neutral-600">
                              {item.taxAmount.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-neutral-900">
                              {item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary, Total in Words & Signatory */}
                  <div className="grid grid-cols-12 gap-4 pt-1">
                    {/* Left 7 cols: Amount in words & Bank/Terms */}
                    <div className="col-span-7 space-y-3 text-xs">
                      <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-sm">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                          Total Amount in Words:
                        </span>
                        <p className="font-bold text-neutral-900 italic mt-0.5">
                          {numberToIndianWords(invoice.grandTotal)}
                        </p>
                      </div>

                      {showTerms && (
                        <div className="text-[10px] text-neutral-500 leading-snug space-y-0.5">
                          <p className="font-bold text-neutral-700">Terms & Conditions:</p>
                          <p>1. Goods once sold will be accepted for return within 7 days in original condition.</p>
                          <p>2. Subject to local jurisdiction only.</p>
                          <p>3. This is a computer generated invoice and requires no physical stamp.</p>
                        </div>
                      )}
                    </div>

                    {/* Right 5 cols: Calculations Breakdown */}
                    <div className="col-span-5 text-xs space-y-1 border border-neutral-300 p-3 rounded-sm bg-neutral-50/50">
                      <div className="flex justify-between text-neutral-600">
                        <span>Taxable Subtotal:</span>
                        <span className="font-mono font-bold">₹{invoice.subtotal.toFixed(2)}</span>
                      </div>
                      {invoice.discountTotal > 0 && (
                        <div className="flex justify-between text-neutral-700">
                          <span>Discount Applied:</span>
                          <span className="font-mono text-rose-600">-₹{invoice.discountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-neutral-600">
                        <span>CGST + SGST (Total Tax):</span>
                        <span className="font-mono">₹{invoice.taxTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold text-neutral-900 pt-2 border-t-2 border-neutral-800">
                        <span>TOTAL PAYABLE:</span>
                        <span className="font-mono">₹{invoice.grandTotal.toFixed(2)}</span>
                      </div>

                      {/* Cashier / Signatory Placeholder */}
                      <div className="pt-8 text-right text-[11px] text-neutral-600">
                        <div className="h-10 border-b border-dashed border-neutral-400 mb-1" />
                        <span className="font-semibold uppercase block">For {settings.storeName}</span>
                        <span className="text-[10px] text-neutral-500">Authorized Signatory</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar Bottom Bar (no-print) */}
        <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Receipt</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isDraft && onCompleteSale && (
              <button
                type="button"
                onClick={() => {
                  onCompleteSale();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Complete Sale & Print</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
