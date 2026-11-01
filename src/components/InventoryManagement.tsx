import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  Barcode as BarcodeIcon,
  Download,
  Filter,
  PackagePlus,
  PackageMinus,
  Check,
  X,
  Percent,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatCurrency, generateBarcode } from '../utils/formatters';
import { formatGstRate } from '../utils/gst';
import { GstSlabPicker } from './GstSlabPicker';
import { GstSlabManagerModal } from './GstSlabManagerModal';

export const InventoryManagement: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    settings,
    activeUser,
    pendingEntryAction,
    clearPendingEntryAction,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSlabManagerOpen, setIsSlabManagerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [nameHindi, setNameHindi] = useState('');
  const [category, setCategory] = useState('Groceries & Staples');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(5);
  const [unit, setUnit] = useState<Product['unit']>('pkt');
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate ?? 5);

  // Quick Stock Adjust Inline Popover
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(5);
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.nameHindi && p.nameHindi.toLowerCase().includes(q)) ||
        p.barcode.includes(q);

      let matchStock = true;
      if (stockStatusFilter === 'low') {
        matchStock = p.stock > 0 && p.stock <= p.minStockAlert;
      } else if (stockStatusFilter === 'out') {
        matchStock = p.stock <= 0;
      }

      return matchCat && matchQuery && matchStock;
    });
  }, [products, searchQuery, categoryFilter, stockStatusFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setNameHindi('');
    setCategory('Groceries & Staples');
    setNewCategoryName('');
    setBarcode(generateBarcode());
    setHsnCode('');
    setCostPrice('');
    setSellingPrice('');
    setStock('');
    setMinStockAlert(5);
    setUnit('pkt');
    setTaxRate(settings.defaultTaxRate ?? 5);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (pendingEntryAction === 'add-product') {
      openAddModal();
      clearPendingEntryAction();
    }
  }, [pendingEntryAction, clearPendingEntryAction]);

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setNameHindi(p.nameHindi || '');
    setCategory(p.category);
    setBarcode(p.barcode);
    setHsnCode(p.hsnCode || '');
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setStock(p.stock);
    setMinStockAlert(p.minStockAlert);
    setUnit(p.unit);
    setTaxRate(p.taxRate);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim() || sellingPrice === '') return;

    const finalCat = category === '__new__' ? (newCategoryName.trim() || 'General') : category;
    const cp = typeof costPrice === 'number' ? costPrice : 0;
    const sp = typeof sellingPrice === 'number' ? sellingPrice : 0;
    const st = typeof stock === 'number' ? stock : 0;
    const minAlert = typeof minStockAlert === 'number' ? minStockAlert : 5;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: name.trim(),
        nameHindi: nameHindi.trim() || undefined,
        category: finalCat,
        barcode: barcode.trim(),
        hsnCode: hsnCode.trim() || undefined,
        costPrice: cp,
        sellingPrice: sp,
        stock: st,
        minStockAlert: minAlert,
        unit,
        taxRate,
      });
    } else {
      addProduct({
        name: name.trim(),
        nameHindi: nameHindi.trim() || undefined,
        category: finalCat,
        barcode: barcode.trim(),
        hsnCode: hsnCode.trim() || undefined,
        costPrice: cp,
        sellingPrice: sp,
        stock: st,
        minStockAlert: minAlert,
        unit,
        taxRate,
      });
    }

    setIsModalOpen(false);
  };

  const handleQuickAdjustStock = (productId: string) => {
    const delta = adjustType === 'add' ? adjustAmount : -adjustAmount;
    adjustStock(productId, delta, adjustType === 'add' ? 'Restocked' : 'Adjustment');
    setAdjustingId(null);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Barcode', 'Name', 'Hindi Name', 'Category', 'Cost Price', 'Selling Price', 'Current Stock', 'Min Alert', 'Unit', 'Tax Rate %'];
    const rows = products.map(p => [
      p.id,
      p.barcode,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.nameHindi || '').replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      p.costPrice,
      p.sellingPrice,
      p.stock,
      p.minStockAlert,
      p.unit,
      p.taxRate,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VyaparPOS_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check permission
  const canEdit = activeUser.role === 'admin' || activeUser.role === 'manager' || activeUser.role === 'inventory_clerk';

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Top Bar for Inventory */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Inventory & Catalog Management
          </h2>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
            <span>{products.length} Total SKUs</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-600 font-medium">
              {products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert).length} Low Stock
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-600 font-medium">
              {products.filter(p => p.stock <= 0).length} Out of Stock
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSlabManagerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>GST Slabs</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item / Menu</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="p-3 sm:px-4 bg-white dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search items by name, barcode..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Category dropdown */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
        >
          {categories.map(c => (
            <option key={c} value={c}>
              {c === 'All' ? 'All Categories' : c}
            </option>
          ))}
        </select>

        {/* Stock status tabs */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              stockStatusFilter === 'all'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              stockStatusFilter === 'low'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('out')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              stockStatusFilter === 'out'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Product / SKU</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Cost</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">GST %</th>
                <th className="py-2.5 px-3 text-center">Stock Level</th>
                <th className="py-2.5 px-3 text-right">Quick Restock</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(product => {
                  const isOut = product.stock <= 0;
                  const isLow = product.stock > 0 && product.stock <= product.minStockAlert;
                  const marginPct = product.costPrice > 0
                    ? Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100)
                    : 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Name & Barcode */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-0.5">
                          <span>{product.barcode}</span>
                          {product.hsnCode && (
                            <>
                              <span>·</span>
                              <span>HSN: {product.hsnCode}</span>
                            </>
                          )}
                          {product.nameHindi && (
                            <>
                              <span>·</span>
                              <span className="font-sans text-neutral-400">{product.nameHindi}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300">
                        {product.category}
                      </td>

                      {/* Cost */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-500">
                        ₹{product.costPrice.toFixed(2)}
                      </td>

                      {/* Selling Price & Margin */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          ₹{product.sellingPrice.toFixed(2)}
                        </span>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">
                          {marginPct}% margin
                        </div>
                      </td>

                      {/* GST */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-300 font-medium">
                        {formatGstRate(product.taxRate)}
                      </td>

                      {/* Stock Level */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold tabular-nums">
                          <span
                            className={
                              isOut
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLow
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-neutral-900 dark:text-neutral-100'
                            }
                          >
                            {product.stock}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-sans">{product.unit}</span>
                        </div>
                        {isLow && (
                          <div className="text-[10px] text-amber-600 font-medium font-sans">
                            Min: {product.minStockAlert}
                          </div>
                        )}
                        {isOut && (
                          <div className="text-[10px] text-rose-600 font-semibold font-sans">
                            Out of Stock
                          </div>
                        )}
                      </td>

                      {/* Quick Restock / Deduct Controls */}
                      <td className="py-2.5 px-3 text-right">
                        {adjustingId === product.id ? (
                          <div className="flex items-center justify-end gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                            <div className="flex rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                              <button
                                type="button"
                                onClick={() => setAdjustType('add')}
                                className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                  adjustType === 'add'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-neutral-500'
                                }`}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdjustType('remove')}
                                className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                  adjustType === 'remove'
                                    ? 'bg-rose-600 text-white'
                                    : 'text-neutral-500'
                                }`}
                              >
                                -
                              </button>
                            </div>
                            <input
                              type="number"
                              min="1"
                              value={adjustAmount}
                              onChange={e => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                              className="w-12 px-1 py-0.5 text-xs text-center border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 font-mono"
                            />
                            <button
                              onClick={() => handleQuickAdjustStock(product.id)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Apply"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setAdjustingId(null)}
                              className="p-1 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 hover:bg-neutral-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={!canEdit}
                            onClick={() => {
                              setAdjustingId(product.id);
                              setAdjustAmount(10);
                              setAdjustType('add');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-md border border-emerald-200 dark:border-emerald-800 disabled:opacity-50"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>Adjust</span>
                          </button>
                        )}
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-2.5 px-3 text-center">
                        {confirmDeleteId === product.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deleteProduct(product.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-[10px] text-neutral-600 dark:text-neutral-300 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              disabled={!canEdit}
                              onClick={() => openEditModal(product)}
                              className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={!canEdit}
                              onClick={() => setConfirmDeleteId(product.id)}
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Menu Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {editingProduct ? 'Edit Catalog Item' : 'Add New Menu / Catalog Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              {/* Product Name (English & Hindi) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Item Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta 5kg"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Hindi / Regional Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={nameHindi}
                    onChange={e => setNameHindi(e.target.value)}
                    placeholder="e.g. आशीर्वाद आटा"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__new__">+ Add New Category...</option>
                  </select>
                </div>
              </div>

              {category === '__new__' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    New Category Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Frozen Foods, Bakery"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Barcode, SKU & HSN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Barcode / EAN SKU *
                    </label>
                    <button
                      type="button"
                      onClick={() => setBarcode(generateBarcode())}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                    >
                      Generate Random
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="890..."
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={e => setHsnCode(e.target.value)}
                    placeholder="e.g. 1901"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="120"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Selling Price (MRP/Rate) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="150"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono font-semibold focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Stock, Low Alert & Unit */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={e => setStock(e.target.value ? Number(e.target.value) : '')}
                    placeholder="25"
                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Min Alert
                  </label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as Product['unit'])}
                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                  >
                    <option value="pkt">pkt</option>
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="ltr">ltr</option>
                    <option value="ml">ml</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              {/* Multi-Slab & Custom GST Picker */}
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                <GstSlabPicker value={taxRate} onChange={setTaxRate} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Update Product' : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GstSlabManagerModal
        isOpen={isSlabManagerOpen}
        onClose={() => setIsSlabManagerOpen(false)}
      />
    </div>
  );
};
