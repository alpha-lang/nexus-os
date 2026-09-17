'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
  sub?: string; // description courte (email, phone, city…)
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Combobox searchable.
 * Fonctionne avec 5 ou 5000 options — input filtre + dropdown scrollable.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Rechercher...',
  emptyLabel = '— Aucun —',
  required = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Option sélectionnée (pour affichage)
  const selected = options.find((o) => o.value === value);

  // Liste filtrée
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sub || '').toLowerCase().includes(q)
    );
  }, [options, search]);

  // Ferme au clic extérieur
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Réinitialise le highlight quand la liste change
  useEffect(() => setHighlighted(0), [search, open]);

  function openList() {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  function pick(opt: Option) {
    onChange(opt.value);
    setOpen(false);
    setSearch('');
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setSearch('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) pick(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  }

  // Auto-scroll vers l'option surlignée
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  return (
    <div ref={boxRef} className="relative">
      {/* Trigger */}
      <div
        onClick={openList}
        className={
          'w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition ' +
          (open ? 'ring-2 ring-teal-400 border-teal-400 bg-white' : 'hover:border-slate-400')
        }
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required && !value}
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
          />
        ) : (
          <span className={'flex-1 text-sm truncate ' + (selected ? 'text-slate-900 font-medium' : 'text-slate-400')}>
            {selected ? selected.label : emptyLabel}
          </span>
        )}

        {value && !open && (
          <button
            type="button"
            onClick={clear}
            className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] font-bold transition shrink-0"
            title="Effacer"
          >
            ×
          </button>
        )}

        <svg
          className={'w-4 h-4 text-slate-400 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div
            ref={listRef}
            className="max-h-72 overflow-y-auto py-1"
          >
            {/* Option vide */}
            <button
              type="button"
              onClick={() => pick({ value: '', label: emptyLabel })}
              className={
                'w-full text-left px-3 py-2 text-sm transition ' +
                (!value && !search ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-500 hover:bg-slate-50 italic')
              }
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">
                Aucun résultat pour « {search} »
              </div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={
                    'w-full text-left px-3 py-2 transition flex items-center justify-between gap-3 ' +
                    (i === highlighted ? 'bg-teal-50' : 'hover:bg-slate-50') +
                    (opt.value === value ? ' font-bold' : '')
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-900 truncate">{opt.label}</div>
                    {opt.sub && <div className="text-[10px] text-slate-400 truncate">{opt.sub}</div>}
                  </div>
                  {opt.value === value && (
                    <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer compteur */}
          {filtered.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50/50 flex justify-between">
              <span>{filtered.length} option{filtered.length > 1 ? 's' : ''}</span>
              {search && <span>Filtré sur « {search} »</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
