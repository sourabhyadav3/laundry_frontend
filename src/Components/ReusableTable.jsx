// src/components/ReusableTable.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const ReusableTable = ({ columns, data, getRowStyle, getRowClassName, onRowClick, onReorder }) => {
  const { tr } = useLanguage();
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const isSyncingRef = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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
              {columns.map((col, colIdx) => {
                const headerText = typeof col.header === 'string' ? col.header : '';
                const isTotalCol = /total|amount|إجمالي|المجموع/i.test(headerText) || /total|amount/i.test(String(col.accessor || ''));
                return (
                  <th
                    key={col.accessor ? `${col.accessor}-${colIdx}` : colIdx}
                    className={`px-5 py-4 text-left text-xs uppercase tracking-[0.3em] whitespace-nowrap ${
                      isTotalCol ? 'font-extrabold text-primary text-[13px]' : 'font-semibold text-muted'
                    }`}
                    style={isTotalCol ? { fontWeight: 800 } : undefined}
                  >
                    {typeof col.header === 'string' ? tr(col.header) : col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const style = getRowStyle ? getRowStyle(row) : {};
              const customClassName = getRowClassName ? getRowClassName(row) : "";
              // Extract borderLeftColor and keep only background color on the row level if needed
              const { borderLeftColor, ...rowStyle } = style;

              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

              const handleDragStart = (e) => {
                if (!onReorder) return;
                setDraggedIndex(idx);
                e.dataTransfer.effectAllowed = 'move';
                try {
                  e.dataTransfer.setData('text/plain', String(idx));
                } catch (err) {}
              };

              const handleDragOver = (e) => {
                if (!onReorder || draggedIndex === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== idx) {
                  setDragOverIndex(idx);
                }
              };

              const handleDragLeave = (e) => {
                if (dragOverIndex === idx) {
                  setDragOverIndex(null);
                }
              };

              const handleDrop = (e) => {
                if (!onReorder || draggedIndex === null) return;
                e.preventDefault();
                const fromIdx = draggedIndex;
                const toIdx = idx;
                if (fromIdx !== toIdx) {
                  onReorder(fromIdx, toIdx);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              };

              const handleDragEnd = () => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              };

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
                  draggable={Boolean(onReorder)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onClick={handleRowClick}
                  className={`border-t border-border transition-all duration-150 ${
                    onReorder ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${isDragging ? 'opacity-40 bg-purple-500/10 scale-[0.99]' : ''} ${
                    isDragOver ? 'border-t-2 border-t-purple-600 bg-purple-500/15 shadow-md' : ''
                  } ${
                    onRowClick && !isDragging ? 'cursor-pointer hover:bg-surface-alt/90' : 'hover:bg-surface-alt/80'
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
                    const headerText = typeof col.header === 'string' ? col.header : '';
                    const isTotalCol = /total|amount|إجمالي|المجموع/i.test(headerText) || /total|amount/i.test(String(col.accessor || ''));
                    const finalTdStyle = isTotalCol ? { ...tdStyle, fontWeight: 800, fontSize: '15px' } : tdStyle;
                    return (
                      <td
                        key={col.accessor ? `${col.accessor}-${colIdx}` : colIdx}
                        className={`px-5 py-4 whitespace-nowrap ${isTotalCol ? 'font-extrabold text-[15px] text-primary font-mono' : 'text-sm text-primary'}`}
                        style={finalTdStyle}
                      >
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

