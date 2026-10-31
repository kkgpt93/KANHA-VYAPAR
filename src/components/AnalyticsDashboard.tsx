import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  IndianRupee,
  Calendar,
  Download,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';

export const AnalyticsDashboard: React.FC = () => {
  const { invoices, products, settings } = useApp();

  const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | '7_days' | 'today' | 'all'>('this_month');

  // Filter invoices based on dateRange
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter(inv => {
      if (inv.status === 'refunded' || inv.status === 'cancelled') return false;
      const invDate = new Date(inv.createdAt);

      if (dateRange === 'today') {
        return invDate.toDateString() === now.toDateString();
      }
      if (dateRange === '7_days') {
        const diffDays = (now.getTime() - invDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (dateRange === 'this_month') {
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }
      if (dateRange === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return invDate.getMonth() === lastMonth && invDate.getFullYear() === year;
      }
      return true;
    });
  }, [invoices, dateRange]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  }, [filteredInvoices]);

  const totalOrders = filteredInvoices.length;

  const averageOrderValue = useMemo(() => {
    return totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  }, [totalRevenue, totalOrders]);

  const totalTaxCollected = useMemo(() => {
    return filteredInvoices.reduce((sum, i) => sum + i.taxTotal, 0);
  }, [filteredInvoices]);

  // Estimate Profit / Margin
  const totalCost = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      const invCost = inv.items.reduce((cSum, it) => {
        const p = products.find(prod => prod.id === it.productId);
        const cp = p ? p.costPrice : it.unitPrice * 0.75;
        return cSum + cp * it.quantity;
      }, 0);
      return sum + invCost;
    }, 0);
  }, [filteredInvoices, products]);

  const grossProfit = Math.max(0, totalRevenue - totalCost - totalTaxCollected);
  const profitMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  // Monthly Daily Breakdown for Bar Chart
  const dailyBreakdown = useMemo(() => {
    // Generate dates for current month (up to 30 days)
    const daysMap = new Map<number, { day: number; revenue: number; orders: number }>();
    const daysInMonth = 30;

    for (let d = 1; d <= daysInMonth; d++) {
      daysMap.set(d, { day: d, revenue: 0, orders: 0 });
    }

    filteredInvoices.forEach(inv => {
      const day = new Date(inv.createdAt).getDate();
      const existing = daysMap.get(day);
      if (existing) {
        existing.revenue += inv.grandTotal;
        existing.orders += 1;
      } else {
        daysMap.set(day, { day, revenue: inv.grandTotal, orders: 1 });
      }
    });

    return Array.from(daysMap.values()).sort((a, b) => a.day - b.day);
  }, [filteredInvoices]);

  const maxDailyRevenue = Math.max(1000, ...dailyBreakdown.map(d => d.revenue));

  // Category Breakdown
  const categorySales = useMemo(() => {
    const map = new Map<string, number>();
    filteredInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const cat = prod ? prod.category : 'General';
        map.set(cat, (map.get(cat) || 0) + it.total);
      });
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return entries;
  }, [filteredInvoices, products]);

  // Payment Method Distribution
  const paymentBreakdown = useMemo(() => {
    const counts = { cash: 0, upi: 0, card: 0 };
    filteredInvoices.forEach(inv => {
      if (inv.paymentMethod in counts) {
        counts[inv.paymentMethod as keyof typeof counts] += inv.grandTotal;
      }
    });
    return counts;
  }, [filteredInvoices]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    filteredInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const existing = map.get(it.productId);
        if (existing) {
          existing.quantity += it.quantity;
          existing.revenue += it.total;
        } else {
          map.set(it.productId, {
            name: it.name,
            quantity: it.quantity,
            revenue: it.total,
          });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredInvoices]);

  const handleExportReportCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Date Range', dateRange],
      ['Total Sales Revenue (₹)', totalRevenue],
      ['Total Orders', totalOrders],
      ['Average Order Value (₹)', averageOrderValue],
      ['Estimated Gross Profit (₹)', grossProfit],
      ['Gross Profit Margin (%)', `${profitMarginPercent}%`],
      ['GST / Tax Collected (₹)', totalTaxCollected],
      ['Cash Sales (₹)', paymentBreakdown.cash],
      ['UPI Sales (₹)', paymentBreakdown.upi],
      ['Card Sales (₹)', paymentBreakdown.card],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VyaparPOS_Monthly_Report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Monthly Sales & Revenue Report
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time business intelligence, profit margins, and sales trends
          </p>
        </div>

        {/* Date Range Selector & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setDateRange('today')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                dateRange === 'today'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('7_days')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                dateRange === '7_days'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('this_month')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                dateRange === 'this_month'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('last_month')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                dateRange === 'last_month'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Last Month
            </button>
          </div>

          <button
            onClick={handleExportReportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
          {/* Card 1: Total Sales */}
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">
              Total Revenue
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
              {formatCurrency(totalRevenue, settings.currencySymbol)}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              {totalOrders} Invoices Paid
            </div>
          </div>

          {/* Card 2: Estimated Profit */}
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">
              Gross Profit
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
              {formatCurrency(grossProfit, settings.currencySymbol)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Margin: <span className="text-emerald-600 font-semibold">{profitMarginPercent}%</span>
            </div>
          </div>

          {/* Card 3: Average Order Value */}
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">
              Avg. Order Value (AOV)
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
              {formatCurrency(averageOrderValue, settings.currencySymbol)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Per checkout transaction
            </div>
          </div>

          {/* Card 4: Tax / GST Collected */}
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">
              GST / Tax Collected
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-1">
              {formatCurrency(totalTaxCollected, settings.currencySymbol)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Direct tax liability
            </div>
          </div>
        </div>

        {/* Monthly Sales Revenue Chart */}
        <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Daily Sales Revenue Curve
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Day-by-day sales activity across the period
              </p>
            </div>
            <div className="text-xs font-mono font-medium text-emerald-600">
              Peak: ₹{maxDailyRevenue.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Clean SVG Bar Chart */}
          <div className="h-44 w-full flex items-end gap-1 sm:gap-2 pt-4 border-b border-neutral-200 dark:border-neutral-800">
            {dailyBreakdown.map(item => {
              const heightPct = maxDailyRevenue > 0 ? (item.revenue / maxDailyRevenue) * 100 : 0;
              const hasSales = item.revenue > 0;

              return (
                <div
                  key={item.day}
                  className="flex-1 flex flex-col items-center group relative h-full justify-end"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none bg-neutral-900 text-white text-[10px] font-mono py-1 px-2 rounded shadow-md whitespace-nowrap">
                    <span>Day {item.day}: ₹{item.revenue.toLocaleString('en-IN')}</span>
                    <span className="text-neutral-400">({item.orders} orders)</span>
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                    className={`w-full rounded-t-xs transition-all duration-300 ${
                      hasSales
                        ? 'bg-emerald-500 dark:bg-emerald-400 group-hover:bg-emerald-600'
                        : 'bg-neutral-100 dark:bg-neutral-800'
                    }`}
                  />
                  {/* Day label */}
                  <span className="text-[9px] sm:text-[10px] text-neutral-400 font-mono mt-1">
                    {item.day % 3 === 0 || item.day === 1 ? item.day : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two Columns: Category Breakdown & Payment Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sales by Category */}
          <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Sales by Category
            </h3>

            <div className="space-y-3 pt-2">
              {categorySales.length === 0 ? (
                <p className="text-xs text-neutral-400">No sales recorded for this period.</p>
              ) : (
                categorySales.slice(0, 5).map(([catName, amt]) => {
                  const pct = totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0;
                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {catName}
                        </span>
                        <span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                          ₹{amt.toLocaleString('en-IN')} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment Method Split */}
          <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Payment Method Breakdown
            </h3>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase">UPI / QR</div>
                <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
                  ₹{paymentBreakdown.upi.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {totalRevenue > 0 ? Math.round((paymentBreakdown.upi / totalRevenue) * 100) : 0}% of Total
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase">Cash</div>
                <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
                  ₹{paymentBreakdown.cash.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {totalRevenue > 0 ? Math.round((paymentBreakdown.cash / totalRevenue) * 100) : 0}% of Total
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase">Card</div>
                <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
                  ₹{paymentBreakdown.card.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {totalRevenue > 0 ? Math.round((paymentBreakdown.card / totalRevenue) * 100) : 0}% of Total
                </div>
              </div>
            </div>

            {/* Top 5 Products Leaderboard */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Top Selling Items
              </h4>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {topProducts.map((tp, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center">
                    <span className="truncate max-w-[200px] text-neutral-800 dark:text-neutral-200">
                      {idx + 1}. {tp.name}
                    </span>
                    <span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                      {tp.quantity} sold · ₹{tp.revenue.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
