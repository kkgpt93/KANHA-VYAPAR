import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Check,
  Award,
  Download,
  Receipt,
  Share2,
  Calendar,
  CreditCard,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer, Invoice } from '../types';
import { formatCurrency, formatDateTime, buildWhatsAppInvoiceText } from '../utils/formatters';
import { InvoiceModal } from './InvoiceModal';

export const CustomerManagement: React.FC = () => {
  const {
    customers,
    invoices,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    selectCustomerForPOS,
    settings,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'repeat' | 'b2b' | 'high_value'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'spend' | 'visits'>('recent');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Calculate stats for each customer from invoices
  const customerStatsMap = useMemo(() => {
    const stats: Record<string, { totalOrders: number; totalSpent: number; lastOrderDate?: string }> = {};

    customers.forEach(c => {
      stats[c.id] = { totalOrders: 0, totalSpent: 0 };
    });

    invoices.forEach(inv => {
      if (inv.status === 'refunded') return;
      // Match by customerId or phone
      const matchedCust = customers.find(
        c => (inv.customerId && c.id === inv.customerId) || (inv.customerPhone && c.phone && c.phone.replace(/\D/g, '') === inv.customerPhone.replace(/\D/g, ''))
      );

      if (matchedCust) {
        if (!stats[matchedCust.id]) {
          stats[matchedCust.id] = { totalOrders: 0, totalSpent: 0 };
        }
        stats[matchedCust.id].totalOrders += 1;
        stats[matchedCust.id].totalSpent += inv.grandTotal;
        if (!stats[matchedCust.id].lastOrderDate || new Date(inv.createdAt) > new Date(stats[matchedCust.id].lastOrderDate!)) {
          stats[matchedCust.id].lastOrderDate = inv.createdAt;
        }
      }
    });

    return stats;
  }, [customers, invoices]);

  // Overall Directory Statistics
  const totalCustomerCount = customers.length;
  const repeatCustomerCount = useMemo(() => {
    return Object.values(customerStatsMap).filter(s => s.totalOrders >= 2).length;
  }, [customerStatsMap]);

  const totalCustomerRevenue = useMemo(() => {
    return Object.values(customerStatsMap).reduce((acc, s) => acc + s.totalSpent, 0);
  }, [customerStatsMap]);

  const totalLoyaltyPoints = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  }, [customers]);

  // Filtered and Sorted Customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return customers
      .filter(c => {
        const stats = customerStatsMap[c.id] || { totalOrders: 0, totalSpent: 0 };
        const matchQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q));

        let matchFilter = true;
        if (filterType === 'repeat') {
          matchFilter = stats.totalOrders >= 2;
        } else if (filterType === 'b2b') {
          matchFilter = !!c.gstin && c.gstin.trim().length > 0;
        } else if (filterType === 'high_value') {
          matchFilter = stats.totalSpent >= 2000;
        }

        return matchQuery && matchFilter;
      })
      .sort((a, b) => {
        const statsA = customerStatsMap[a.id] || { totalOrders: 0, totalSpent: 0 };
        const statsB = customerStatsMap[b.id] || { totalOrders: 0, totalSpent: 0 };

        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'spend') return statsB.totalSpent - statsA.totalSpent;
        if (sortBy === 'visits') return statsB.totalOrders - statsA.totalOrders;
        // default recent
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [customers, searchQuery, filterType, sortBy, customerStatsMap]);

  // Open Add modal
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      notes: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      gstin: c.gstin || '',
      notes: c.notes || '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Save Customer (Add or Edit)
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Customer Name is required');
      return;
    }
    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('Please provide a valid 10-digit mobile number');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: formData.name.trim(),
        phone: cleanPhone,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        gstin: formData.gstin.trim().toUpperCase() || undefined,
        notes: formData.notes.trim() || undefined,
      });
    } else {
      addCustomer({
        name: formData.name.trim(),
        phone: cleanPhone,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        gstin: formData.gstin.trim().toUpperCase() || undefined,
        notes: formData.notes.trim() || undefined,
        loyaltyPoints: 0,
      });
    }

    setIsAddModalOpen(false);
  };

  // Delete Customer
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from your customer directory?`)) {
      deleteCustomer(id);
      if (viewingCustomer?.id === id) {
        setViewingCustomer(null);
      }
    }
  };

  // Export Customers CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Mobile Number', 'Email', 'Address', 'GSTIN', 'Total Orders', 'Total Spent (INR)', 'Loyalty Points', 'Notes', 'Created At'];
    const rows = customers.map(c => {
      const s = customerStatsMap[c.id] || { totalOrders: 0, totalSpent: 0 };
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${c.email || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.gstin || ''}"`,
        s.totalOrders,
        s.totalSpent,
        c.loyaltyPoints || 0,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        `"${c.createdAt}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get Invoices for a specific customer
  const getCustomerInvoices = (customer: Customer): Invoice[] => {
    const clean = customer.phone.replace(/\D/g, '');
    return invoices.filter(
      inv => (inv.customerId && inv.customerId === customer.id) || (inv.customerPhone && inv.customerPhone.replace(/\D/g, '') === clean)
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Customer Directory & Khata
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
              {totalCustomerCount} Saved
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage customer profiles, mobile numbers, purchase histories, and WhatsApp communication
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
            Total Customers
          </span>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5 block">
            {totalCustomerCount}
          </span>
          <span className="text-[10px] text-neutral-400">All registered clients</span>
        </div>

        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
            Repeat Buyers
          </span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
            {repeatCustomerCount}
          </span>
          <span className="text-[10px] text-neutral-400">2+ visits made</span>
        </div>

        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
            Customer Revenue
          </span>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5 block">
            {formatCurrency(totalCustomerRevenue, settings.currencySymbol)}
          </span>
          <span className="text-[10px] text-neutral-400">Lifetime purchases</span>
        </div>

        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
            Loyalty Points Pool
          </span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
            ⭐ {totalLoyaltyPoints}
          </span>
          <span className="text-[10px] text-neutral-400">Earned across store</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:px-4 bg-white dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, mobile no, address, GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filter segment */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('repeat')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'repeat'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Repeat
            </button>
            <button
              onClick={() => setFilterType('b2b')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'b2b'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              B2B (GST)
            </button>
            <button
              onClick={() => setFilterType('high_value')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'high_value'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              High Value
            </button>
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-2.5 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
          >
            <option value="recent">Recently Added</option>
            <option value="name">Name (A-Z)</option>
            <option value="spend">Highest Spend</option>
            <option value="visits">Most Visits</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 uppercase font-semibold">
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Mobile No / Contact</th>
                <th className="py-3 px-3">Location / Address</th>
                <th className="py-3 px-3 text-center">Orders</th>
                <th className="py-3 px-3 text-right">Total Spent</th>
                <th className="py-3 px-3 text-center">Loyalty</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-neutral-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-1" />
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      No customers found matching "{searchQuery}"
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Click "+ Add New Customer" to register a new customer
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const stats = customerStatsMap[customer.id] || { totalOrders: 0, totalSpent: 0 };
                  const cleanPhone = customer.phone.replace(/\D/g, '');
                  const formattedPhone = cleanPhone.length === 10
                    ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
                    : customer.phone;

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setViewingCustomer(customer)}
                              className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400 text-left truncate block"
                            >
                              {customer.name}
                            </button>
                            {customer.gstin && (
                              <span className="inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                GST: {customer.gstin}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone & Instant Contact */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-neutral-900 dark:text-neutral-200 font-medium">
                            {formattedPhone}
                          </span>

                          {/* Instant WhatsApp action button */}
                          <a
                            href={`https://wa.me/91${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition-colors"
                            title="Open WhatsApp Chat"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>

                          {/* Direct Call */}
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Call customer"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                        {customer.email && (
                          <span className="text-[11px] text-neutral-500 block truncate max-w-[180px]">
                            {customer.email}
                          </span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {customer.address ? (
                          <span className="truncate max-w-[190px] block" title={customer.address}>
                            {customer.address}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Total Orders */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          {stats.totalOrders}
                        </span>
                        {stats.totalOrders > 0 && (
                          <span className="block text-[10px] text-neutral-400">bills</span>
                        )}
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                          {formatCurrency(stats.totalSpent, settings.currencySymbol)}
                        </span>
                      </td>

                      {/* Loyalty */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono">
                          ⭐ {customer.loyaltyPoints || 0}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Bill to customer button */}
                          <button
                            onClick={() => selectCustomerForPOS(customer)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-md transition-colors"
                            title="Start Bill in POS for this customer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Bill</span>
                          </button>

                          {/* View invoices history */}
                          <button
                            onClick={() => setViewingCustomer(customer)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                            title="View Purchase History"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit customer */}
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                            title="Edit Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete customer */}
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {editingCustomer ? 'Edit Customer Details' : 'Add New Customer (ग्राहक जोड़ें)'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCustomer} className="p-4 space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300">
                  {formError}
                </div>
              )}

              {/* Customer Name */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Customer Name (ग्राहक का नाम) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra / Sharma Ji"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Mobile Number (मोबाइल नंबर) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="9876543210"
                    className="w-full pl-11 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Used for WhatsApp bill sharing and customer lookup during billing
                </p>
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address (ईमेल - Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@gmail.com"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Address / City (पता - Optional)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Shop 4, Sector 18, Noida"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* GSTIN (For B2B customers) */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  GSTIN (Optional for B2B billing)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="07AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono uppercase focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Special Notes / Preferences
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Delivery timings, preference for organic brands..."
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingCustomer ? 'Update Customer' : 'Save Customer (सुरक्षित करें)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile & Purchase History Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[88vh] flex flex-col overflow-hidden">
            {/* Modal Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-lg font-bold flex items-center justify-center">
                  {viewingCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {viewingCustomer.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 font-mono mt-0.5">
                    <span>📱 +91 {viewingCustomer.phone}</span>
                    {viewingCustomer.email && <span>✉️ {viewingCustomer.email}</span>}
                    {viewingCustomer.address && <span>📍 {viewingCustomer.address}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingCustomer(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Bar for This Customer */}
            <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-neutral-500">Reward Points: </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    ⭐ {viewingCustomer.loyaltyPoints || 0}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Total Spent: </span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                    {formatCurrency(customerStatsMap[viewingCustomer.id]?.totalSpent || 0, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/91${viewingCustomer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-white dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => {
                    selectCustomerForPOS(viewingCustomer);
                    setViewingCustomer(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Start New Bill</span>
                </button>
              </div>
            </div>

            {/* Invoice History List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Purchase History ({getCustomerInvoices(viewingCustomer).length} Invoices)
              </h4>

              {getCustomerInvoices(viewingCustomer).length === 0 ? (
                <div className="py-10 text-center text-neutral-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 stroke-1" />
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    No past bills recorded for this customer yet.
                  </p>
                  <button
                    onClick={() => {
                      selectCustomerForPOS(viewingCustomer);
                      setViewingCustomer(null);
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg"
                  >
                    Generate First Invoice
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {getCustomerInvoices(viewingCustomer).map(inv => (
                    <div
                      key={inv.id}
                      className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            {inv.invoiceNumber}
                          </span>
                          <span className="uppercase text-[10px] px-1.5 py-0.2 rounded font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                            {inv.paymentMethod}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-neutral-500 text-[11px] mt-0.5">
                          {formatDateTime(inv.createdAt)} · {inv.items.length} items ({inv.items.map(i => i.name).slice(0, 2).join(', ')}{inv.items.length > 2 ? '...' : ''})
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                          {formatCurrency(inv.grandTotal, settings.currencySymbol)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <button
                            onClick={() => setSelectedInvoiceForModal(inv)}
                            className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 underline"
                          >
                            View Bill
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice modal for reprinting / reviewing bill */}
      {selectedInvoiceForModal && (
        <InvoiceModal
          invoice={selectedInvoiceForModal}
          onClose={() => setSelectedInvoiceForModal(null)}
        />
      )}
    </div>
  );
};
