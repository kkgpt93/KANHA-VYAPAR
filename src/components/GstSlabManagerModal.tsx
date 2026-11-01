import React, { useState, useMemo, useEffect } from 'react';
import {
  Percent,
  Plus,
  Check,
  Trash2,
  RotateCcw,
  X,
  Star,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GstPriceMode, GstSupplyType } from '../types';
import { formatGstRate, normalizeGstSlabs } from '../utils/gst';

export interface GstSlabManagerPanelProps {
  compact?: boolean;
}

export const GstSlabManagerPanel: React.FC<GstSlabManagerPanelProps> = ({ compact = false }) => {
  const {
    settings,
    updateSettings,
    addOrUpdateGstSlab,
    toggleGstSlab,
    deleteGstSlab,
    resetGstSlabsToDefault,
  } = useApp();

  const [customRateInput, setCustomRateInput] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [makeDefault, setMakeDefault] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  const allSlabs = useMemo(() => normalizeGstSlabs(settings.gstSlabs), [settings.gstSlabs]);
  const enabledCount = useMemo(() => allSlabs.filter(s => s.enabled).length, [allSlabs]);

  const parsedPreviewRate = useMemo(() => {
    if (customRateInput.trim() === '') return null;
    const num = Number(customRateInput);
    if (!Number.isFinite(num) || num < 0 || num > 100) return null;
    return Number(num.toFixed(3));
  }, [customRateInput]);

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setErrorMsg(null);
    setTimeout(() => {
      setStatusMsg(prev => (prev === msg ? null : prev));
    }, 2800);
  };

  const handlePriceModeChange = (mode: GstPriceMode) => {
    updateSettings({
      ...settings,
      gstPriceMode: mode,
    });
    showToast(
      mode === 'inclusive'
        ? 'MRP Inclusive GST मोड लागू किया गया (रेट में GST शामिल रहेगा)'
        : 'GST Exclusive मोड लागू किया गया (रेट के ऊपर GST जुड़ेगा)'
    );
  };

  const handleSupplyTypeChange = (supplyType: GstSupplyType) => {
    updateSettings({
      ...settings,
      gstSupplyType: supplyType,
    });
    showToast(
      supplyType === 'interstate'
        ? 'IGST (Inter-State) टैक्स ब्रेकअप लागू किया गया'
        : 'CGST + SGST (Intra-State 50-50) टैक्स ब्रेकअप लागू किया गया'
    );
  };

  const handleSetDefaultRate = (rate: number) => {
    updateSettings({
      ...settings,
      defaultTaxRate: rate,
      gstSlabs: allSlabs.map(s => (s.rate === rate ? { ...s, enabled: true } : s)),
    });
    showToast(`डिफ़ॉल्ट GST स्लैब ${formatGstRate(rate)} सेट किया गया`);
  };

  const handleAddSlabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customRateInput.trim() === '') {
      setErrorMsg('कृपया GST प्रतिशत (e.g. 7.5, 9, 14, 21) दर्ज करें।');
      return;
    }
    const numeric = Number(customRateInput);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
      setErrorMsg('GST दर 0% से 100% के बीच होनी चाहिए।');
      return;
    }

    const saved = addOrUpdateGstSlab({
      rate: numeric,
      label: customLabel.trim() || undefined,
      description: customDescription.trim() || undefined,
      setAsDefault: makeDefault,
    });

    setCustomRateInput('');
    setCustomLabel('');
    setCustomDescription('');
    setMakeDefault(false);
    showToast(`${saved.label} सफलतापूर्वक आपके GST स्लैब्स में जोड़ दिया गया!`);
  };

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Custom & Multi-Slab GST Configuration (सभी GST स्लैब सेटिंग्स)</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            0%, 0.25%, 1.5%, 3%, 5%, 12%, 18%, 28%, 40% या अपनी पसंद का कोई भी कस्टम GST % स्लैब जोड़ें और बिलिंग में इस्तेमाल करें
          </p>
        </div>

        <div className="text-xs text-neutral-500 font-mono tabular-nums">
          <span>Active Slabs: {enabledCount}/{allSlabs.length}</span>
          <span className="mx-1.5">·</span>
          <span>Default: GST {formatGstRate(settings.defaultTaxRate)}</span>
        </div>
      </div>

      {statusMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Global GST Calculation Mode & Supply Split Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Price Calculation Mode */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            1. GST Price Calculation (रेट पर टैक्स कैसे लगे)
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-neutral-200/75 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => handlePriceModeChange('exclusive')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                (settings.gstPriceMode || 'exclusive') === 'exclusive'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Exclusive (Rate + GST)
            </button>
            <button
              type="button"
              onClick={() => handlePriceModeChange('inclusive')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                settings.gstPriceMode === 'inclusive'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Inclusive (MRP में GST)
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">
            {(settings.gstPriceMode || 'exclusive') === 'inclusive'
              ? 'MRP में से Taxable Value और GST अपने आप अलग होकर बिल पर दिखेगा।'
              : 'आइटम रेट के ऊपर चुना हुआ GST % जोड़कर कुल बिल बनेगा।'}
          </p>
        </div>

        {/* Intra-State vs Inter-State Split */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            2. Tax Split Type (CGST+SGST या IGST)
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-neutral-200/75 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => handleSupplyTypeChange('intrastate')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                (settings.gstSupplyType || 'intrastate') === 'intrastate'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              CGST + SGST (50-50%)
            </button>
            <button
              type="button"
              onClick={() => handleSupplyTypeChange('interstate')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                settings.gstSupplyType === 'interstate'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              IGST (Inter-State 100%)
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">
            {settings.gstSupplyType === 'interstate'
              ? 'दूसरे राज्य की बिक्री के लिए इनवॉइस पर सीधा IGST स्लैब टेबल छपेगा।'
              : 'राज्य के अंदर बिक्री के लिए प्रत्येक स्लैब आधा CGST और आधा SGST में दिखेगा।'}
          </p>
        </div>
      </div>

      {/* Add Custom GST Slab Form */}
      <form
        onSubmit={handleAddSlabSubmit}
        className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            + Add Custom GST Slab (अपने हिसाब से कोई भी नया GST % स्लैब जोड़ें)
          </div>
          {parsedPreviewRate !== null && (
            <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 tabular-nums">
              CGST {Number((parsedPreviewRate / 2).toFixed(3))}% + SGST{' '}
              {Number((parsedPreviewRate / 2).toFixed(3))}% · IGST {parsedPreviewRate}%
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              GST Rate (%) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={customRateInput}
              onChange={e => {
                setCustomRateInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. 7.5 or 14"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Slab Name (वैकल्पिक नाम)
            </label>
            <input
              type="text"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder={
                parsedPreviewRate !== null ? `GST ${parsedPreviewRate}%` : 'e.g. GST 7.5% Special'
              }
              className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Items / Notes (किन सामानों के लिए)
            </label>
            <input
              type="text"
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
              placeholder="e.g. Readymade Garments, Dry Fruits, Job Work..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={e => setMakeDefault(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Set as Default GST for new items (नए आइटम के लिए डिफ़ॉल्ट बनाएं)</span>
          </label>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add / Save GST Slab</span>
          </button>
        </div>
      </form>

      {/* Configured GST Slabs Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            All GST Slabs ({allSlabs.length}) — क्लिक करके किसी भी स्लैब को चालू/बंद या डिफ़ॉल्ट करें
          </span>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Standard Slabs</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-[11px]">
              <span className="text-neutral-500">Reset to default Indian slabs?</span>
              <button
                type="button"
                onClick={() => {
                  resetGstSlabsToDefault();
                  setConfirmReset(false);
                  showToast('सभी स्टैंडर्ड भारतीय GST स्लैब्स रीसेट हो गए।');
                }}
                className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold cursor-pointer"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className={compact ? 'max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800' : 'divide-y divide-neutral-100 dark:divide-neutral-800'}>
          {allSlabs.map(slab => {
            const half = Number((slab.rate / 2).toFixed(3));
            const isDefault = Number(settings.defaultTaxRate) === slab.rate;

            return (
              <div
                key={slab.id}
                className={`px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-colors ${
                  slab.enabled
                    ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    : 'opacity-55 bg-neutral-50/40 dark:bg-neutral-950/40'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                      {formatGstRate(slab.rate)}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {slab.label}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                      CGST {half}% + SGST {half}% / IGST {slab.rate}%
                    </span>
                    {isDefault && (
                      <>
                        <span className="text-neutral-300 dark:text-neutral-700">·</span>
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Default Slab
                        </span>
                      </>
                    )}
                    {slab.isCustom && (
                      <>
                        <span className="text-neutral-300 dark:text-neutral-700">·</span>
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          Custom
                        </span>
                      </>
                    )}
                  </div>
                  {slab.description && (
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {slab.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultRate(slab.rate)}
                      className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      title="Set as Default GST Rate for new items"
                    >
                      <Star className="w-3 h-3" />
                      <span>Set Default</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleGstSlab(slab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                      slab.enabled
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {slab.enabled ? 'Enabled ✓' : 'Disabled'}
                  </button>

                  {slab.isCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteGstSlab(slab.id);
                        showToast(`${slab.label} हटाया गया`);
                      }}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete custom GST slab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export interface GstSlabManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GstSlabManagerModal: React.FC<GstSlabManagerModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-3xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 brand-command-surface text-white border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 truncate">
              <Percent className="w-4 h-4 brand-gold-text shrink-0" />
              <span className="truncate">GST Slab Master (सभी GST स्लैब जोड़ें और कस्टमाइज़ करें)</span>
            </h3>
            <p className="text-[11px] text-white/75 mt-0.5 truncate">
              अपने व्यापार के हिसाब से कोई भी कस्टम GST % स्लैब बनाएं, चालू/बंद करें या टैक्स मोड बदलें
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <GstSlabManagerPanel compact />
        </div>

        <div className="px-4 sm:px-5 py-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Done (सेव और बंद करें)
          </button>
        </div>
      </div>
    </div>
  );
};
