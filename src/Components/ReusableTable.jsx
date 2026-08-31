// src/components/ReusableTable.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const ReusableTable = ({ columns, data, getRowStyle, getRowClassName, onRowClick }) => {
  const { tr } = useLanguage();
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const isSyncingRef = useRef(false);

  const checkScroll = useCallback(() => {
    if (tableRef.current && bottomScrollRef.current) {
      const scrollW = tableRef.current.scrollWidth;
      const clientW = bottomScrollRef.current.clientWidth;
      setContentWidth(scrollW);
      setCanScroll(scrollW > clientW + 2);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);

    let resizeObserver;
    if (window.ResizeObserver && bottomScrollRef.current) {
      resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });
      resizeObserver.observe(bottomScrollRef.current);
      if (tableRef.current) resizeObserver.observe(tableRef.current);
    }

    const timer = setTimeout(checkScroll, 120);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [data, columns, checkScroll]);

  const handleTopScroll = () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  const handleBottomScroll = () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  return (
    <div className="rounded-3xl border border-border bg-surface shadow-xl flex flex-col overflow-hidden">
      {/* Top Synchronized Horizontal Scrollbar */}
      {canScroll && (
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden custom-scrollbar-horizontal w-full bg-surface-alt/80 border-b border-border/70 transition-all z-10 select-none py-0.5"
          style={{ minHeight: '10px', maxHeight: '12px' }}
          title={tr('Scroll table horizontally')}
        >
          <div style={{ width: `${contentWidth}px`, height: '1px' }} />
        </div>
      )}

      {/* Main Table Container with Bottom Horizontal Scrollbar */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        className="overflow-x-auto custom-scrollbar-horizontal w-full"
      >
        <table ref={tableRef} className="min-w-full">
          <thead className="bg-surface-alt">
            <tr>
              {columns.map((col, colIdx) => (
                <th
                  key={col.accessor ? `${col.accessor}-${colIdx}` : colIdx}
                  className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.3em] text-muted whitespace-nowrap"
                >
                  {typeof col.header === 'string' ? tr(col.header) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const style = getRowStyle ? getRowStyle(row) : {};
              const customClassName = getRowClassName ? getRowClassName(row) : "";
              // Extract borderLeftColor and keep only background color on the row level if needed
              const { borderLeftColor, ...rowStyle } = style;

              const handleRowClick = (e) => {
                if (!onRowClick) return;
                // Ignore clicks on buttons, inputs, selects, links, dropdowns, or icons
                if (e.target.closest('button, a, input, select, textarea, .action-button, .icon-button-small, [role="button"], [data-no-row-click]')) {
                  return;
                }
                onRowClick(row);
              };

              return (
                <tr
                  key={row.id || row._id || idx}
                  onClick={handleRowClick}
                  className={`border-t border-border transition ${
                    onRowClick ? 'cursor-pointer hover:bg-surface-alt/90' : 'hover:bg-surface-alt/80'
                  } ${customClassName}`}
                  style={rowStyle}
                >
                  {columns.map((col, colIdx) => {
                    const raw = row[col.accessor];
                    const value = col.cell ? col.cell(row) : col.format ? col.format(raw) : raw;
                    const tdStyle = {};
                    if (colIdx === 0 && borderLeftColor) {
                      tdStyle.borderLeft = `4px solid ${borderLeftColor}`;
                      tdStyle.paddingLeft = '16px'; // adjust spacing for accent line
                    }
                    return (
                      <td key={col.accessor ? `${col.accessor}-${colIdx}` : colIdx} className="px-5 py-4 text-sm text-primary whitespace-nowrap" style={tdStyle}>
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReusableTable;

