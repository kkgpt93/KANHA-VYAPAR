import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  Printer,
  Share2,
  X,
  Copy,
  ZoomIn,
  ZoomOut,
  Sliders,
  Check,
  Building2,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Percent,
} from 'lucide-react';
import { DiscountMode, Invoice } from '../types';
import { useApp } from '../context/AppContext';
import { formatDateTime, buildWhatsAppInvoiceText } from '../utils/formatters';
import {
  computeInvoiceSlabBreakup,
  formatGstRate,
  getEnabledGstSlabs,
} from '../utils/gst';
import {
  printElementCleanly,
  syncMainDocumentPrintStyle,
} from '../utils/printEngine';
import { AddInvoiceItemModal } from './AddInvoiceItemModal';
import { GstSlabManagerModal } from './GstSlabManagerModal';

export type ReceiptFormat = 'thermal80' | 'tax_invoice' | 'thermal58';

export interface PrintPreviewModalProps {
  invoice: Invoice | null;
  isOpen?: boolean;
  isDraft?: boolean;
  initialAddItemOpen?: boolean;
  onClose: () => void;
  onCompleteSale?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  invoice,
  isOpen = true,
  isDraft = false,
  initialAddItemOpen = false,
  onClose,
  onCompleteSale,
}) => {
  const {
    settings,
    invoices,
    updateInvoiceItemQuantity,
    updateInvoiceItemTaxRate,
    updateInvoiceBillDiscount,
  } = useApp();
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [format, setFormat] = useState<ReceiptFormat>('thermal80');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState(false);

  // Add Item, Edit Item Qty/GST & Slab Manager states
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isSlabManagerOpen, setIsSlabManagerOpen] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);

  // Customization toggles
  const [showQr, setShowQr] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const printSheetRef = useRef<HTMLDivElement | null>(null);

  // Resolve live invoice from AppContext so added/updated items reflect immediately
  const liveInvoice = useMemo(() => {
    if (!invoice) return null;
    if (isDraft) return invoice;
    return invoices.find(i => i.id === invoice.id) || invoice;
  }, [invoice, invoices, isDraft]);

  useEffect(() => {
    if (liveInvoice && initialAddItemOpen && liveInvoice.status === 'paid') {
      setIsAddItemModalOpen(true);
    } else if (!liveInvoice) {
      setIsAddItemModalOpen(false);
      setIsEditingItems(false);
    }
  }, [liveInvoice?.id, initialAddItemOpen]);

  // Sync dynamic @page size CSS into main document head while modal is active
  useEffect(() => {
    if (!liveInvoice || !isOpen) {
      syncMainDocumentPrintStyle(null);
      return;
    }
    syncMainDocumentPrintStyle(format);
    return () => {
      syncMainDocumentPrintStyle(null);
    };
  }, [liveInvoice, isOpen, format]);

  // Keep true physical paper dimensions (80mm / 54mm / 210mm) without reflow, scaling A4 only on narrow screens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (format === 'tax_invoice') {
      const availableWidth = window.innerWidth - 56;
      const a4PixelWidth = 794; // 210mm at 96dpi
      if (availableWidth < a4PixelWidth) {
        const fittedZoom = Math.max(50, Math.min(100, Math.floor((availableWidth / a4PixelWidth) * 100)));
        setZoomLevel(fittedZoom);
      } else {
        setZoomLevel(100);
      }
    } else {
      setZoomLevel(100);
    }
  }, [format]);

  // Generate high-contrast monochrome UPI QR Code for crisp thermal & laser printing
  useEffect(() => {
    if (!liveInvoice) return;

    const upiString = `upi://pay?pa=${encodeURIComponent(
      settings.upiVpa || 'vyapar@okhdfcbank'
    )}&pn=${encodeURIComponent(settings.storeName)}&am=${liveInvoice.grandTotal.toFixed(
      2
    )}&cu=INR&tn=${encodeURIComponent(liveInvoice.invoiceNumber)}`;

    QRCode.toDataURL(upiString, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(url => setUpiQrUrl(url))
      .catch(() => setUpiQrUrl(''));
  }, [liveInvoice, settings]);

  const handlePrint = useCallback(() => {
    if (!liveInvoice) return;
    void printElementCleanly(
      printSheetRef.current,
      format,
      `${liveInvoice.invoiceNumber}-${format}`
    );
  }, [liveInvoice, format]);

  // Keyboard shortcut listener for Escape and Ctrl+P
  useEffect(() => {
    if (!liveInvoice || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAddItemModalOpen || isSlabManagerOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [liveInvoice, isOpen, isAddItemModalOpen, isSlabManagerOpen, onClose, handlePrint]);

  const enabledSlabs = useMemo(
    () => getEnabledGstSlabs(settings.gstSlabs),
    [settings.gstSlabs]
  );

  const slabBreakup = useMemo(
    () => (liveInvoice ? computeInvoiceSlabBreakup(liveInvoice.items) : []),
    [liveInvoice]
  );

  if (!liveInvoice || !isOpen) return null;

  const invoiceData = liveInvoice;
  const canModifyInvoice = invoiceData.status === 'paid';
  const isInterstate =
    (invoiceData.gstSupplyType || settings.gstSupplyType || 'intrastate') === 'interstate';

  const handleWhatsAppShare = () => {
    const text = buildWhatsAppInvoiceText(invoiceData, settings);
    const phone = invoiceData.customerPhone ? invoiceData.customerPhone.replace(/\D/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    const text = decodeURIComponent(buildWhatsAppInvoiceText(invoiceData, settings));
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert number to Indian Rupee words
  const numberToIndianWords = (num: number): string => {
    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
      'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ',
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

  const discountLabelText =
    invoiceData.billDiscountMode === 'percent' && invoiceData.billDiscountValue
      ? `Discount (${invoiceData.billDiscountValue}%):`
      : invoiceData.billDiscountMode === 'amount' && invoiceData.billDiscountValue
      ? `Discount (Flat ₹${invoiceData.billDiscountValue}):`
      : 'Discount:';

  /**
   * Renders the receipt/invoice document for both screen preview (isPrintCopy = false)
   * and isolated physical paper output (isPrintCopy = true).
   */
  const renderReceiptDocument = (isPrintCopy: boolean) => {
    const showInteractive = !isPrintCopy;

    return (
      <div
        ref={isPrintCopy ? undefined : printSheetRef}
        id={isPrintCopy ? 'printable-receipt-portal-sheet' : 'printable-receipt'}
        className={`vyapar-paper-sheet ${
          format === 'thermal80'
            ? 'vyapar-paper-thermal80'
            : format === 'thermal58'
            ? 'vyapar-paper-thermal54'
            : 'vyapar-paper-a4'
        } ${isPrintCopy ? '' : 'border border-neutral-300 shadow-2xl'}`}
      >
        {/* ===================================================================== */}
        {/* FORMAT 1: 80mm STANDARD POS THERMAL RECEIPT (72mm Printable Width)    */}
        {/* ===================================================================== */}
        {format === 'thermal80' && (
          <div className="text-black">
            {/* Store Header */}
            <div className="text-center pb-2.5 border-b border-dashed border-black">
              <h2 className="text-sm font-extrabold tracking-tight text-black uppercase break-words">
                {settings.storeName}
              </h2>
              {settings.tagline && (
                <p className="text-[10px] text-black mt-0.5 break-words">{settings.tagline}</p>
              )}
              {showAddress && settings.address && (
                <p className="text-[10px] text-black mt-1 leading-tight whitespace-pre-line break-words">
                  {settings.address}
                </p>
              )}
              <div className="text-[10px] text-black mt-1 space-y-0.5">
                {settings.phone && <div>Ph: {settings.phone}</div>}
                {settings.gstin && <div className="font-bold">GSTIN: {settings.gstin}</div>}
              </div>
            </div>

            {/* Invoice & Customer Meta */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[10.5px]">
              <div className="flex justify-between gap-2">
                <span className="font-semibold shrink-0">INVOICE:</span>
                <span className="font-bold text-right break-all">{invoiceData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="shrink-0">DATE:</span>
                <span className="text-right">{formatDateTime(invoiceData.createdAt)}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold shrink-0">CUSTOMER:</span>
                <span className="font-bold text-right break-words">
                  {invoiceData.customerName || 'Walk-in Customer'}
                </span>
              </div>
              {invoiceData.customerPhone && (
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold shrink-0">MOBILE:</span>
                  <span className="font-bold text-right">
                    +91 {invoiceData.customerPhone.replace(/\D/g, '')}
                  </span>
                </div>
              )}
              {invoiceData.customerAddress && (
                <div className="flex justify-between items-start gap-2 text-[9.5px]">
                  <span className="shrink-0">ADDR:</span>
                  <span className="text-right leading-tight break-words">
                    {invoiceData.customerAddress}
                  </span>
                </div>
              )}
              {invoiceData.customerGstin && (
                <div className="flex justify-between items-center gap-2">
                  <span className="shrink-0">CUST GSTIN:</span>
                  <span className="font-bold">{invoiceData.customerGstin}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="shrink-0">CASHIER:</span>
                <span className="text-right break-words">{invoiceData.cashierName}</span>
              </div>
            </div>

            {/* 80mm Items Table */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="grid grid-cols-12 font-extrabold text-black pb-1 border-b border-black text-[10px] uppercase">
                <span className="col-span-5">ITEM</span>
                <span className="col-span-2 text-center">QTY</span>
                <span className="col-span-2 text-right">RATE</span>
                <span className="col-span-3 text-right">AMT</span>
              </div>

              <div className="divide-y divide-dotted divide-black/40 py-0.5">
                {invoiceData.items.map((item, idx) => {
                  const rowSlabs = enabledSlabs.some(s => s.rate === item.taxRate)
                    ? enabledSlabs
                    : [
                        ...enabledSlabs,
                        {
                          id: `inv-80-${item.taxRate}`,
                          rate: item.taxRate,
                          label: `GST ${formatGstRate(item.taxRate)}`,
                          enabled: true,
                        },
                      ].sort((a, b) => a.rate - b.rate);

                  return (
                    <div key={idx} className="py-1">
                      <div className="grid grid-cols-12 items-start text-[10.5px] gap-x-0.5">
                        <div className="col-span-5 pr-0.5 break-words">
                          <div className="font-bold leading-tight">{item.name}</div>
                          {showTaxBreakup && (
                            <div className="text-[9px]">
                              GST {formatGstRate(item.taxRate)}
                              {item.hsnCode ? ` · HSN:${item.hsnCode}` : ''}
                            </div>
                          )}
                        </div>
                        <span className="col-span-2 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <span className="col-span-2 text-right tabular-nums">
                          {item.unitPrice.toFixed(0)}
                        </span>
                        <span className="col-span-3 text-right font-bold tabular-nums">
                          {item.total.toFixed(2)}
                        </span>
                      </div>

                      {showInteractive && !isDraft && canModifyInvoice && isEditingItems && (
                        <div className="no-print mt-1 pb-0.5 flex flex-wrap items-center justify-between gap-1 text-[10px] font-sans">
                          <div className="flex items-center gap-1">
                            <select
                              value={item.taxRate}
                              onChange={e =>
                                updateInvoiceItemTaxRate(
                                  invoiceData.id,
                                  idx,
                                  Number(e.target.value)
                                )
                              }
                              className="px-1 py-0.5 rounded border border-neutral-300 bg-white font-mono text-[10px] text-neutral-800"
                            >
                              {rowSlabs.map(s => (
                                <option key={s.id} value={s.rate}>
                                  GST {formatGstRate(s.rate)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.taxRate}
                              onChange={e =>
                                updateInvoiceItemTaxRate(
                                  invoiceData.id,
                                  idx,
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-12 px-1 py-0.5 rounded border border-neutral-300 bg-white font-mono text-right text-[10px] text-neutral-900"
                            />
                            <span className="font-mono text-neutral-500">%</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateInvoiceItemQuantity(invoiceData.id, idx, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1 && invoiceData.items.length <= 1}
                              className="px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:opacity-40 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono font-semibold text-neutral-700">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateInvoiceItemQuantity(invoiceData.id, idx, item.quantity + 1)
                              }
                              className="px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                            >
                              +
                            </button>
                            {invoiceData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => updateInvoiceItemQuantity(invoiceData.id, idx, 0)}
                                className="px-1.5 py-0.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 80mm Totals & GST Breakup */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[10.5px]">
              <div className="flex justify-between">
                <span>Taxable Subtotal ({invoiceData.items.length}):</span>
                <span className="tabular-nums font-bold">₹{invoiceData.subtotal.toFixed(2)}</span>
              </div>

              {showInteractive && !isDraft && canModifyInvoice && isEditingItems && (
                <div className="no-print py-1.5 px-2 my-1 rounded bg-neutral-100 border border-neutral-300 flex items-center justify-between gap-1.5 font-sans text-[10px]">
                  <span className="font-semibold text-neutral-700 whitespace-nowrap">
                    Bill Disc:
                  </span>
                  <div className="flex items-center gap-1">
                    <select
                      value={invoiceData.billDiscountMode || 'percent'}
                      onChange={e =>
                        updateInvoiceBillDiscount(
                          invoiceData.id,
                          e.target.value as DiscountMode,
                          invoiceData.billDiscountValue || 0
                        )
                      }
                      className="px-1 py-0.5 rounded border border-neutral-300 bg-white font-mono text-[10px] text-neutral-800"
                    >
                      <option value="percent">% Off</option>
                      <option value="amount">₹ Flat</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      max={(invoiceData.billDiscountMode || 'percent') === 'percent' ? 100 : undefined}
                      step="0.01"
                      value={invoiceData.billDiscountValue || ''}
                      placeholder="0"
                      onChange={e =>
                        updateInvoiceBillDiscount(
                          invoiceData.id,
                          invoiceData.billDiscountMode || 'percent',
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-16 px-1.5 py-0.5 rounded border border-neutral-300 bg-white font-mono font-semibold text-right text-[10px] text-neutral-900 tabular-nums"
                    />
                  </div>
                </div>
              )}

              {invoiceData.discountTotal > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>{discountLabelText}</span>
                  <span className="tabular-nums">-₹{invoiceData.discountTotal.toFixed(2)}</span>
                </div>
              )}

              {showTaxBreakup && (
                <div className="flex justify-between">
                  <span>GST Total ({isInterstate ? 'IGST' : 'CGST+SGST'}):</span>
                  <span className="tabular-nums">₹{invoiceData.taxTotal.toFixed(2)}</span>
                </div>
              )}

              {showTaxBreakup && slabBreakup.length > 0 && (
                <div className="my-1.5 pt-1.5 pb-1 border-t border-dotted border-black text-[9px] tabular-nums">
                  <div className="font-bold mb-0.5 uppercase">GST Slab Summary:</div>
                  {isInterstate ? (
                    <div className="space-y-0.5">
                      <div className="grid grid-cols-12 font-bold">
                        <span className="col-span-4">SLAB</span>
                        <span className="col-span-4 text-right">TAXBL</span>
                        <span className="col-span-4 text-right">IGST</span>
                      </div>
                      {slabBreakup.map(row => (
                        <div key={row.rate} className="grid grid-cols-12">
                          <span className="col-span-4">{formatGstRate(row.rate)}</span>
                          <span className="col-span-4 text-right">{row.taxableAmount.toFixed(2)}</span>
                          <span className="col-span-4 text-right">{row.igstAmount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="grid grid-cols-12 font-bold">
                        <span className="col-span-3">SLAB</span>
                        <span className="col-span-3 text-right">TAXBL</span>
                        <span className="col-span-3 text-right">CGST</span>
                        <span className="col-span-3 text-right">SGST</span>
                      </div>
                      {slabBreakup.map(row => (
                        <div key={row.rate} className="grid grid-cols-12">
                          <span className="col-span-3">{formatGstRate(row.rate)}</span>
                          <span className="col-span-3 text-right">{row.taxableAmount.toFixed(1)}</span>
                          <span className="col-span-3 text-right">{row.cgstAmount.toFixed(2)}</span>
                          <span className="col-span-3 text-right">{row.sgstAmount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-black">
                <span>GRAND TOTAL:</span>
                <span className="tabular-nums">₹{invoiceData.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[10px] pt-0.5">
                <span>Payment:</span>
                <span className="uppercase font-bold">
                  {invoiceData.paymentMethod} ({invoiceData.status})
                </span>
              </div>

              {invoiceData.paymentMethod === 'cash' && invoiceData.amountTendered !== undefined && (
                <>
                  <div className="flex justify-between text-[10px]">
                    <span>Cash Tendered:</span>
                    <span className="tabular-nums">₹{invoiceData.amountTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Change Returned:</span>
                    <span className="tabular-nums">₹{(invoiceData.changeDue || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {showQr && upiQrUrl && (
              <div className="py-2.5 flex flex-col items-center justify-center text-center border-b border-dashed border-black">
                <img
                  src={upiQrUrl}
                  alt="UPI Payment QR"
                  className="w-24 h-24 border border-black p-0.5 bg-white"
                />
                <p className="text-[9.5px] font-bold mt-1">Scan to Pay via UPI</p>
                {settings.upiVpa && <p className="text-[9px] break-all">{settings.upiVpa}</p>}
              </div>
            )}

            <div className="pt-2 text-center text-[9.5px] space-y-1">
              <p className="font-bold">Thank you for visiting {settings.storeName}!</p>
              {showTerms && (
                <p className="text-[9px]">
                  Exchange within 7 days on presenting original bill.
                </p>
              )}
              <p className="text-[8.5px] tracking-wider pt-0.5">--- VyaparPOS ---</p>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FORMAT 3: 54mm MINIMUM / 58mm MINI THERMAL RECEIPT (48mm Printable)   */}
        {/* ===================================================================== */}
        {format === 'thermal58' && (
          <div className="text-black">
            {/* Compact 54mm Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="text-[11.5px] font-extrabold uppercase leading-tight break-words">
                {settings.storeName}
              </h2>
              {showAddress && settings.address && (
                <p className="text-[8.5px] mt-0.5 leading-tight whitespace-pre-line break-words">
                  {settings.address}
                </p>
              )}
              {settings.phone && <div className="text-[8.5px] mt-0.5">Ph: {settings.phone}</div>}
              {settings.gstin && (
                <div className="text-[8.5px] font-bold break-all">GSTIN:{settings.gstin}</div>
              )}
            </div>

            {/* Compact 54mm Meta */}
            <div className="py-1.5 border-b border-dashed border-black space-y-0.5 text-[9px]">
              <div className="flex justify-between gap-1">
                <span className="font-bold shrink-0">BILL:</span>
                <span className="font-bold text-right break-all">{invoiceData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between gap-1 text-[8.5px]">
                <span className="shrink-0">DATE:</span>
                <span className="text-right">{formatDateTime(invoiceData.createdAt)}</span>
              </div>
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold shrink-0">CUST:</span>
                <span className="font-bold text-right break-words">
                  {invoiceData.customerName || 'Walk-in'}
                </span>
              </div>
              {invoiceData.customerPhone && (
                <div className="flex justify-between gap-1">
                  <span className="font-bold shrink-0">MOB:</span>
                  <span className="font-bold text-right">
                    {invoiceData.customerPhone.replace(/\D/g, '')}
                  </span>
                </div>
              )}
              {invoiceData.customerGstin && (
                <div className="text-[8.5px] break-all">
                  <span className="font-bold">GSTIN: </span>
                  <span>{invoiceData.customerGstin}</span>
                </div>
              )}
            </div>

            {/* 54mm Stacked 2-Line Item Table (Zero Right-Edge Clipping on 48mm Strip) */}
            <div className="py-1.5 border-b border-dashed border-black">
              <div className="flex justify-between font-extrabold pb-1 border-b border-black text-[8.5px] uppercase">
                <span>ITEM / QTY × RATE</span>
                <span>AMT (₹)</span>
              </div>

              <div className="divide-y divide-dotted divide-black/40 py-0.5">
                {invoiceData.items.map((item, idx) => (
                  <div key={idx} className="py-1 text-[9px]">
                    <div className="font-bold leading-tight break-words">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="flex justify-between items-baseline gap-1 mt-0.5 tabular-nums">
                      <span className="text-[8.5px]">
                        {item.quantity}
                        {item.unit} × {item.unitPrice.toFixed(2)}
                        {showTaxBreakup ? ` (${formatGstRate(item.taxRate)})` : ''}
                      </span>
                      <span className="font-extrabold shrink-0">{item.total.toFixed(2)}</span>
                    </div>

                    {showInteractive && !isDraft && canModifyInvoice && isEditingItems && (
                      <div className="no-print mt-1 flex items-center justify-between gap-1 font-sans text-[9px]">
                        <button
                          type="button"
                          onClick={() =>
                            updateInvoiceItemQuantity(invoiceData.id, idx, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1 && invoiceData.items.length <= 1}
                          className="px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-100"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateInvoiceItemQuantity(invoiceData.id, idx, item.quantity + 1)
                          }
                          className="px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-100"
                        >
                          +
                        </button>
                        {invoiceData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => updateInvoiceItemQuantity(invoiceData.id, idx, 0)}
                            className="px-1 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 54mm Compact Totals */}
            <div className="py-1.5 border-b border-dashed border-black space-y-0.5 text-[9px] tabular-nums">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold">₹{invoiceData.subtotal.toFixed(2)}</span>
              </div>

              {showInteractive && !isDraft && canModifyInvoice && isEditingItems && (
                <div className="no-print py-1 px-1.5 my-1 rounded bg-neutral-100 border border-neutral-300 flex items-center justify-between gap-1 font-sans text-[9px]">
                  <select
                    value={invoiceData.billDiscountMode || 'percent'}
                    onChange={e =>
                      updateInvoiceBillDiscount(
                        invoiceData.id,
                        e.target.value as DiscountMode,
                        invoiceData.billDiscountValue || 0
                      )
                    }
                    className="px-1 py-0.5 rounded border border-neutral-300 bg-white font-mono text-[9px]"
                  >
                    <option value="percent">%</option>
                    <option value="amount">₹</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceData.billDiscountValue || ''}
                    placeholder="Disc"
                    onChange={e =>
                      updateInvoiceBillDiscount(
                        invoiceData.id,
                        invoiceData.billDiscountMode || 'percent',
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-14 px-1 py-0.5 rounded border border-neutral-300 bg-white font-mono text-right text-[9px]"
                  />
                </div>
              )}

              {invoiceData.discountTotal > 0 && (
                <div className="flex justify-between font-bold">
                  <span>
                    {invoiceData.billDiscountMode === 'percent' && invoiceData.billDiscountValue
                      ? `Disc (${invoiceData.billDiscountValue}%):`
                      : 'Discount:'}
                  </span>
                  <span>-₹{invoiceData.discountTotal.toFixed(2)}</span>
                </div>
              )}

              {showTaxBreakup && (
                <div className="flex justify-between">
                  <span>GST ({isInterstate ? 'IGST' : 'C+S'}):</span>
                  <span>₹{invoiceData.taxTotal.toFixed(2)}</span>
                </div>
              )}

              {showTaxBreakup && slabBreakup.length > 0 && (
                <div className="my-1 pt-1 border-t border-dotted border-black text-[8px]">
                  <div className="grid grid-cols-12 font-bold">
                    <span className="col-span-4">GST%</span>
                    <span className="col-span-4 text-right">TAXBL</span>
                    <span className="col-span-4 text-right">TAX</span>
                  </div>
                  {slabBreakup.map(row => (
                    <div key={row.rate} className="grid grid-cols-12">
                      <span className="col-span-4">{formatGstRate(row.rate)}</span>
                      <span className="col-span-4 text-right">{row.taxableAmount.toFixed(1)}</span>
                      <span className="col-span-4 text-right">{row.totalTax.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-[11px] font-extrabold pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span>₹{invoiceData.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[8.5px] pt-0.5">
                <span>Mode:</span>
                <span className="uppercase font-bold">{invoiceData.paymentMethod}</span>
              </div>

              {invoiceData.paymentMethod === 'cash' &&
                invoiceData.amountTendered !== undefined &&
                (invoiceData.changeDue || 0) > 0 && (
                  <div className="flex justify-between text-[8.5px] font-bold">
                    <span>Change:</span>
                    <span>₹{(invoiceData.changeDue || 0).toFixed(2)}</span>
                  </div>
                )}
            </div>

            {showQr && upiQrUrl && (
              <div className="py-2 flex flex-col items-center justify-center text-center border-b border-dashed border-black">
                <img
                  src={upiQrUrl}
                  alt="UPI QR"
                  className="w-20 h-20 border border-black p-0.5 bg-white"
                />
                <p className="text-[8.5px] font-bold mt-0.5">Scan & Pay UPI</p>
                {settings.upiVpa && <p className="text-[8px] break-all">{settings.upiVpa}</p>}
              </div>
            )}

            <div className="pt-1.5 text-center text-[8.5px] space-y-0.5">
              <p className="font-bold">Thank You! Visit Again</p>
              {showTerms && <p className="text-[8px]">7-day exchange with bill.</p>}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* FORMAT 2: FORMAL A4 GST TAX INVOICE FORMAT (210mm × 297mm Portrait)   */}
        {/* ===================================================================== */}
        {format === 'tax_invoice' && (
          <div className="space-y-3.5 text-black">
            {/* Top Header Row with Company Details & Tax Invoice Frame */}
            <div className="flex justify-between items-start border-b-2 border-black pb-3 gap-4 print-avoid-break">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-black shrink-0" />
                  <h1 className="text-xl font-extrabold tracking-tight text-black uppercase break-words">
                    {settings.storeName}
                  </h1>
                </div>
                {settings.tagline && (
                  <p className="text-xs text-neutral-700 font-medium mt-0.5">{settings.tagline}</p>
                )}
                {showAddress && settings.address && (
                  <p className="text-xs text-neutral-700 mt-1 max-w-md leading-snug whitespace-pre-line">
                    {settings.address}
                  </p>
                )}
                <div className="text-xs text-neutral-800 mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono">
                  {settings.phone && <span>Ph: {settings.phone}</span>}
                  {settings.email && <span>Email: {settings.email}</span>}
                  {settings.gstin && (
                    <span className="font-bold text-black">GSTIN: {settings.gstin}</span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 border-2 border-black bg-neutral-100 text-black font-extrabold text-xs uppercase tracking-wider">
                  TAX INVOICE
                </div>
                <div className="mt-2 text-xs font-mono space-y-0.5">
                  <div>
                    <span className="text-neutral-600">Invoice No: </span>
                    <span className="font-bold text-black">{invoiceData.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-neutral-600">Date: </span>
                    <span className="text-black">{formatDateTime(invoiceData.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-600">Cashier: </span>
                    <span className="text-black">{invoiceData.cashierName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To / Customer Information Box */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 border border-black/80 rounded-xs text-xs print-avoid-break">
              <div>
                <h4 className="font-bold text-black uppercase text-[11px] pb-1 border-b border-black/30 mb-1.5">
                  Billed To (Customer Details):
                </h4>
                <div className="space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="text-neutral-600 text-[11px] w-24 shrink-0 font-medium">
                      Customer Name:
                    </span>
                    <span className="font-bold text-black text-sm break-words">
                      {invoiceData.customerName || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-neutral-600 text-[11px] font-sans w-24 shrink-0 font-medium">
                      Mobile No:
                    </span>
                    <span className="font-bold text-black text-xs">
                      {invoiceData.customerPhone
                        ? `+91 ${invoiceData.customerPhone.replace(/\D/g, '')}`
                        : 'Walk-in (Not Specified)'}
                    </span>
                  </div>
                  {invoiceData.customerAddress && (
                    <div className="flex items-start gap-1.5 text-[11px]">
                      <span className="text-neutral-600 w-24 shrink-0 font-medium">Address:</span>
                      <span className="text-neutral-800 leading-snug break-words">
                        {invoiceData.customerAddress}
                      </span>
                    </div>
                  )}
                  {invoiceData.customerGstin && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-neutral-600 font-sans w-24 shrink-0 font-medium">
                        GSTIN / UIN:
                      </span>
                      <span className="font-bold text-black">{invoiceData.customerGstin}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-black uppercase text-[11px] mb-1">
                    Payment & Supply Details:
                  </h4>
                  <p className="font-semibold text-black uppercase">
                    Mode: {invoiceData.paymentMethod}
                  </p>
                  <p className="text-neutral-700 text-[11px]">
                    Supply: {isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                  </p>
                  <p className="text-neutral-700 text-[11px]">
                    Status: <span className="font-bold text-black uppercase">{invoiceData.status}</span>
                  </p>
                </div>

                {showQr && upiQrUrl && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <img
                      src={upiQrUrl}
                      alt="UPI QR"
                      className="w-16 h-16 border border-black p-0.5 bg-white"
                    />
                    <div className="text-left text-[10px]">
                      <p className="font-bold text-black">Scan to Pay UPI</p>
                      <p className="font-mono text-neutral-700 text-[9px]">{settings.upiVpa}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Formal A4 Line Items Table */}
            <div className="border border-black rounded-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-black text-black font-bold text-[11px] uppercase">
                    <th className="p-2 border-r border-black/60 w-9 text-center">#</th>
                    <th className="p-2 border-r border-black/60">Item Description</th>
                    <th className="p-2 border-r border-black/60 text-center w-14">Unit</th>
                    <th className="p-2 border-r border-black/60 text-center w-16">Qty</th>
                    <th className="p-2 border-r border-black/60 text-right w-20">Rate (₹)</th>
                    <th className="p-2 border-r border-black/60 text-center w-16">GST %</th>
                    <th className="p-2 border-r border-black/60 text-right w-20">Tax (₹)</th>
                    <th className="p-2 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30">
                  {invoiceData.items.map((item, idx) => {
                    const rowSlabs = enabledSlabs.some(s => s.rate === item.taxRate)
                      ? enabledSlabs
                      : [
                          ...enabledSlabs,
                          {
                            id: `a4-line-${item.taxRate}`,
                            rate: item.taxRate,
                            label: `GST ${formatGstRate(item.taxRate)}`,
                            enabled: true,
                          },
                        ].sort((a, b) => a.rate - b.rate);

                    return (
                      <tr key={idx}>
                        <td className="p-2 border-r border-black/40 text-center text-neutral-700 font-mono">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-black/40">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-black block break-words">
                                {item.name}
                              </span>
                              {(item.barcode || item.hsnCode) && (
                                <span className="text-[10px] text-neutral-600 font-mono">
                                  {item.barcode ? `SKU: ${item.barcode}` : ''}
                                  {item.barcode && item.hsnCode ? ' · ' : ''}
                                  {item.hsnCode ? `HSN: ${item.hsnCode}` : ''}
                                </span>
                              )}
                            </div>
                            {showInteractive &&
                              !isDraft &&
                              canModifyInvoice &&
                              isEditingItems &&
                              invoiceData.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateInvoiceItemQuantity(invoiceData.id, idx, 0)
                                  }
                                  className="no-print p-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                          </div>
                        </td>
                        <td className="p-2 border-r border-black/40 text-center text-neutral-800">
                          {item.unit || 'pcs'}
                        </td>
                        <td className="p-2 border-r border-black/40 text-center font-mono font-bold tabular-nums">
                          {showInteractive && !isDraft && canModifyInvoice && isEditingItems ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateInvoiceItemQuantity(
                                    invoiceData.id,
                                    idx,
                                    item.quantity - 1
                                  )
                                }
                                disabled={item.quantity <= 1 && invoiceData.items.length <= 1}
                                className="no-print w-5 h-5 rounded border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 disabled:opacity-40 cursor-pointer"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateInvoiceItemQuantity(
                                    invoiceData.id,
                                    idx,
                                    item.quantity + 1
                                  )
                                }
                                className="no-print w-5 h-5 rounded border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="p-2 border-r border-black/40 text-right font-mono tabular-nums">
                          {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="p-2 border-r border-black/40 text-center font-mono tabular-nums">
                          {showInteractive && !isDraft && canModifyInvoice && isEditingItems ? (
                            <div className="no-print flex flex-col items-center gap-1">
                              <select
                                value={item.taxRate}
                                onChange={e =>
                                  updateInvoiceItemTaxRate(
                                    invoiceData.id,
                                    idx,
                                    Number(e.target.value)
                                  )
                                }
                                className="px-1 py-0.5 rounded border border-neutral-300 bg-white text-[10px]"
                              >
                                {rowSlabs.map(s => (
                                  <option key={s.id} value={s.rate}>
                                    {formatGstRate(s.rate)}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.taxRate}
                                onChange={e =>
                                  updateInvoiceItemTaxRate(
                                    invoiceData.id,
                                    idx,
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-12 px-1 py-0.5 rounded border border-neutral-300 bg-white text-center text-[10px]"
                              />
                            </div>
                          ) : (
                            formatGstRate(item.taxRate)
                          )}
                        </td>
                        <td className="p-2 border-r border-black/40 text-right font-mono text-neutral-800 tabular-nums">
                          {item.taxAmount.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-black tabular-nums">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Formal Slab-Wise GST Tax Summary Table */}
            {showTaxBreakup && slabBreakup.length > 0 && (
              <div className="border border-black rounded-xs overflow-hidden print-avoid-break">
                <div className="px-2.5 py-1.5 bg-neutral-100 border-b border-black text-[10px] font-bold uppercase text-black flex justify-between">
                  <span>
                    GST Slab-Wise Tax Breakup (
                    {isInterstate ? 'Inter-State IGST' : 'Intra-State CGST + SGST'})
                  </span>
                  <span className="font-mono">
                    Total GST: ₹{invoiceData.taxTotal.toFixed(2)}
                  </span>
                </div>
                <table className="w-full text-left text-[11px] font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-black/50 text-black font-sans font-semibold">
                      <th className="p-1.5 border-r border-black/40">GST Slab</th>
                      <th className="p-1.5 border-r border-black/40 text-right">
                        Taxable Value (₹)
                      </th>
                      {isInterstate ? (
                        <th className="p-1.5 border-r border-black/40 text-right">
                          IGST (Rate & Amt)
                        </th>
                      ) : (
                        <>
                          <th className="p-1.5 border-r border-black/40 text-right">
                            CGST (Rate & Amt)
                          </th>
                          <th className="p-1.5 border-r border-black/40 text-right">
                            SGST (Rate & Amt)
                          </th>
                        </>
                      )}
                      <th className="p-1.5 text-right">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/30">
                    {slabBreakup.map(row => (
                      <tr key={row.rate}>
                        <td className="p-1.5 border-r border-black/40 font-bold text-black">
                          GST {formatGstRate(row.rate)}
                        </td>
                        <td className="p-1.5 border-r border-black/40 text-right">
                          {row.taxableAmount.toFixed(2)}
                        </td>
                        {isInterstate ? (
                          <td className="p-1.5 border-r border-black/40 text-right">
                            <span className="text-neutral-600 text-[10px] mr-1.5">
                              @{row.igstRate}%
                            </span>
                            <span>{row.igstAmount.toFixed(2)}</span>
                          </td>
                        ) : (
                          <>
                            <td className="p-1.5 border-r border-black/40 text-right">
                              <span className="text-neutral-600 text-[10px] mr-1.5">
                                @{row.cgstRate}%
                              </span>
                              <span>{row.cgstAmount.toFixed(2)}</span>
                            </td>
                            <td className="p-1.5 border-r border-black/40 text-right">
                              <span className="text-neutral-600 text-[10px] mr-1.5">
                                @{row.sgstRate}%
                              </span>
                              <span>{row.sgstAmount.toFixed(2)}</span>
                            </td>
                          </>
                        )}
                        <td className="p-1.5 text-right font-bold text-black">
                          {row.totalTax.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary, Total in Words & Signatory */}
            <div className="grid grid-cols-12 gap-4 pt-1 print-avoid-break">
              <div className="col-span-7 space-y-3 text-xs">
                <div className="p-2.5 bg-neutral-50 border border-black/60 rounded-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 block">
                    Total Amount in Words:
                  </span>
                  <p className="font-bold text-black italic mt-0.5">
                    {numberToIndianWords(invoiceData.grandTotal)}
                  </p>
                </div>

                {showTerms && (
                  <div className="text-[10px] text-neutral-700 leading-snug space-y-0.5">
                    <p className="font-bold text-black">Terms & Conditions:</p>
                    <p>
                      1. Goods once sold will be accepted for return within 7 days in original
                      condition.
                    </p>
                    <p>2. Subject to local jurisdiction only.</p>
                    <p>
                      3. This is a computer generated invoice and requires no physical stamp.
                    </p>
                  </div>
                )}
              </div>

              <div className="col-span-5 text-xs space-y-1 border border-black p-3 rounded-xs bg-neutral-50/40">
                <div className="flex justify-between text-neutral-800">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono font-bold tabular-nums">
                    ₹{invoiceData.subtotal.toFixed(2)}
                  </span>
                </div>

                {showInteractive && !isDraft && canModifyInvoice && isEditingItems && (
                  <div className="no-print py-1.5 px-2 rounded bg-white border border-neutral-300 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-neutral-700 whitespace-nowrap">
                      Custom Bill Discount:
                    </span>
                    <div className="flex items-center gap-1">
                      <select
                        value={invoiceData.billDiscountMode || 'percent'}
                        onChange={e =>
                          updateInvoiceBillDiscount(
                            invoiceData.id,
                            e.target.value as DiscountMode,
                            invoiceData.billDiscountValue || 0
                          )
                        }
                        className="px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-50 font-mono text-[11px] text-neutral-800"
                      >
                        <option value="percent">%</option>
                        <option value="amount">₹</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max={
                          (invoiceData.billDiscountMode || 'percent') === 'percent'
                            ? 100
                            : undefined
                        }
                        step="0.01"
                        value={invoiceData.billDiscountValue || ''}
                        placeholder="Custom"
                        onChange={e =>
                          updateInvoiceBillDiscount(
                            invoiceData.id,
                            invoiceData.billDiscountMode || 'percent',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-20 px-1.5 py-0.5 rounded border border-neutral-300 bg-white font-mono font-semibold text-right text-[11px] text-neutral-900 tabular-nums"
                      />
                    </div>
                  </div>
                )}

                {invoiceData.discountTotal > 0 && (
                  <div className="flex justify-between text-black font-semibold">
                    <span>
                      {invoiceData.billDiscountMode === 'percent' &&
                      invoiceData.billDiscountValue
                        ? `Discount Applied (${invoiceData.billDiscountValue}%):`
                        : invoiceData.billDiscountMode === 'amount' &&
                          invoiceData.billDiscountValue
                        ? `Discount Applied (Flat ₹${invoiceData.billDiscountValue}):`
                        : 'Discount Applied:'}
                    </span>
                    <span className="font-mono tabular-nums">
                      -₹{invoiceData.discountTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-800">
                  <span>
                    {isInterstate ? 'IGST (Total Tax):' : 'CGST + SGST (Total Tax):'}
                  </span>
                  <span className="font-mono tabular-nums">
                    ₹{invoiceData.taxTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-base font-extrabold text-black pt-2 border-t-2 border-black">
                  <span>TOTAL PAYABLE:</span>
                  <span className="font-mono tabular-nums">
                    ₹{invoiceData.grandTotal.toFixed(2)}
                  </span>
                </div>

                <div className="pt-8 text-right text-[11px] text-neutral-800">
                  <div className="h-10 border-b border-dashed border-black mb-1" />
                  <span className="font-bold uppercase block text-black">
                    For {settings.storeName}
                  </span>
                  <span className="text-[10px] text-neutral-600">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto no-print">
        {/* Modal Container */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-5xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 my-auto flex flex-col max-h-[94vh] overflow-hidden">
          {/* Top Toolbar Header */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {isDraft ? 'Draft Bill Print Preview' : 'Print Preview & Invoice'}
                  </h3>
                  <span className="text-neutral-400">·</span>
                  {isDraft ? (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Draft / Pre-Check
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                      {invoiceData.invoiceNumber}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  1:1 Exact Preview & Print (80mm · A4 · 54mm). Press{' '}
                  <kbd className="font-mono px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-[10px]">
                    Ctrl+P
                  </kbd>{' '}
                  to print.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canModifyInvoice && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Add Item to Invoice (इनवॉइस में आइटम जोड़ें)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Item</span>
                  </button>
                  {!isDraft && (
                    <button
                      type="button"
                      onClick={() => setIsEditingItems(prev => !prev)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isEditingItems
                          ? 'border-neutral-800 bg-neutral-900 text-white dark:bg-amber-500 dark:text-neutral-950 dark:border-amber-400'
                          : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title="Edit Quantity, GST Slab or Bill Discount"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{isEditingItems ? 'Done Editing' : 'Edit Bill'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSlabManagerOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Manage Custom & All GST Slabs"
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>GST Slabs</span>
                  </button>
                </>
              )}

              {/* Format Selector Segmented Control (80mm Thermal | A4 Tax Invoice | 54mm Mini) */}
              <div className="flex items-center bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFormat('thermal80')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    format === 'thermal58'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  54mm Mini
                </button>
              </div>

              {/* Customizer Toggle */}
              <button
                type="button"
                onClick={() => setShowCustomizer(!showCustomizer)}
                title="Customize Print Layout"
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
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
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secondary Options Drawer */}
          {showCustomizer && (
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Display Options:
                </span>
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

              <div className="flex items-center gap-1">
                <span className="text-neutral-500 mr-1">Preview Zoom:</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                  className="p-1 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] w-10 text-center font-medium">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
                  className="p-1 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 ml-1 cursor-pointer"
                >
                  100%
                </button>
              </div>
            </div>
          )}

          {/* Paper Canvas Preview Area — Exact 1:1 WYSIWYG Physical Millimeter Sheet */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-200/70 dark:bg-neutral-950 flex flex-col items-center justify-start min-h-[380px]">
            <div className="mb-3 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 text-center">
              {format === 'thermal80'
                ? '1:1 Exact 80mm Thermal Sheet (72mm Inner Print Area) · Preview = Print'
                : format === 'tax_invoice'
                ? '1:1 Exact A4 Tax Invoice Sheet (210mm × 297mm) · Preview = Print'
                : '1:1 Exact 54mm Mini Thermal Sheet (48mm Inner Print Area) · Preview = Print'}
            </div>

            <div
              style={
                zoomLevel !== 100
                  ? {
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                    }
                  : undefined
              }
              className="transition-transform duration-150 shrink-0"
            >
              {renderReceiptDocument(false)}
            </div>
          </div>

          {/* Action Toolbar Bottom Bar */}
          <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {canModifyInvoice && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Item (आइटम जोड़ें)</span>
                  </button>
                  {!isDraft && (
                    <button
                      type="button"
                      onClick={() => setIsEditingItems(prev => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isEditingItems
                          ? 'border-neutral-800 bg-neutral-900 text-white dark:bg-amber-500 dark:text-neutral-950 dark:border-amber-400'
                          : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{isEditingItems ? 'Done Editing' : 'Edit Qty / GST / Disc'}</span>
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Complete Sale & Print</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  Print{' '}
                  {format === 'thermal80'
                    ? '80mm'
                    : format === 'thermal58'
                    ? '54mm'
                    : 'A4'}{' '}
                  (Ctrl+P)
                </span>
              </button>
            </div>
          </div>
        </div>

        <AddInvoiceItemModal
          isOpen={isAddItemModalOpen}
          mode={isDraft ? 'cart' : 'existing-invoice'}
          targetInvoice={isDraft ? null : invoiceData}
          onClose={() => setIsAddItemModalOpen(false)}
        />

        <GstSlabManagerModal
          isOpen={isSlabManagerOpen}
          onClose={() => setIsSlabManagerOpen(false)}
        />
      </div>

      {/* Dedicated Body Root Print Portal for Native Browser Print Fallback */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="vyapar-print-portal" data-print-mode={format}>
            {renderReceiptDocument(true)}
          </div>,
          document.body
        )}
    </>
  );
};
