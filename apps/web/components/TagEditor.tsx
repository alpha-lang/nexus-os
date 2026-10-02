'use client';

import { useState } from 'react';

const SUGGESTED = [
  { tag: 'VIP',          color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { tag: 'À risque',     color: 'bg-red-100 text-red-700 border-red-300' },
  { tag: 'En essai',     color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { tag: 'Fidèle',       color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { tag: 'Grand compte', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { tag: 'En négociation', color: 'bg-orange-100 text-orange-700 border-orange-300' },
];

const DEFAULT_COLOR = 'bg-slate-100 text-slate-700 border-slate-300';

function getTagColor(tag: string) {
  return SUGGESTED.find((s) => s.tag === tag)?.color || DEFAULT_COLOR;
}

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function TagEditor({ tags = [], onChange, disabled }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t) || tags.length >= 20) return;
    onChange([...tags, t]);
    setInput('');
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    if (disabled) return;
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const available = SUGGESTED.filter((s) => !tags.includes(s.tag));

  return (
    <div>
      {/* Tags existants */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
        {tags.length === 0 && (
          <p className="text-xs text-slate-400 italic py-1.5">Aucun tag</p>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className={'inline-flex items-center gap-1.5 text-[11px] font-bold pl-2 pr-1 py-1 rounded-md border ' + getTagColor(t)}
          >
            {t}
            {!disabled && (
              <button
                onClick={() => removeTag(t)}
                className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center text-[10px] font-black transition"
                title="Retirer"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Input */}
      {!disabled && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ajouter un tag (Entrée pour valider)…"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
            {input && (
              <button
                onClick={() => addTag(input)}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
              >
                Ajouter
              </button>
            )}
          </div>

          {/* Suggestions */}
          {showSuggestions && available.length > 0 && !input && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider py-1">Suggestions :</span>
              {available.slice(0, 6).map((s) => (
                <button
                  key={s.tag}
                  onClick={() => addTag(s.tag)}
                  className={'text-[10px] font-bold px-2 py-1 rounded border hover:shadow-sm transition ' + s.color}
                >
                  + {s.tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
