import React, { useState, useMemo } from 'react';
import { Plus, SlidersHorizontal, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatGstRate, getEnabledGstSlabs, normalizeGstSlabs } from '../utils/gst';
import { GstSlabManagerModal } from './GstSlabManagerModal';

export interface GstSlabPickerProps {
  value: number;
  onChange: (rate: number) => void;
  label?: string;
  showManageButton?: boolean;
}

export const GstSlabPicker: React.FC<GstSlabPickerProps> = ({
  value,
  onChange,
  label = 'GST Slab / Tax (%) — अपने हिसाब से चुनें या नया % लिखें',
  showManageButton = true,
}) => {
  const { settings, addOrUpdateGstSlab } = useApp();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [justSavedSlab, setJustSavedSlab] = useState(false);

  const enabledSlabs = useMemo(
    () => getEnabledGstSlabs(settings.gstSlabs),
    [settings.gstSlabs]
  );

  const allSlabs = useMemo(
    () => normalizeGstSlabs(settings.gstSlabs),
    [settings.gstSlabs]
  );

  const cleanValue = Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
  const existsInStoreSlabs = useMemo(
    () => allSlabs.some(s => s.rate === cleanValue && s.enabled),
    [allSlabs, cleanValue]
  );

  const halfRate = Number((cleanValue / 2).toFixed(3));
  const isInterstate = settings.gstSupplyType === 'interstate';

  const handleSaveCurrentRateAsSlab = () => {
    addOrUpdateGstSlab({ rate: cleanValue });
    setJustSavedSlab(true);
    setTimeout(() => setJustSavedSlab(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {label}
        </label>

        <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 tabular-nums">
          <span>
            {isInterstate
              ? `IGST ${cleanValue}%`
              : `CGST ${halfRate}% + SGST ${halfRate}%`}
          </span>
          {showManageButton && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => setIsManagerOpen(true)}
                className="font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Manage All Slabs</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Slab Buttons + Custom % Input */}
      <div className="flex flex-wrap items-center gap-1.5">
        {enabledSlabs.map(slab => {
          const isActive = cleanValue === slab.rate;
          return (
            <button
              key={slab.id}
              type="button"
              onClick={() => onChange(slab.rate)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                  : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-emerald-500'
              }`}
              title={slab.description || slab.label}
            >
              {formatGstRate(slab.rate)}
            </button>
          );
        })}

        {/* Inline Custom % Input */}
        <div className="inline-flex items-center border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 px-2 py-1 focus-within:border-emerald-500">
          <span className="text-[11px] text-neutral-500 mr-1.5 whitespace-nowrap">
            Custom:
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={cleanValue}
            onChange={e => {
              const raw = e.target.value;
              if (raw === '') {
                onChange(0);
                return;
              }
              const parsed = Math.max(0, Math.min(100, Number(raw)));
              if (Number.isFinite(parsed)) {
                onChange(parsed);
              }
            }}
            className="w-16 text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 bg-transparent focus:outline-hidden text-right tabular-nums"
            aria-label="Custom GST Percentage"
          />
          <span className="text-xs font-mono text-neutral-500 ml-0.5">%</span>
        </div>

        {/* One-Click Save Custom Rate to Master Slabs */}
        {!existsInStoreSlabs && (
          <button
            type="button"
            onClick={handleSaveCurrentRateAsSlab}
            className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold inline-flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Save this custom GST % permanently to your slabs list"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save {formatGstRate(cleanValue)} Slab</span>
          </button>
        )}

        {justSavedSlab && (
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Slab Saved!</span>
          </span>
        )}
      </div>

      <GstSlabManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
      />
    </div>
  );
};
