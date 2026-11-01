import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Minus,
  Search,
  X,
  Check,
  PackagePlus,
  ShoppingBag,
  Trash2,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  AlertCircle,
  Percent,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice, InvoiceItemInput, PaymentMethod, Product } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  calculateLineGst,
  formatGstRate,
  getEnabledGstSlabs,
  roundCurrency,
} from '../utils/gst';
import { GstSlabPicker } from './GstSlabPicker';
import { GstSlabManagerModal } from './GstSlabManagerModal';

export interface AddInvoiceItemModalProps {
  isOpen: boolean;
  mode: 'cart' | 'existing-invoice' | 'new-invoice';
  targetInvoice?: Invoice | null;
  initialItemName?: string;
  onClose: () => void;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

const UNITS: Product['unit'][] = ['pcs', 'kg', 'g', 'ltr', 'ml', 'pkt', 'box'];

export const AddInvoiceItemModal: React.FC<AddInvoiceItemModalProps> = ({
  isOpen,
  mode,
  targetInvoice,
  initialItemName = '',
  onClose,
  onInvoiceCreated,
}) => {
  const {
    products,
    invoices,
    settings,
    addCustomOrCatalogItemToCart,
    addItemToInvoice,
    createDirectInvoice,
  } = useApp();

  // Live reference to target invoice so updated totals reflect immediately
  const liveTargetInvoice = useMemo(() => {
    if (!targetInvoice) return null;
    return invoices.find(i => i.id === targetInvoice.id) || targetInvoice;
  }, [invoices, targetInvoice]);

  const effectivePriceMode =
    liveTargetInvoice?.gstPriceMode || settings.gstPriceMode || 'exclusive';

  const enabledSlabs = useMemo(
    () => getEnabledGstSlabs(settings.gstSlabs),
    [settings.gstSlabs]
  );

  const [entryTab, setEntryTab] = useState<'custom' | 'catalog'>(() =>
    initialItemName || products.length === 0 ? 'custom' : 'catalog'
  );
  const [isSlabManagerOpen, setIsSlabManagerOpen] = useState(false);

  // Custom item fields
  const [itemName, setItemName] = useState(initialItemName);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<Product['unit']>('pcs');
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate ?? 0);
  const [hsnCode, setHsnCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [saveToInventory, setSaveToInventory] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('General');
  const [initialStock, setInitialStock] = useState<number>(50);

  // Catalog search, per-product quick qty & per-product GST slab override
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogQuantities, setCatalogQuantities] = useState<Record<string, number>>({});
  const [catalogTaxOverrides, setCatalogTaxOverrides] = useState<Record<string, number>>({});

