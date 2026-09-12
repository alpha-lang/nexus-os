'use client';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  perPage?: number;
  perPageOptions?: number[];
  onPerPageChange?: (n: number) => void;
  total?: number;
}

export function Pagination({
  page, totalPages, onPageChange,
  perPage, perPageOptions, onPerPageChange,
  total,
}: PaginationProps) {
  if (totalPages <= 1 && !perPage) return null;

  // Numéros de page intelligents
  const pages: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
      <div className="text-xs text-slate-500 font-medium order-2 sm:order-1">
        {total !== undefined && <span>{total} resultat{total > 1 ? 's' : ''}</span>}
        {perPage && perPageOptions && onPerPageChange && (
          <select
            value={perPage}
            onChange={e => onPerPageChange(parseInt(e.target.value))}
            className="ml-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
          >
            {perPageOptions.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition"
        >
          ←
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-2 text-slate-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-9 h-9 rounded-lg font-bold text-sm transition ${
                p === page
                  ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition"
        >
          →
        </button>
      </div>
    </div>
  );
}
