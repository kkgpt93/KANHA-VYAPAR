import React, { useState } from 'react';
import {
  Building2,
  PackagePlus,
  UserPlus,
  Users,
  ShoppingBag,
  Copy,
  Check,
  ArrowRight,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, QuickEntryAction } from '../types';
import { generateBarcode } from '../utils/formatters';

interface EntryLinkItem {
  id: QuickEntryAction;
  step: string;
  title: string;
  titleHindi: string;
  description: string;
  countLabel: string;
  ctaLabel: string;
  icon: React.ReactNode;
}

export const DataSetupHub: React.FC = () => {
  const {
    products,
    customers,
    invoices,
    users,
    settings,
    addProduct,
    clearAllData,
    triggerQuickEntry,
    getDirectEntryUrl,
  } = useApp();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [csvFeedback, setCsvFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [confirmCleanStep, setConfirmCleanStep] = useState(false);
  const [cleanedNotice, setCleanedNotice] = useState(false);

  const isStoreConfigured =
    settings.storeName.trim() !== '' &&
    settings.storeName.trim() !== 'My Store' &&
    (settings.phone.trim() !== '' || settings.upiVpa.trim() !== '');

  const entryLinks: EntryLinkItem[] = [
    {
      id: 'store-profile',
      step: '01.',
      title: 'Store Profile, GST & UPI Setup',
      titleHindi: 'दुकान का नाम, मोबाइल, पता, GST और UPI QR सेट करें',
      description:
        'Configure business name, bill header address, phone number, GSTIN, and UPI ID for instant QR code billing.',
      countLabel: isStoreConfigured ? `Configured (${settings.storeName})` : 'Setup Pending',
      ctaLabel: 'Set Store Details',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'add-product',
      step: '02.',
      title: 'Add New Products & Stock',
      titleHindi: 'नए प्रोडक्ट्स, बारकोड, रेट और स्टॉक जोड़ें',
      description:
        'Add items with barcode, Hindi/English name, purchase cost, selling price, GST slab, and opening stock.',
      countLabel: `${products.length} Products`,
      ctaLabel: '+ Add New Product',
      icon: <PackagePlus className="w-4 h-4" />,
    },
    {
      id: 'add-customer',
      step: '03.',
      title: 'Add New Customers',
      titleHindi: 'नए ग्राहकों का नाम, मोबाइल नंबर और पता जोड़ें',
      description:
        'Register regular and B2B customers with mobile number, address, and GSTIN for quick billing lookup.',
      countLabel: `${customers.length} Customers`,
      ctaLabel: '+ Add New Customer',
      icon: <UserPlus className="w-4 h-4" />,
    },
    {
      id: 'add-staff',
      step: '04.',
      title: 'Add Staff / Edit Owner PIN',
      titleHindi: 'ओनर प्रोफाइल अपडेट करें या नया कैशियर/स्टाफ जोड़ें',
      description:
        'Update owner name & security PIN or create accounts for store managers, billing cashiers, and stock clerks.',
      countLabel: `${users.length} Operators`,
      ctaLabel: '+ Add / Edit Staff',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'new-bill',
      step: '05.',
      title: 'Start New POS Bill / Invoice',
      titleHindi: 'नया बिल काटें और रसीद प्रिंट करें',
      description:
        'Open the POS billing counter to scan barcodes, select customers, accept Cash/UPI/Card, and print receipts.',
      countLabel: `${invoices.length} Bills Created`,
      ctaLabel: 'Open POS Billing',
      icon: <ShoppingBag className="w-4 h-4" />,
    },
  ];

  const handleCopyUrl = async (action: QuickEntryAction, key: string) => {
    const url = getDirectEntryUrl(action);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDownloadCsvTemplate = () => {
    const headers = [
      'Barcode',
      'Name',
      'HindiName',
      'Category',
      'CostPrice',
      'SellingPrice',
      'Stock',
      'MinStockAlert',
      'Unit',
      'TaxRate',
    ];
    const exampleRow = [
      '8901000000011',
      'Sample Sugar 1kg',
      'चीनी 1 किग्रा',
      'Groceries & Staples',
      '40',
      '46',
      '50',
      '10',
      'kg',
      '5',
    ];
    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'VyaparPOS_New_Products_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleBulkCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = String(ev.target?.result || '');
        const lines = text
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setCsvFeedback({
            type: 'error',
            text: 'CSV फ़ाइल खाली है। कृपया टेम्पलेट डाउनलोड करके उसमें प्रोडक्ट्स भरें।',
          });
          return;
        }

        let importedCount = 0;
        const allowedUnits: Product['unit'][] = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pkt'];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const name = (cols[1] || '').trim();
          const sellingPrice = Number(cols[5]);
          if (!name || Number.isNaN(sellingPrice)) continue;

          const barcode = (cols[0] || '').trim() || generateBarcode();
          const nameHindi = (cols[2] || '').trim() || undefined;
          const category = (cols[3] || '').trim() || 'General';
          const costPrice = Number(cols[4]) || 0;
          const stock = Number(cols[6]) || 0;
          const minStockAlert = Number(cols[7]) || 5;
          const rawUnit = (cols[8] || 'pcs').trim().toLowerCase() as Product['unit'];
          const unit: Product['unit'] = allowedUnits.includes(rawUnit) ? rawUnit : 'pcs';
          const taxRate = Number(cols[9]) || 0;

          addProduct({
            barcode,
            name,
            nameHindi,
            category,
            costPrice,
            sellingPrice,
            stock,
            minStockAlert,
            unit,
            taxRate,
          });
          importedCount++;
        }

        if (importedCount > 0) {
          setCsvFeedback({
            type: 'success',
            text: `${importedCount} नए प्रोडक्ट्स सफलतापूर्वक इन्वेंटरी में जोड़ दिए गए!`,
          });
        } else {
          setCsvFeedback({
            type: 'error',
            text: 'कोई मान्य प्रोडक्ट पंक्ति नहीं मिली। कृपया Name और SellingPrice कॉलम जांचें।',
          });
        }
      } catch {
        setCsvFeedback({
          type: 'error',
          text: 'CSV फ़ाइल पढ़ने में त्रुटि हुई।',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const masterHubUrl = getDirectEntryUrl('setup-hub');

  const whatsappAllLinksText = encodeURIComponent(
    [
      `*${settings.storeName || 'VyaparPOS'} — New Data Entry Direct Links*`,
      `01. Data Setup Hub: ${masterHubUrl}`,
      `02. Store Profile Setup: ${getDirectEntryUrl('store-profile')}`,
      `03. Add New Product: ${getDirectEntryUrl('add-product')}`,
      `04. Add New Customer: ${getDirectEntryUrl('add-customer')}`,
      `05. Add Staff / Roles: ${getDirectEntryUrl('add-staff')}`,
      `06. New POS Bill: ${getDirectEntryUrl('new-bill')}`,
    ].join('\n')
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            New Data Entry & Direct Links Hub
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            सभी पुराना डेमो डेटा साफ कर दिया गया है — नीचे दिए डायरेक्ट लिंक्स से अपना नया डेटा जोड़ें
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopyUrl('setup-hub', 'master-hub')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            {copiedId === 'master-hub' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hub Link Copied</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                <span>Copy Master Setup Link</span>
              </>
            )}
          </button>

          <a
            href={`https://wa.me/?text=${whatsappAllLinksText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Share All Links on WhatsApp</span>
          </a>
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Master Hub URL Bar */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-medium text-neutral-500">
              All-in-One New Data Setup Direct URL
            </div>
            <div className="text-xs sm:text-sm font-mono text-neutral-900 dark:text-neutral-100 truncate">
              {masterHubUrl}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopyUrl('setup-hub', 'master-bar')}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copiedId === 'master-bar' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Direct Link</span>
              </>
            )}
          </button>
        </div>

        {/* All New Data Entry Modules & Direct Links */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-200 dark:divide-neutral-800">
          {entryLinks.map(item => {
            const directUrl = getDirectEntryUrl(item.id);
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {item.step}
                    </span>
                    <span>{item.countLabel}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-neutral-700 dark:text-neutral-300">{item.icon}</span>
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {item.titleHindi}
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">{item.description}</p>

                  <div className="pt-1 flex items-center gap-2 text-[11px] font-mono text-neutral-500 truncate">
                    <span className="truncate">{directUrl}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item.id, item.id)}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerQuickEntry(item.id)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{item.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom 2-Column Section: Bulk CSV Product Import + Clean All Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bulk CSV Product Import */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Bulk Add Products via Excel / CSV
              </h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                एक साथ बहुत सारे नए प्रोडक्ट्स जोड़ने के लिए CSV टेम्पलेट डाउनलोड करें, उसमें आइटम भरें और यहाँ अपलोड करें।
              </p>
            </div>

            {csvFeedback && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  csvFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                }`}
              >
                {csvFeedback.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Template</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Products CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleBulkCsvUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Clean / Wipe All Store Data */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Clean / Reset All Store Data
              </h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                भविष्य में कभी भी सभी प्रोडक्ट्स, ग्राहक, बिल और सेटिंग्स को पूरी तरह साफ (Zero Reset) करने के लिए इसका उपयोग करें। (आपका लाइसेंस सुरक्षित रहेगा)।
              </p>
            </div>

            {cleanedNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
                सारा स्टोर डेटा सफलतापूर्वक साफ (Clean) कर दिया गया है!
              </div>
            )}

            {!confirmCleanStep ? (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCleanStep(true);
                    setCleanedNotice(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clean All Store Data</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearAllData();
                    setConfirmCleanStep(false);
                    setCleanedNotice(true);
                    setTimeout(() => setCleanedNotice(false), 3500);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                >
                  Yes, Wipe Everything Clean
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCleanStep(false)}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
