import { Invoice, StoreSettings } from '../types';
import { formatDateTime } from './formatters';

/**
 * Escapes a CSV cell value to handle commas, quotes, and newlines.
 */
function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports an array of invoices into a comprehensive CSV file.
 * Includes UTF-8 BOM so Excel opens Hindi/international characters properly.
 */
export function exportInvoicesToCSV(
  invoices: Invoice[],
  settings?: StoreSettings,
  customFilename?: string
): void {
  if (invoices.length === 0) return;

  const headers = [
    'Invoice No',
    'Date & Time',
    'Customer Name',
    'Customer Phone',
    'Customer GSTIN',
    'Customer Address',
    'Items Count',
    'Items Breakdown',
    'Taxable Subtotal (INR)',
    'Tax Total (INR)',
    'Discount Total (INR)',
    'Grand Total (INR)',
    'Payment Method',
    'Payment Status',
    'Cashier Name',
    'Notes',
  ];

  const rows: string[][] = invoices.map(inv => {
    const itemsSummary = inv.items
      .map(it => `${it.name} (Qty: ${it.quantity} @ Rs.${it.unitPrice}${it.taxRate ? ` +GST ${it.taxRate}%` : ''})`)
      .join('; ');

    return [
      inv.invoiceNumber,
      formatDateTime(inv.createdAt),
      inv.customerName || 'Walk-in',
      inv.customerPhone || '',
      inv.customerGstin || '',
      inv.customerAddress || '',
      String(inv.items.reduce((s, it) => s + it.quantity, 0)),
      itemsSummary,
      inv.subtotal.toFixed(2),
      inv.taxTotal.toFixed(2),
      inv.discountTotal.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.paymentMethod.toUpperCase(),
      inv.status.toUpperCase(),
      inv.cashierName || '',
      inv.notes || '',
    ];
  });

  // Calculate totals for footer summary row
  const totalItemsCount = invoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity, 0),
    0
  );
  const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalTax = invoices.reduce((sum, inv) => sum + inv.taxTotal, 0);
  const totalDiscount = invoices.reduce((sum, inv) => sum + inv.discountTotal, 0);
  const totalGrand = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  const summaryRow = [
    `TOTAL (${invoices.length} INVOICES)`,
    '',
    '',
    '',
    '',
    '',
    String(totalItemsCount),
    '',
    totalSubtotal.toFixed(2),
    totalTax.toFixed(2),
    totalDiscount.toFixed(2),
    totalGrand.toFixed(2),
    '',
    '',
    '',
    '',
  ];

  // Assemble CSV content with UTF-8 BOM
  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCSV).join(','),
      ...rows.map(r => r.map(escapeCSV).join(',')),
      summaryRow.map(escapeCSV).join(','),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  const storePrefix = settings?.storeName
    ? settings.storeName.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'VyaparPOS';
  a.download = customFilename || `${storePrefix}_Invoices_Report_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
