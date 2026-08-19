// src/components/ReusableTable.jsx
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const ReusableTable = ({ columns, data, getRowStyle, getRowClassName, onRowClick }) => {
  const { tr } = useLanguage();
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-xl custom-scrollbar-horizontal">
      <table className="min-w-full">
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
  );
};

export default ReusableTable;
