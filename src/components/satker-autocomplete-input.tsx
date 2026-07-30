'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Search, X } from 'lucide-react';
import type { Satker } from '@/lib/types';

let cachedSatkerList: Satker[] | null = null;

type SatkerAutocompleteInputProps = {
  value: string; // contains kode_satker or "kode_satker - nama_satker" or satker name
  onChange: (val: string, selectedSatker?: Satker) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  compact?: boolean;
};

export function SatkerAutocompleteInput({
  value,
  onChange,
  label = 'Satuan Kerja (Satker)',
  placeholder = 'Cari Kode / Nama Satker (contoh: 693412 - ITB)...',
  required = false,
  disabled = false,
  error,
  compact = false,
}: SatkerAutocompleteInputProps) {
  const [satkerList, setSatkerList] = useState<Satker[]>(cachedSatkerList || []);
  const [loading, setLoading] = useState(!cachedSatkerList);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cachedSatkerList) {
      setSatkerList(cachedSatkerList);
      setLoading(false);
      return;
    }

    let active = true;
    fetch('/api/satker')
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        const list: Satker[] = json.data || [];
        cachedSatkerList = list;
        setSatkerList(list);
      })
      .catch((err) => console.error('Gagal memuat list satker:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSatker = useMemo(() => {
    if (!searchTerm.trim()) return satkerList;
    const term = searchTerm.toLowerCase();
    return satkerList.filter(
      (item) =>
        item.kode_satker.toLowerCase().includes(term) ||
        item.nama_satker.toLowerCase().includes(term) ||
        `${item.kode_satker} - ${item.nama_satker}`.toLowerCase().includes(term)
    );
  }, [satkerList, searchTerm]);

  // Find matching satker item for value
  const selectedSatker = useMemo(() => {
    if (!value) return null;
    return satkerList.find(
      (item) =>
        item.kode_satker === value ||
        `${item.kode_satker} - ${item.nama_satker}` === value ||
        item.nama_satker.toLowerCase() === value.toLowerCase()
    );
  }, [satkerList, value]);

  const displayValue = selectedSatker
    ? `${selectedSatker.kode_satker} - ${selectedSatker.nama_satker}`
    : value;

  function handleSelect(item: Satker) {
    const formatted = `${item.kode_satker} - ${item.nama_satker}`;
    onChange(formatted, item);
    setIsOpen(false);
    setSearchTerm('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  }

  if (compact) {
    return (
      <div ref={containerRef} className="relative w-full">
        {label && (
          <label className="grid gap-2 text-sm font-bold text-slate-700 mb-1">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`group flex items-center justify-between rounded-2xl border bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition cursor-pointer ${
            disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'hover:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100'
          } ${error ? 'border-rose-300' : 'border-sky-100'}`}
        >
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-sky-600 transition" />
            <span className={`truncate text-sm font-semibold ${displayValue ? 'text-slate-900' : 'text-slate-400'}`}>
              {displayValue || placeholder}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {displayValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-sky-100 bg-white p-2 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150 max-h-72 flex flex-col">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik kode / nama satker..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-500 font-semibold">Memuat daftar Satker...</div>
              ) : filteredSatker.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-semibold">
                  Satker &quot;{searchTerm}&quot; tidak ditemukan.
                </div>
              ) : (
                filteredSatker.map((item) => {
                  const isSelected = selectedSatker?.kode_satker === item.kode_satker;
                  return (
                    <button
                      key={item.kode_satker}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-sky-50 transition ${
                        isSelected ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-sky-700 mr-2">[{item.kode_satker}]</span>
                        <span>{item.nama_satker}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-sky-600" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
        {error && <span className="mt-1 block text-xs font-black text-rose-600">{error}</span>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-bold text-[#080C1A] mb-1.5">
          {label} {required && <span className="text-[#ED6B60]">*</span>}
        </label>
      )}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`group flex items-center justify-between rounded-2xl border bg-[#F9FAFB] pl-3.5 pr-4 py-3 text-sm font-medium text-[#080C1A] outline-none transition cursor-pointer ${
          disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'hover:border-[#165DFF] focus-within:ring-2 focus-within:ring-[#165DFF]/20 focus-within:bg-white'
        } ${error ? 'border-rose-300' : 'border-[#E5E7EB]'}`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden pr-2">
          <Building2 className="h-4 w-4 shrink-0 text-[#6A7686]" />
          <span className={`text-sm font-semibold leading-relaxed break-words ${displayValue ? 'text-[#080C1A]' : 'text-[#6A7686]/60'}`}>
            {displayValue || placeholder}
          </span>
        </div>


        <div className="flex items-center gap-1 shrink-0">
          {displayValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-[#6A7686] hover:text-[#080C1A] rounded-full hover:bg-slate-200 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-[#6A7686] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150 max-h-72 flex flex-col">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6A7686]" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kode atau nama satker..."
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 py-2 text-xs font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 outline-none focus:border-[#165DFF] focus:bg-white focus:ring-2 focus:ring-[#165DFF]/20"
            />
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 text-center text-xs text-[#6A7686] font-medium">Memuat daftar Satker...</div>
            ) : filteredSatker.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#6A7686] font-medium">
                Satker &quot;{searchTerm}&quot; tidak ditemukan.
              </div>
            ) : (
              filteredSatker.map((item) => {
                const isSelected = selectedSatker?.kode_satker === item.kode_satker;
                return (
                  <button
                    key={item.kode_satker}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#EFF2F7] transition ${
                      isSelected ? 'bg-[#165DFF]/10 text-[#165DFF] font-bold' : 'text-[#080C1A] font-medium'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-[#165DFF] mr-2">[{item.kode_satker}]</span>
                      <span>{item.nama_satker}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-[#165DFF]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
      {error && <span className="mt-1 block text-xs font-medium text-[#ED6B60]">{error}</span>}
    </div>
  );
}
