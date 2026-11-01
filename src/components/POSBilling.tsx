import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Barcode as BarcodeIcon,
  Trash2,
  Plus,
  Minus,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  Users,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  UserPlus,
  UserCheck,
  User,
  X,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  FileText,
  Printer,
  Eye,
  Link2,
  Building2,
  PackagePlus,
  Percent,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, PaymentMethod, Invoice, InvoiceItem, Customer } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  calculateLineGst,
  computeInvoiceSlabBreakup,
  formatGstRate,
  getEnabledGstSlabs,
  roundCurrency,
} from '../utils/gst';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PrintPreviewModal } from './PrintPreviewModal';
import { AddInvoiceItemModal } from './AddInvoiceItemModal';
import { GstSlabManagerModal } from './GstSlabManagerModal';

export const POSBilling: React.FC = () => {
  const {
    products,
    customers,
    selectedPosCustomer,
    setSelectedPosCustomer,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    updateCartTaxRate,
    applyGstSlabToCart,
    addOrUpdateGstSlab,
    clearCart,
    checkout,
    settings,
    activeUser,
    invoices,
    setActiveTab,
    triggerQuickEntry,
    pendingEntryAction,
    clearPendingEntryAction,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Quick Add Item & GST Slab Manager modal states
  const [isQuickAddItemOpen, setIsQuickAddItemOpen] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState('');
  const [isSlabManagerOpen, setIsSlabManagerOpen] = useState(false);
  const [customTaxEditingId, setCustomTaxEditingId] = useState<string | null>(null);
  const [customTaxDraft, setCustomTaxDraft] = useState<string>('');

  // Draft print preview state
  const [isDraftPreviewOpen, setIsDraftPreviewOpen] = useState(false);

  // Checkout form details
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saveCustomerToDirectory, setSaveCustomerToDirectory] = useState(true);
  const [showExtraDetailsModal, setShowExtraDetailsModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Autocomplete customer search state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [billDiscountPercent, setBillDiscountPercent] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLDivElement | null>(null);

  // Sync selectedPosCustomer from AppContext (e.g. if navigated from Customers tab)
  useEffect(() => {
    if (selectedPosCustomer) {
      setSelectedCustomer(selectedPosCustomer);
      setCustomerName(selectedPosCustomer.name);
      setCustomerPhone(selectedPosCustomer.phone);
      setCustomerEmail(selectedPosCustomer.email || '');
      setCustomerAddress(selectedPosCustomer.address || '');
      setCustomerGstin(selectedPosCustomer.gstin || '');
      setCustomerNotes(selectedPosCustomer.notes || '');
    }
  }, [selectedPosCustomer]);

  useEffect(() => {
    if (pendingEntryAction === 'new-bill') {
      searchInputRef.current?.focus();
      clearPendingEntryAction();
    }
  }, [pendingEntryAction, clearPendingEntryAction]);

  // Autocomplete customer search results
  const matchingCustomers = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 5);
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [customers, customerSearchQuery]);

  // Select customer from dropdown
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerEmail(c.email || '');
    setCustomerAddress(c.address || '');
    setCustomerGstin(c.gstin || '');
    setCustomerNotes(c.notes || '');
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
  };

  // Clear selected customer
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerGstin('');
    setCustomerNotes('');
    setCustomerSearchQuery('');
    setSelectedPosCustomer(null);
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.nameHindi && p.nameHindi.toLowerCase().includes(query)) ||
        p.barcode.includes(query) ||
        p.category.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  }, [products, searchQuery, selectedCategory]);

  const enabledGstSlabs = useMemo(
    () => getEnabledGstSlabs(settings.gstSlabs),
    [settings.gstSlabs]
  );

  const priceMode = settings.gstPriceMode || 'exclusive';
  const isInterstate = settings.gstSupplyType === 'interstate';

  // Computed line items across all GST slabs (matching checkout() math to exact paise)
  const cartComputedItems = useMemo<InvoiceItem[]>(() => {
    return cart.map(ci => {
      const calc = calculateLineGst({
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        discountPercent: ci.discountPercent || 0,
        taxRate: ci.taxRate,
        priceMode,
      });
      return {
        productId: ci.product.id,
        name: ci.product.name,
        barcode: ci.product.barcode,
        hsnCode: ci.product.hsnCode,
        unit: ci.product.unit,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        taxRate: ci.taxRate,
        taxAmount: calc.taxAmount,
        discountAmount: calc.discountAmount,
        total: calc.total,
      };
    });
  }, [cart, priceMode]);

  const cartSlabBreakup = useMemo(
    () => computeInvoiceSlabBreakup(cartComputedItems),
    [cartComputedItems]
  );

  // Totals calculations
  const cartSubtotal = useMemo(() => {
    return roundCurrency(
      cartComputedItems.reduce(
        (sum, it) => sum + Math.max(0, it.total - it.taxAmount + it.discountAmount),
        0
      )
    );
  }, [cartComputedItems]);

  const cartItemDiscounts = useMemo(() => {
    return roundCurrency(cartComputedItems.reduce((sum, it) => sum + it.discountAmount, 0));
  }, [cartComputedItems]);

  const cartTaxTotal = useMemo(() => {
    return roundCurrency(cartComputedItems.reduce((sum, it) => sum + it.taxAmount, 0));
  }, [cartComputedItems]);

  const discountAmount = useMemo(() => {
    const overall = roundCurrency((cartSubtotal * billDiscountPercent) / 100);
    return roundCurrency(cartItemDiscounts + overall);
  }, [cartSubtotal, billDiscountPercent, cartItemDiscounts]);

  const grandTotal = useMemo(() => {
    return roundCurrency(Math.max(0, cartSubtotal + cartTaxTotal - discountAmount));
  }, [cartSubtotal, cartTaxTotal, discountAmount]);

  // Set default cash tendered to grandTotal when grandTotal changes
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setCashTendered(grandTotal);
    }
  }, [grandTotal, paymentMethod]);

  const changeDue = useMemo(() => {
    if (typeof cashTendered === 'number' && cashTendered >= grandTotal) {
      return cashTendered - grandTotal;
    }
    return 0;
  }, [cashTendered, grandTotal]);

  // Keyboard shortcut listener (F2 for search, F9 for checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F9' && cart.length > 0 && !isProcessing) {
        e.preventDefault();
        handleCheckoutSubmit();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleOpenPrintPreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    isProcessing,
    grandTotal,
    paymentMethod,
    cashTendered,
    customerName,
    customerPhone,
    customerAddress,
    customerGstin,
    customerNotes,
    billDiscountPercent,
    selectedCustomer,
    invoices,
  ]);

  // Handle barcode scan detection
  const handleBarcodeScanned = (barcode: string) => {
    const matched = products.find(p => p.barcode === barcode);
    if (matched) {
      if (matched.stock <= 0) {
        setErrorMsg(`${matched.name} is currently out of stock!`);
        setTimeout(() => setErrorMsg(null), 3000);
      } else {
        addToCart(matched, 1);
        setErrorMsg(null);
      }
    } else {
      setErrorMsg(`No product found with barcode ${barcode}`);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // Live Draft Invoice computed reactively from current cart & customer inputs
  const liveDraftInvoice = useMemo<Invoice | null>(() => {
    if (!isDraftPreviewOpen) return null;

    return {
      id: 'draft-preview',
      invoiceNumber: 'DRAFT-PREVIEW',
      createdAt: new Date().toISOString(),
      cashierId: activeUser.id,
      cashierName: activeUser.name,
      customerId: selectedCustomer?.id,
      customerName: customerName.trim() || (selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'),
      customerPhone: customerPhone.trim() || (selectedCustomer ? selectedCustomer.phone : ''),
      customerAddress: customerAddress.trim() || (selectedCustomer ? selectedCustomer.address : ''),
      customerGstin: customerGstin.trim() || (selectedCustomer ? selectedCustomer.gstin : ''),
      items: cartComputedItems,
      subtotal: cartSubtotal,
      taxTotal: cartTaxTotal,
      discountTotal: discountAmount,
      grandTotal,
      gstSupplyType: settings.gstSupplyType,
      gstPriceMode: settings.gstPriceMode,
      paymentMethod,
      amountTendered: typeof cashTendered === 'number' ? cashTendered : grandTotal,
      changeDue:
        paymentMethod === 'cash' && typeof cashTendered === 'number'
          ? roundCurrency(Math.max(0, cashTendered - grandTotal))
          : 0,
      status: 'paid',
      notes: customerNotes.trim(),
    };
  }, [
    isDraftPreviewOpen,
    cartComputedItems,
    cartSubtotal,
    cartTaxTotal,
    discountAmount,
    grandTotal,
    settings.gstSupplyType,
    settings.gstPriceMode,
    activeUser,
    selectedCustomer,
    customerName,
    customerPhone,
    customerAddress,
    customerGstin,
    paymentMethod,
    cashTendered,
    customerNotes,
  ]);

  // Open Print Preview (either live draft of current cart or last invoice)
  const handleOpenPrintPreview = () => {
    if (cart.length === 0 && invoices.length > 0) {
      setActiveInvoice(invoices[0]);
      return;
    }
    setIsDraftPreviewOpen(true);
  };

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const invoice = checkout({
        customerId: selectedCustomer?.id,
        customerName: customerName.trim() || (selectedCustomer ? selectedCustomer.name : ''),
        customerPhone: customerPhone.trim() || (selectedCustomer ? selectedCustomer.phone : ''),
        customerEmail: customerEmail.trim() || (selectedCustomer ? selectedCustomer.email : ''),
        customerAddress: customerAddress.trim() || (selectedCustomer ? selectedCustomer.address : ''),
        customerGstin: customerGstin.trim() || (selectedCustomer ? selectedCustomer.gstin : ''),
        customerNotes: customerNotes.trim(),
        saveCustomer: saveCustomerToDirectory,
        paymentMethod,
        amountTendered: typeof cashTendered === 'number' ? cashTendered : grandTotal,
        discountPercent: billDiscountPercent,
      });

      setActiveInvoice(invoice);
      // Reset checkout inputs
      handleClearCustomer();
      setBillDiscountPercent(0);
      setCashTendered('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Left Area: Catalog, Search & Categories */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search product name, barcode, or Hindi (Press F2)..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors whitespace-nowrap"
            title="Open Camera / Barcode Scanner"
          >
            <BarcodeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error / Alert banner if any */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
          {products.length === 0 ? (
            <div className="max-w-xl mx-auto my-6 p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
              <div className="space-y-1">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Clean Store Ready · पुराना डेमो डेटा साफ है
                </div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  अपना नया स्टोर डेटा जोड़ना शुरू करें
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  सभी पहले के सैंपल प्रोडक्ट्स, ग्राहक और बिल हटा दिए गए हैं। नीचे दिए बटन या डायरेक्ट लिंक हब से अपनी दुकान का नया डेटा जोड़ें:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddInitialName('');
                    setIsQuickAddItemOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Item in Invoice / Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerQuickEntry('add-product')}
                  className="px-4 py-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>+ Add Inventory Product</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerQuickEntry('store-profile')}
                  className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Set Store Name & UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('setup')}
                  className="px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-opacity cursor-pointer"
                >
                  <Link2 className="w-4 h-4" />
                  <span>All Data Entry Links</span>
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-400">
              <ShoppingBag className="w-12 h-12 mb-2 opacity-40 stroke-1" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                No items matching "{searchQuery}"
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Add it directly to the current invoice or save to Inventory
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuickAddInitialName(searchQuery.trim());
                  setIsQuickAddItemOpen(true);
                }}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add "{searchQuery.trim()}" to Bill</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;
                const inCart = cart.find(ci => ci.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product, 1)}
                    className={`relative p-3 rounded-lg border transition-all flex flex-col justify-between select-none ${
                      isOutOfStock
                        ? 'bg-neutral-100 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                        : 'bg-white dark:bg-neutral-800/90 border-neutral-200 dark:border-neutral-700/60 hover:border-emerald-500 hover:shadow-xs cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] uppercase font-mono text-neutral-400 dark:text-neutral-500 tracking-wider">
                          {product.category}
                        </span>
                        {inCart && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {inCart.quantity}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-1 line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                      {product.nameHindi && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                          {product.nameHindi}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/40 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums font-mono">
                          {formatCurrency(product.sellingPrice, settings.currencySymbol)}
                        </div>
                        <div className="text-[10px] text-neutral-500 flex flex-wrap items-center gap-1">
                          <span>{product.stock} {product.unit}</span>
                          <span>·</span>
                          <span className="font-mono">GST {formatGstRate(product.taxRate)}</span>
                          {isLowStock && (
                            <span className="text-amber-600 font-medium">· Low</span>
                          )}
                          {isOutOfStock && (
                            <span className="text-rose-600 font-medium">· Out</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={e => {
                          e.stopPropagation();
                          if (!isOutOfStock) addToCart(product, 1);
                        }}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                          isOutOfStock
                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                            : 'bg-neutral-100 hover:bg-emerald-600 hover:text-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Checkout & Cart Terminal (400px on desktop) */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white dark:bg-neutral-900 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800 h-[50vh] lg:h-full">
        {/* Cart / Invoice Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
              Current Invoice
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono shrink-0">
              · {cart.reduce((s, c) => s + c.quantity, 0)} items
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setQuickAddInitialName('');
                setIsQuickAddItemOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Add Item to Invoice / Bill (इनवॉइस में आइटम जोड़ें)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSlabManagerOpen(true)}
              className="text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 font-semibold transition-colors border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              title="Configure All GST Slabs & Custom %"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>GST</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPrintPreview}
              className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 flex items-center gap-1 font-medium transition-colors border border-neutral-200 dark:border-neutral-700 px-2 py-1 rounded-md bg-neutral-50 dark:bg-neutral-800/60 whitespace-nowrap shrink-0 cursor-pointer"
              title="Print Preview (F10)"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium transition-colors px-1 cursor-pointer"
                title="Clear Bill"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Apply GST Slab Bar when Bill has items */}
        {cart.length > 0 && (
          <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950/60 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-neutral-500 font-medium whitespace-nowrap">
              All Items GST:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {enabledGstSlabs.map(slab => (
                <button
                  key={slab.id}
                  type="button"
                  onClick={() => applyGstSlabToCart(slab.rate)}
                  className="px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 font-mono text-[10px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  title={`Apply GST ${formatGstRate(slab.rate)} to all items in current bill`}
                >
                  {formatGstRate(slab.rate)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsSlabManagerOpen(true)}
                className="px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Custom %
              </button>
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 p-2 sm:p-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30 stroke-1" />
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Invoice / Bill is currently empty
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-[220px]">
                Click items from catalog, scan barcode, or add any item with custom GST below
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddInitialName('');
                    setIsQuickAddItemOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item (आइटम जोड़ें)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSlabManagerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Percent className="w-3.5 h-3.5 text-emerald-600" />
                  <span>GST Slabs</span>
                </button>
              </div>
            </div>
          ) : (
            cart.map(item => {
              const calc = calculateLineGst({
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent || 0,
                taxRate: item.taxRate,
                priceMode,
              });
              const itemSlabOptions = enabledGstSlabs.some(s => s.rate === item.taxRate)
                ? enabledGstSlabs
                : [
                    ...enabledGstSlabs,
                    {
                      id: `custom-line-${item.taxRate}`,
                      rate: item.taxRate,
                      label: `GST ${formatGstRate(item.taxRate)}`,
                      enabled: true,
                    },
                  ].sort((a, b) => a.rate - b.rate);
              const isEditingCustomTax = customTaxEditingId === item.product.id;

              return (
                <div key={item.product.id} className="py-2.5 px-1 space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {item.product.name}
                      </h5>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 font-mono mt-0.5 tabular-nums">
                        <span>₹{item.unitPrice.toFixed(2)}</span>
                        <span>·</span>
                        {/* Per-item interactive GST Slab Selector */}
                        <select
                          value={item.taxRate}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              setCustomTaxEditingId(item.product.id);
                              setCustomTaxDraft(String(item.taxRate));
                            } else {
                              updateCartTaxRate(item.product.id, Number(val));
                              setCustomTaxEditingId(null);
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                          title="Change GST Slab for this item"
                        >
                          {itemSlabOptions.map(s => (
                            <option key={s.id} value={s.rate}>
                              GST {formatGstRate(s.rate)}
                            </option>
                          ))}
                          <option value="__custom__">+ Custom GST %...</option>
                        </select>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-800 shrink-0">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total (with GST) */}
                    <div className="text-right min-w-[68px] shrink-0">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-mono tabular-nums block">
                        ₹{calc.total.toFixed(2)}
                      </span>
                      {calc.taxAmount > 0 && (
                        <span className="text-[10px] text-neutral-400 font-mono tabular-nums block">
                          +₹{calc.taxAmount.toFixed(2)} tax
                        </span>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-neutral-400 hover:text-rose-500 p-1 rounded-md transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Inline Custom GST % Editor for this line item */}
                  {isEditingCustomTax && (
                    <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-[11px]">
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                        Custom GST %:
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={customTaxDraft}
                          onChange={e => setCustomTaxDraft(e.target.value)}
                          autoFocus
                          className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-right bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const r = Math.max(0, Math.min(100, Number(customTaxDraft) || 0));
                            updateCartTaxRate(item.product.id, r);
                            addOrUpdateGstSlab({ rate: r });
                            setCustomTaxEditingId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold cursor-pointer whitespace-nowrap"
                          title="Apply to item & save slab"
                        >
                          Apply & Save Slab
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomTaxEditingId(null)}
                          className="p-0.5 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Customer Details & Discount Section */}
        <div className="px-3 sm:px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 space-y-2">
          {/* Customer Selection / Active Customer Banner */}
          {selectedCustomer ? (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-950 dark:text-emerald-100 truncate block">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-200/70 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 font-mono">
                      ⭐ {selectedCustomer.loyaltyPoints || 0} pts
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono block truncate">
                    +91 {selectedCustomer.phone}
                    {selectedCustomer.gstin && ` · GST: ${selectedCustomer.gstin}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-emerald-600 dark:text-emerald-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                title="Change or remove customer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5" ref={customerInputRef}>
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  Customer Details (ग्राहक विवरण)
                </span>

                <button
                  type="button"
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Search className="w-3 h-3" />
                  <span>Existing ({customers.length})</span>
                </button>
              </div>

              {/* Customer Dropdown (if open) */}
              {isCustomerDropdownOpen && (
                <div className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg space-y-1.5 text-xs max-h-48 overflow-y-auto">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                    placeholder="Search name, phone..."
                    className="w-full px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                    autoFocus
                  />
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {matchingCustomers.length === 0 ? (
                      <p className="text-[11px] text-neutral-400 py-2 text-center">
                        No saved customer found
                      </p>
                    ) : (
                      matchingCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full p-1.5 text-left hover:bg-emerald-50 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                              {c.name}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              +91 {c.phone}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-amber-600 font-mono">
                            ⭐ {c.loyaltyPoints || 0}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Name and Mobile Number inputs */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Customer Name (नाम)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCustomerPhone(val);
                      // Check if matches an existing customer
                      if (val.length >= 7) {
                        const matched = customers.find(c => c.phone.replace(/\D/g, '').endsWith(val));
                        if (matched && !selectedCustomer) {
                          // Quick match preview
                        }
                      }
                    }}
                    placeholder="Mobile No. (मोबाइल)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Bill print preview indicator */}
              {(customerName || customerPhone) && (
                <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span className="truncate">
                    🧾 On Bill: <strong>{customerName.trim() || 'Walk-in'}</strong>
                    {customerPhone && <span className="font-mono ml-1.5">• +91 {customerPhone}</span>}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">
                    (बिल पर प्रिंट होगा)
                  </span>
                </div>
              )}

              {/* Save customer checkbox & More details toggle */}
              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <label className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveCustomerToDirectory}
                    onChange={e => setSaveCustomerToDirectory(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Save customer details (विवरण सेव करें)</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowExtraDetailsModal(!showExtraDetailsModal)}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] font-medium"
                >
                  {showExtraDetailsModal ? 'Less Details' : '+ Extra Info (GST/Address)'}
                </button>
              </div>

              {/* Extra Details Expandable (Address, GSTIN, Email) */}
              {showExtraDetailsModal && (
                <div className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg space-y-1.5 text-xs animate-in fade-in">
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="Customer Address / Location"
                    className="w-full px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="Email Address"
                      className="px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden"
                    />
                    <input
                      type="text"
                      maxLength={15}
                      value={customerGstin}
                      onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
                      placeholder="GSTIN (If B2B)"
                      className="px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 uppercase font-mono focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bill Discount Row */}
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 pt-1 border-t border-neutral-200 dark:border-neutral-800/80">
            <span>Bill Discount (%):</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map(pct => (
                <button
                  key={pct}
                  onClick={() => setBillDiscountPercent(pct)}
                  className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                    billDiscountPercent === pct
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bill Summary & Payment Section */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          {/* Signature Jewel Subtotals, Slab-wise GST Breakup & Grand Total Card */}
          <div className="p-3 rounded-xl brand-command-surface text-white border space-y-1.5 text-xs">
            <div className="flex justify-between text-white/80">
              <span>
                Taxable Subtotal ({priceMode === 'inclusive' ? 'MRP Incl. GST' : 'GST Extra'}):
              </span>
              <span className="font-mono tabular-nums">₹{cartSubtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-amber-300 font-medium">
                <span>Discount:</span>
                <span className="font-mono tabular-nums">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white/90 font-medium">
              <span>
                GST Total ({isInterstate ? 'IGST' : 'CGST + SGST'}):
              </span>
              <span className="font-mono tabular-nums">₹{cartTaxTotal.toFixed(2)}</span>
            </div>

            {/* Live Slab-wise Breakup */}
            {cartSlabBreakup.length > 0 && (
              <div className="pt-1 pb-0.5 space-y-0.5 border-t border-white/10 text-[10px] text-white/75 font-mono tabular-nums">
                {cartSlabBreakup.map(row => (
                  <div key={row.rate} className="flex justify-between">
                    <span>
                      GST {formatGstRate(row.rate)}{' '}
                      {row.rate > 0
                        ? isInterstate
                          ? `(IGST ${row.igstRate}%)`
                          : `(C ${row.cgstRate}%+S ${row.sgstRate}%)`
                        : '(Exempt)'}
                    </span>
                    <span>₹{row.totalTax.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-baseline text-base font-bold text-white pt-1.5 border-t border-white/15">
              <span>Total Payable:</span>
              <span className="font-mono tabular-nums text-lg brand-gold-text">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                paymentMethod === 'cash'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Cash</span>
            </button>

            <button
              onClick={() => setPaymentMethod('upi')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                paymentMethod === 'upi'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>UPI / QR</span>
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                paymentMethod === 'card'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>
          </div>

          {/* Cash Tender Quick Calculator */}
          {paymentMethod === 'cash' && cart.length > 0 && (
            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">Cash Received:</span>
                <div className="flex items-center gap-1 font-mono">
                  <span>₹</span>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value ? Number(e.target.value) : '')}
                    className="w-24 px-2 py-1 text-right text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Note Buttons */}
              <div className="flex gap-1 justify-end">
                {[
                  { label: 'Exact', val: grandTotal },
                  { label: '₹100', val: 100 },
                  { label: '₹200', val: 200 },
                  { label: '₹500', val: 500 },
                  { label: '₹2000', val: 2000 },
                ].map(b => (
                  <button
                    key={b.label}
                    onClick={() => setCashTendered(b.val)}
                    className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Change Return */}
              <div className="flex justify-between items-center text-xs font-semibold pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-700 dark:text-neutral-300">Change to Return:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono text-sm tabular-nums">
                  ₹{changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Checkout & Print Preview Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPrintPreview}
              disabled={cart.length === 0 || isProcessing}
              className="py-2.5 px-3 rounded-lg font-semibold text-xs text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
              title="Print Preview & Receipt Formatting (F10)"
            >
              <Printer className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>Preview</span>
              <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">(F10)</span>
            </button>

            <button
              type="button"
              onClick={handleCheckoutSubmit}
              disabled={cart.length === 0 || isProcessing}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Complete Checkout (F9)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onBarcodeDetected={handleBarcodeScanned}
      />

      {/* Quick Add Item to Current Bill / Invoice Modal */}
      <AddInvoiceItemModal
        isOpen={isQuickAddItemOpen}
        mode="cart"
        initialItemName={quickAddInitialName}
        onClose={() => {
          setIsQuickAddItemOpen(false);
          setQuickAddInitialName('');
        }}
      />

      {/* Generated / Completed Invoice Print Preview Modal */}
      <PrintPreviewModal
        invoice={activeInvoice}
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
      />

      {/* Draft Bill Print Preview Modal (Live Cart Preview Before Sale) */}
      <PrintPreviewModal
        invoice={liveDraftInvoice}
        isOpen={isDraftPreviewOpen}
        isDraft={true}
        onCompleteSale={cart.length > 0 ? handleCheckoutSubmit : undefined}
        onClose={() => {
          setIsDraftPreviewOpen(false);
        }}
      />

      {/* GST Slab Master Modal */}
      <GstSlabManagerModal
        isOpen={isSlabManagerOpen}
        onClose={() => setIsSlabManagerOpen(false)}
      />
    </div>
  );
};
