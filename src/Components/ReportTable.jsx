import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiDownload, FiSearch } from 'react-icons/fi';
import { exportToCSV } from '../utils/exportUtils';

const ReportTable = ({
  title,
  subtitle,
  columns,
  data,
  searchKeys = [],
  filterOptions = null,
  pageSize = 10,
  exportFilename = 'report',
}) => {
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState('All');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = [...data];

    if (search.trim() && searchKeys.length) {
      const term = search.toLowerCase();
      rows = rows.filter((row) =>
        searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(term))
      );
    }

    if (filterOptions && filterValue !== 'All') {
      rows = rows.filter((row) => row[filterOptions.key] === filterValue);
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return rows;
  }, [data, search, searchKeys, filterOptions, filterValue, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    exportToCSV(filtered, exportFilename, columns);
  };

  return (
    <section className="surface-card border border-border rounded-2xl overflow-hidden shadow-xl">
      <div className="border-b border-border p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-primary"
              />
            </div>
            {filterOptions && (
              <select
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPage(1);
                }}
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
              >
                <option value="All">All</option>
                {filterOptions.values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            <button type="button" onClick={handleExport} className="action-button" title="Export table">
              <FiDownload size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-surface-alt">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted"
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key &&
                      (sortDir === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length ? (
              paginated.map((row, idx) => (
                <tr key={row.id ?? idx} className="border-t border-border hover:bg-surface-alt/80">
                  {columns.map((col) => {
                    const raw = row[col.key];
                    const value = col.format ? col.format(raw, row) : raw;
                    return (
                      <td key={col.key} className="px-5 py-4 text-sm text-primary">
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-secondary">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-secondary">
        <span>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-border px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 py-1 text-primary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default ReportTable;