  // New-invoice mode draft items & customer fields
  const [draftItems, setDraftItems] = useState<InvoiceItemInput[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Feedback & validation messages
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItemName(initialItemName || '');
      setTaxRate(settings.defaultTaxRate ?? 0);
      setEntryTab(initialItemName || products.length === 0 ? 'custom' : 'catalog');
      setErrorMsg(null);
      setFeedbackMsg(null);
    }
  }, [isOpen, initialItemName, products.length, settings.defaultTaxRate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (isSlabManagerOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isSlabManagerOpen, onClose]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.nameHindi && p.nameHindi.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.hsnCode && p.hsnCode.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, catalogSearch]);

  // Live preview of the custom item form using accurate multi-slab GST math
  const customPreview = useMemo(() => {
    const calc = calculateLineGst({
      quantity: Math.max(1, Number(quantity) || 1),
      unitPrice: Math.max(0, Number(unitPrice) || 0),
      discountPercent: Math.max(0, Math.min(100, discountPercent)),
      taxRate,
      priceMode: effectivePriceMode,
    });
    return {
      gross: calc.gross,
      discAmt: calc.discountAmount,
      taxableValue: calc.taxableValue,
      taxAmt: calc.taxAmount,
      total: calc.total,
    };
  }, [unitPrice, quantity, discountPercent, taxRate, effectivePriceMode]);

  // Draft totals for mode === 'new-invoice'
  const draftTotals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    draftItems.forEach(it => {
      const calc = calculateLineGst({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent || 0,
        taxRate: it.taxRate,
        priceMode: effectivePriceMode,
      });
      subtotal = roundCurrency(subtotal + calc.taxableValue + calc.discountAmount);
      discountTotal = roundCurrency(discountTotal + calc.discountAmount);
      taxTotal = roundCurrency(taxTotal + calc.taxAmount);
    });
    const grandTotal = roundCurrency(Math.max(0, subtotal + taxTotal - discountTotal));
    return { subtotal, discountTotal, taxTotal, grandTotal };
  }, [draftItems, effectivePriceMode]);

  if (!isOpen) return null;

  const flashFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setErrorMsg(null);
    setTimeout(() => {
      setFeedbackMsg(prev => (prev === msg ? null : prev));
    }, 2600);
  };

  const resetCustomForm = () => {
    setItemName('');
    setUnitPrice('');
    setHsnCode('');
    setQuantity(1);
    setDiscountPercent(0);
  };

  const buildCustomInput = (): InvoiceItemInput | null => {
    const trimmed = itemName.trim();
    const numericPrice = Number(unitPrice);
    if (!trimmed) {
      setErrorMsg('कृपया आइटम का नाम लिखें (Please enter item name).');
      return null;
    }
    if (unitPrice === '' || isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg('कृपया सही कीमत दर्ज करें (Please enter a valid item rate).');
      return null;
    }
    return {
      name: trimmed,
      category: category.trim() || 'General',
      hsnCode: hsnCode.trim() || undefined,
      unit,
      quantity: Math.max(1, Number(quantity) || 1),
      unitPrice: numericPrice,
      taxRate,
      discountPercent,
      saveToInventory,
      initialStock: saveToInventory ? Math.max(1, Number(initialStock) || 50) : undefined,
    };
  };

  const dispatchItemAddition = (input: InvoiceItemInput, closeAfter: boolean) => {
    if (mode === 'cart') {
      addCustomOrCatalogItemToCart(input);
      if (closeAfter) {
        onClose();
      } else {
        flashFeedback(
          `"${input.name}" (×${input.quantity}, GST ${formatGstRate(input.taxRate)}) बिल में जोड़ा गया!`
        );
        resetCustomForm();
      }
      return;
    }

    if (mode === 'existing-invoice') {
      if (!liveTargetInvoice) {
        setErrorMsg('No active invoice selected.');
        return;
      }
      const updated = addItemToInvoice(liveTargetInvoice.id, input);
      if (!updated) {
        setErrorMsg('Refunded invoice cannot be modified.');
        return;
      }
      if (closeAfter) {
        onClose();
      } else {
        flashFeedback(
          `"${input.name}" (GST ${formatGstRate(input.taxRate)}) ${updated.invoiceNumber} में जोड़ा गया!`
        );
        resetCustomForm();
      }
      return;
    }

    // mode === 'new-invoice'
    setDraftItems(prev => {
      const existingIdx = prev.findIndex(
        it =>
          input.productId &&
          it.productId === input.productId &&
          it.unitPrice === input.unitPrice &&
          it.taxRate === input.taxRate
      );
      if (existingIdx >= 0) {
        return prev.map((it, idx) =>
          idx === existingIdx ? { ...it, quantity: it.quantity + input.quantity } : it
        );
      }
      return [...prev, input];
    });
    flashFeedback(
      `"${input.name}" (GST ${formatGstRate(input.taxRate)}) इनवॉइस लिस्ट में जोड़ा गया!`
    );
    resetCustomForm();
  };

  const handleAddCustomSubmit = (closeAfter: boolean) => {
    const built = buildCustomInput();
    if (!built) return;
    dispatchItemAddition(built, closeAfter);
  };

  const handleAddCatalogProduct = (product: Product, closeAfter = false) => {
    const qty = Math.max(1, catalogQuantities[product.id] || 1);
    const selectedSlabRate =
      catalogTaxOverrides[product.id] !== undefined
        ? catalogTaxOverrides[product.id]
        : product.taxRate;

    const input: InvoiceItemInput = {
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      hsnCode: product.hsnCode,
      unit: product.unit,
      quantity: qty,
      unitPrice: product.sellingPrice,
      taxRate: selectedSlabRate,
      discountPercent: 0,
    };
    dispatchItemAddition(input, closeAfter);
    setCatalogQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const handleFinalizeNewInvoice = () => {
    let itemsToCreate = [...draftItems];

    if (itemName.trim() && unitPrice !== '' && !isNaN(Number(unitPrice))) {
      const pendingItem = buildCustomInput();
      if (pendingItem) {
        itemsToCreate = [...itemsToCreate, pendingItem];
      }
    }

    if (itemsToCreate.length === 0) {
      setErrorMsg('इनवॉइस बनाने के लिए कम से कम 1 आइटम जोड़ें (Add at least 1 item to create invoice).');
      return;
    }

    try {
      const created = createDirectInvoice({
        items: itemsToCreate,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentMethod,
      });
      onClose();
      if (onInvoiceCreated) {
        onInvoiceCreated(created);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  };

  const modalTitle =
    mode === 'existing-invoice' && liveTargetInvoice
      ? `Add Item to Invoice · ${liveTargetInvoice.invoiceNumber}`
      : mode === 'new-invoice'
      ? 'Create Invoice & Add Items (नया इनवॉइस / GST बिल बनाएं)'
      : 'Add Item to Current Bill (बिल में आइटम और GST स्लैब जोड़ें)';

  const modalSubtitle =
    mode === 'existing-invoice' && liveTargetInvoice
      ? `Customer: ${liveTargetInvoice.customerName || 'Walk-in'} · Items: ${liveTargetInvoice.items.reduce(
          (s, i) => s + i.quantity,
          0
        )} · Current Total: ${formatCurrency(liveTargetInvoice.grandTotal, settings.currencySymbol)}`
      : mode === 'new-invoice'
      ? 'किसी भी GST स्लैब (0%, 3%, 5%, 12%, 18%, 28% या कस्टम %) के साथ तुरंत बिल बनाएं'
      : 'इन्वेंटरी से चुनें या किसी भी कस्टम GST % स्लैब के साथ सीधा आइटम जोड़ें';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Signature Command Header */}
        <div className="px-4 sm:px-5 py-3.5 brand-command-surface text-white border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 truncate">
              <PackagePlus className="w-4 h-4 brand-gold-text shrink-0" />
              <span className="truncate">{modalTitle}</span>
            </h3>
            <p className="text-[11px] text-white/75 mt-0.5 truncate">{modalSubtitle}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsSlabManagerOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
              title="Configure All GST Slabs"
            >
              <Percent className="w-3.5 h-3.5 brand-gold-text" />
              <span className="hidden sm:inline">GST Slabs</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Mode Switch Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-2.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex p-1 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setEntryTab('custom');
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                entryTab === 'custom'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              + Custom / New Item (नया आइटम)
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryTab('catalog');
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                entryTab === 'catalog'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              From Inventory ({products.length})
            </button>
          </div>

          {feedbackMsg && (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{feedbackMsg}</span>
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: CUSTOM / MANUAL ITEM FORM */}
          {entryTab === 'custom' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Item Name (आइटम का नाम) *
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={e => {
                      setItemName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="e.g. Basmati Rice 1kg / Gold Ring / Mobile Charger"
                    autoFocus
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    {effectivePriceMode === 'inclusive'
                      ? `MRP Incl. GST (${settings.currencySymbol}) *`
                      : `Rate / Price (${settings.currencySymbol}) *`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={e => {
                      setUnitPrice(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSubmit(mode !== 'new-invoice');
                      }
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Quantity (मात्रा)
                  </label>
                  <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-2.5 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full text-center text-xs sm:text-sm font-mono font-semibold bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="px-2.5 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Unit (इकाई)
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as Product['unit'])}
                    className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>
                        {u.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* HSN / SAC Code */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    HSN / SAC (Optional)
                  </label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={e => setHsnCode(e.target.value)}
                    placeholder="e.g. 1006"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Item Discount % */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={e =>
                      setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Multi-Slab & Custom GST Picker */}
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                <GstSlabPicker value={taxRate} onChange={setTaxRate} />
              </div>

              {/* Save to Inventory Option */}
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveToInventory}
                    onChange={e => setSaveToInventory(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Save this item & GST slab to Inventory Catalog as well (इन्वेंटरी में भी सेव करें)
                  </span>
                </label>

                {saveToInventory && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-1">
                        Category (श्रेणी)
                      </label>
                      <input
                        type="text"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="General / Grocery"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-1">
                        Opening Stock (कुल स्टॉक)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={initialStock}
                        onChange={e => setInitialStock(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Line Summary & Quick Add Action */}
              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-neutral-700 dark:text-neutral-300 font-mono tabular-nums">
                  <span>Taxable: ₹{customPreview.taxableValue.toFixed(2)}</span>
                  <span className="mx-2 text-neutral-400">·</span>
                  <span>
                    GST ({formatGstRate(taxRate)}): ₹{customPreview.taxAmt.toFixed(2)}
                  </span>
                  <span className="mx-2 text-neutral-400">·</span>
                  <strong className="text-sm text-emerald-800 dark:text-emerald-300">
                    Line Total: ₹{customPreview.total.toFixed(2)}
                  </strong>
                </div>

                {mode === 'new-invoice' ? (
                  <button
                    type="button"
                    onClick={() => handleAddCustomSubmit(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Invoice List</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddCustomSubmit(false)}
                      className="px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add & More</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomSubmit(true)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>+ Add Item</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PICK FROM INVENTORY CATALOG (WITH PER-ITEM GST SLAB OVERRIDE) */}
          {entryTab === 'catalog' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search inventory product by name, Hindi, HSN, or barcode..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {products.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 space-y-2.5">
                  <ShoppingBag className="w-8 h-8 mx-auto text-neutral-400 stroke-1" />
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    इन्वेंटरी अभी खाली है (No products saved in Inventory yet)
                  </p>
                  <button
                    type="button"
                    onClick={() => setEntryTab('custom')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Write Custom / New Item Instead</span>
                  </button>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="py-6 px-4 text-center rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 space-y-2">
                  <p className="text-xs text-neutral-500">
                    No inventory product matching "{catalogSearch}"
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setItemName(catalogSearch);
                      setEntryTab('custom');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add "{catalogSearch}" as Custom Item</span>
                  </button>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  {filteredCatalog.map(prod => {
                    const qty = catalogQuantities[prod.id] || 1;
                    const activeTax =
                      catalogTaxOverrides[prod.id] !== undefined
                        ? catalogTaxOverrides[prod.id]
                        : prod.taxRate;
                    const outOfStock = prod.stock <= 0;
                    const slabOptions = enabledSlabs.some(s => s.rate === activeTax)
                      ? enabledSlabs
                      : [
                          ...enabledSlabs,
                          {
                            id: `prod-rate-${activeTax}`,
                            rate: activeTax,
                            label: `GST ${formatGstRate(activeTax)}`,
                            enabled: true,
                          },
                        ].sort((a, b) => a.rate - b.rate);

                    return (
                      <div
                        key={prod.id}
                        className="p-2.5 px-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {prod.name}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                            <span>{prod.category}</span>
                            <span className="mx-1.5">·</span>
                            <span>
                              Stock: {prod.stock} {prod.unit}
                            </span>
                            {prod.hsnCode && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span>HSN: {prod.hsnCode}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 shrink-0 tabular-nums">
                          {formatCurrency(prod.sellingPrice, settings.currencySymbol)}
                        </div>

                        {/* Per-row GST Slab Override Selector */}
                        <select
                          value={activeTax}
                          onChange={e =>
                            setCatalogTaxOverrides(prev => ({
                              ...prev,
                              [prod.id]: Number(e.target.value),
                            }))
                          }
                          className="px-2 py-1 text-[11px] font-mono font-semibold bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:border-emerald-500 shrink-0"
                          title="Select GST Slab for this bill"
                        >
                          {slabOptions.map(s => (
                            <option key={s.id} value={s.rate}>
                              GST {formatGstRate(s.rate)}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setCatalogQuantities(prev => ({
                                ...prev,
                                [prod.id]: Math.max(1, (prev[prod.id] || 1) - 1),
                              }))
                            }
                            className="w-6 h-6 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-mono font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCatalogQuantities(prev => ({
                                ...prev,
                                [prod.id]: (prev[prod.id] || 1) + 1,
                              }))
                            }
                            className="w-6 h-6 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={outOfStock}
                          onClick={() => handleAddCatalogProduct(prod, false)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{outOfStock ? 'Out' : 'Add'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NEW INVOICE MODE: Draft Items Summary & Customer / Payment Details */}
          {mode === 'new-invoice' && (
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Invoice Items ({draftItems.length})
                </h4>
                {draftItems.length > 0 && (
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    GST: ₹{draftTotals.taxTotal.toFixed(2)} · Total Payable: ₹
                    {draftTotals.grandTotal.toFixed(2)}
                  </span>
                )}
              </div>

              {draftItems.length === 0 ? (
                <p className="text-xs text-neutral-400 py-2">
                  ऊपर से आइटम जोड़ें — वे इस इनवॉइस में यहाँ दिखेंगे (Items added above will appear here).
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  {draftItems.map((it, idx) => {
                    const rowSlabs = enabledSlabs.some(s => s.rate === it.taxRate)
                      ? enabledSlabs
                      : [
                          ...enabledSlabs,
                          {
                            id: `draft-rate-${it.taxRate}`,
                            rate: it.taxRate,
                            label: `GST ${formatGstRate(it.taxRate)}`,
                            enabled: true,
                          },
                        ].sort((a, b) => a.rate - b.rate);

                    return (
                      <div
                        key={idx}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate block">
                            {it.name}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-mono tabular-nums">
                            ₹{it.unitPrice} × {it.quantity} {it.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={it.taxRate}
                            onChange={e =>
                              setDraftItems(prev =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, taxRate: Number(e.target.value) } : row
                                )
                              )
                            }
                            className="px-1.5 py-0.5 text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-800 dark:text-neutral-200"
                          >
                            {rowSlabs.map(s => (
                              <option key={s.id} value={s.rate}>
                                GST {formatGstRate(s.rate)}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() =>
                              setDraftItems(prev =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row
                                )
                              )
                            }
                            className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-semibold tabular-nums">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDraftItems(prev =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, quantity: row.quantity + 1 } : row
                                )
                              )
                            }
                            className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-neutral-400 hover:text-rose-600 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Customer & Payment Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer Name (ग्राहक नाम)"
                  className="px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                />
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Mobile No. (मोबाइल नंबर)"
                  className="px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                />
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'upi', label: 'UPI', icon: QrCode },
                      { id: 'card', label: 'Card', icon: CreditCard },
                    ] as const
                  ).map(pm => {
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                          paymentMethod === pm.id
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            {mode === 'new-invoice' ? 'Cancel' : 'Done / Close'}
          </button>

          {mode === 'new-invoice' && (
            <button
              type="button"
              onClick={handleFinalizeNewInvoice}
              className="px-5 py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Generate Invoice (इनवॉइस बनाएं)</span>
            </button>
          )}
        </div>
      </div>

      <GstSlabManagerModal
        isOpen={isSlabManagerOpen}
        onClose={() => setIsSlabManagerOpen(false)}
      />
    </div>
  );
};
