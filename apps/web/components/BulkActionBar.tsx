'use client';

interface Action {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
}

interface Props {
  count: number;
  actions: Action[];
  onClear: () => void;
}

export default function BulkActionBar({ count, actions, onClear }: Props) {
  if (count === 0) return null;

  const variantClass = (v?: string) => {
    if (v === 'danger') return 'bg-red-500 hover:bg-red-600 text-white';
    if (v === 'primary') return 'bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white';
    return 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700';
  };

  return (
    <div className="fixed bottom-20 lg:bottom-10 right-4 lg:right-6 z-[60] animate-in slide-in-from-bottom duration-200">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 px-4 py-3 flex items-center gap-4 max-w-[90vw]">
        {/* Compteur */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-black text-sm">
            {count}
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">
              Sélectionné{count > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-300 mt-0.5">élément{count > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-700 shrink-0" />

        {/* Actions */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              disabled={a.disabled}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${variantClass(a.variant)} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {a.icon && <span>{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-slate-700 shrink-0" />

        {/* Annuler */}
        <button
          onClick={onClear}
          className="text-slate-400 hover:text-white text-xs font-bold transition shrink-0 px-2"
          title="Tout désélectionner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
