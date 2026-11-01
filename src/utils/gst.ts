import { GstPriceMode, GstSlabConfig, InvoiceItem } from '../types';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatGstRate(rate: number): string {
  const clean = Number.isFinite(rate) ? Number(rate.toFixed(3)) : 0;
  return `${clean}%`;
}

export const DEFAULT_GST_SLABS: GstSlabConfig[] = [
  {
    id: 'gst-0',
    rate: 0,
    label: 'GST 0% (Exempt)',
    description: 'Nil / Exempt — Fresh Milk, Unbranded Grains, Vegetables',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-0.25',
    rate: 0.25,
    label: 'GST 0.25%',
    description: 'Rough Diamonds & Precious Stones (CGST 0.125% + SGST 0.125%)',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-1.5',
    rate: 1.5,
    label: 'GST 1.5%',
    description: 'Cut/Polished Stones & Composition Slab (CGST 0.75% + SGST 0.75%)',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-3',
    rate: 3,
    label: 'GST 3% (Gold/Silver)',
    description: 'Gold, Silver, Jewellery & Bullion (CGST 1.5% + SGST 1.5%)',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-5',
    rate: 5,
    label: 'GST 5%',
    description: 'Essential Packaged Kirana, Spices, Footwear, Apparel (CGST 2.5% + SGST 2.5%)',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-12',
    rate: 12,
    label: 'GST 12%',
    description: 'Processed Foods, Butter/Ghee, Utensils, Medicines (CGST 6% + SGST 6%)',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-18',
    rate: 18,
    label: 'GST 18%',
    description: 'Standard FMCG, Electronics, Hardware, Mobile, Services (CGST 9% + SGST 9%)',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-28',
    rate: 28,
    label: 'GST 28%',
    description: 'Luxury Goods, AC, Refrigerators, Cement, Auto Parts (CGST 14% + SGST 14%)',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'gst-40',
    rate: 40,
    label: 'GST 40%',
    description: 'Special / Demerit Slab (CGST 20% + SGST 20%)',
    enabled: false,
    isCustom: false,
  },
];

export function normalizeGstSlabs(slabs?: GstSlabConfig[]): GstSlabConfig[] {
  if (!Array.isArray(slabs) || slabs.length === 0) {
    return DEFAULT_GST_SLABS;
  }
  return [...slabs].sort((a, b) => a.rate - b.rate);
}

export function getEnabledGstSlabs(slabs?: GstSlabConfig[]): GstSlabConfig[] {
  const all = normalizeGstSlabs(slabs);
  const enabled = all.filter(s => s.enabled);
  return enabled.length > 0 ? enabled : [all[0]];
}

export function calculateLineGst(params: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  existingDiscountAmount?: number;
  taxRate: number;
  priceMode?: GstPriceMode;
}): {
  gross: number;
  discountAmount: number;
  taxableValue: number;
  taxAmount: number;
  total: number;
} {
  const qty = Math.max(0, Number(params.quantity) || 0);
  const rate = Math.max(0, Number(params.unitPrice) || 0);
  const taxRate = Math.max(0, Number(params.taxRate) || 0);
  const priceMode = params.priceMode || 'exclusive';

  const gross = roundCurrency(qty * rate);
  const discountAmount =
    params.existingDiscountAmount !== undefined
      ? roundCurrency(Math.min(gross, Math.max(0, params.existingDiscountAmount)))
      : roundCurrency((gross * Math.max(0, Math.min(100, Number(params.discountPercent) || 0))) / 100);

  const netInput = roundCurrency(Math.max(0, gross - discountAmount));

  if (priceMode === 'inclusive') {
    const total = netInput;
    const taxableValue =
      taxRate > 0 ? roundCurrency(total / (1 + taxRate / 100)) : total;
    const taxAmount = roundCurrency(Math.max(0, total - taxableValue));
    return { gross, discountAmount, taxableValue, taxAmount, total };
  }

  // Default: 'exclusive' (GST charged on top of net rate)
  const taxableValue = netInput;
  const taxAmount = roundCurrency((taxableValue * taxRate) / 100);
  const total = roundCurrency(taxableValue + taxAmount);
  return { gross, discountAmount, taxableValue, taxAmount, total };
}

export interface GstSlabBreakupRow {
  rate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalWithTax: number;
  itemCount: number;
}

export function computeInvoiceSlabBreakup(items: InvoiceItem[]): GstSlabBreakupRow[] {
  const map = new Map<number, { taxable: number; tax: number; count: number }>();

  items.forEach(item => {
    const rate = Number.isFinite(item.taxRate) ? Number(item.taxRate.toFixed(3)) : 0;
    const tax = roundCurrency(item.taxAmount || 0);
    const taxable = roundCurrency(Math.max(0, (item.total || 0) - tax));
    const prev = map.get(rate) || { taxable: 0, tax: 0, count: 0 };
    map.set(rate, {
      taxable: roundCurrency(prev.taxable + taxable),
      tax: roundCurrency(prev.tax + tax),
      count: prev.count + item.quantity,
    });
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rate, agg]) => {
      const halfRate = Number((rate / 2).toFixed(3));
      const cgstAmount = roundCurrency(agg.tax / 2);
      const sgstAmount = roundCurrency(agg.tax - cgstAmount);
      return {
        rate,
        cgstRate: halfRate,
        sgstRate: halfRate,
        igstRate: rate,
        taxableAmount: agg.taxable,
        cgstAmount,
        sgstAmount,
        igstAmount: agg.tax,
        totalTax: agg.tax,
        totalWithTax: roundCurrency(agg.taxable + agg.tax),
        itemCount: agg.count,
      };
    });
}
