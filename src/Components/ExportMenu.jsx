import React, { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiDownload, FiFileText } from 'react-icons/fi';

const ExportMenu = ({ label = 'Export', onExportCSV, onExportPDF, disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const run = (fn) => {
    fn();
    setOpen(false);
  };

  return (
    <div className={`relative w-full md:w-auto ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full dashboard-hero-pill flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-500/10"
        aria-expanded={open}
      >
        <FiDownload size={18} />
        <span className="font-semibold">{label}</span>
        <FiChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-2xl">
          <button
            type="button"
            onClick={() => run(onExportCSV)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-alt"
          >
            <FiFileText size={16} className="text-emerald-600" />
            Export as CSV
          </button>
          <button
            type="button"
            onClick={() => run(onExportPDF)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-alt"
          >
            <FiDownload size={16} className="text-rose-600" />
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
