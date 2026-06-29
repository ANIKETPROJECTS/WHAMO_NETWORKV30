import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function PropSection({
  title,
  children,
  defaultOpen = true,
  headerExtra,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerExtra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-md overflow-hidden">
      <div className="w-full flex items-center justify-between px-3 py-2 bg-[#e8edf5] select-none">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
        >
          <span
            className="text-[11px] font-semibold text-black uppercase tracking-wider"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {title}
          </span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-black shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-black shrink-0" />}
        </button>
        {headerExtra && (
          <div
            className="flex items-center gap-1 ml-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {headerExtra}
          </div>
        )}
      </div>
      {open && <div className="bg-white">{children}</div>}
    </div>
  );
}

export function PropRow({
  label,
  children,
  noBorder,
}: {
  label: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 ${!noBorder ? 'border-b border-slate-100' : ''}`}
    >
      <span
        className="text-[13px] font-semibold text-black w-[42%] shrink-0 leading-normal"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
