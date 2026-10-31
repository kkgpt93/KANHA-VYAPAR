import { Invoice, StoreSettings } from '../types';

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

export function generateInvoiceNumber(existingCount: number = 0): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const seq = (existingCount + 1).toString().padStart(4, '0');
  return `INV-${year}${month}-${seq}`;
}

export function generateBarcode(): string {
  // Generate valid 13-digit EAN style barcode number
  const prefix = '890'; // Common India prefix
  const middle = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${middle.slice(0, 10)}`;
}

export function buildWhatsAppInvoiceText(invoice: Invoice, settings: StoreSettings): string {
  const lines: string[] = [
    `🧾 *${settings.storeName.toUpperCase()}*`,
    `${settings.tagline}`,
    `📞 Phone: ${settings.phone}`,
    `📍 ${settings.address}`,
    `--------------------------------`,
    `*Invoice:* ${invoice.invoiceNumber}`,
    `*Date:* ${formatDateTime(invoice.createdAt)}`,
    `*Customer:* ${invoice.customerName || 'Walk-in Customer'}`,
    ...(invoice.customerPhone ? [`*Mobile No:* +91 ${invoice.customerPhone}`] : []),
    ...(invoice.customerGstin ? [`*GSTIN:* ${invoice.customerGstin}`] : []),
    ...(invoice.customerAddress ? [`*Address:* ${invoice.customerAddress}`] : []),
    `--------------------------------`,
    `*ITEMS:*`,
  ];

  invoice.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name} (${item.quantity} ${item.unit}) @ ₹${item.unitPrice.toFixed(2)} = *₹${item.total.toFixed(2)}*`
    );
  });

  lines.push(`--------------------------------`);
  lines.push(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`);
  if (invoice.discountTotal > 0) {
    lines.push(`Discount: -₹${invoice.discountTotal.toFixed(2)}`);
  }
  if (invoice.taxTotal > 0) {
    lines.push(`GST/Tax: ₹${invoice.taxTotal.toFixed(2)}`);
  }
  lines.push(`*GRAND TOTAL: ₹${invoice.grandTotal.toFixed(2)}*`);
  lines.push(`Payment Mode: ${invoice.paymentMethod.toUpperCase()} (${invoice.status.toUpperCase()})`);
  lines.push(`--------------------------------`);
  if (settings.upiVpa) {
    lines.push(`📲 Pay via UPI: ${settings.upiVpa}`);
  }
  lines.push(`Thank you for shopping with us! 🙏`);

  return encodeURIComponent(lines.join('\n'));
}
