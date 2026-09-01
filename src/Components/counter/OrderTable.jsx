import React, { useContext } from 'react';
import { FiEye, FiRefreshCw } from 'react-icons/fi';
import ReusableTable from '../ReusableTable';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { getOrderStatusStyle, paymentStatusStyles } from '../../constants/statusStyles';
import { AdminStateContext } from '../../context/AdminStateContext';

const OrderTable = ({ orders, onView, onUpdateStatus, selectedOrderIds, setSelectedOrderIds }) => {
  const { catalog, branches } = useContext(AdminStateContext);

  const getBranchName = (branchIdOrName) => {
    if (!branchIdOrName) return 'Main Branch';
    const b = branches?.find((branch) => String(branch.id) === String(branchIdOrName) || branch.name === branchIdOrName);
    return b ? b.name : branchIdOrName;
  };

  const getRowStyle = (row) => {
    const isEdited = row.isEdited || row.editedAt || (row.timeline && Array.isArray(row.timeline) && row.timeline.some(t => /edit/i.test(t.comment || '')));
    if (isEdited) {
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderLeftColor: '#ef4444',
      };
    }
    if (!row.itemDetails || row.itemDetails.length === 0) return {};
    const firstItem = row.itemDetails[0];
    const catalogItem = catalog?.find(
      (g) => g.name.toLowerCase() === firstItem.name.toLowerCase()
    );
    if (catalogItem && catalogItem.color) {
      const color = catalogItem.color;
      return {
        backgroundColor: `${color}30`, // darker/more visible background opacity
        borderLeftColor: color,
      };
    }
    return {};
  };
  const columns = [
    ...(setSelectedOrderIds ? [{
      header: (
        <input
          type="checkbox"
          checked={orders.length > 0 && selectedOrderIds.length === orders.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedOrderIds(orders.map(o => o.id || o._id));
            } else {
              setSelectedOrderIds([]);
            }
          }}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-border bg-surface-alt cursor-pointer"
        />
      ),
      accessor: 'checkbox',
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedOrderIds.includes(row.id || row._id)}
          onChange={(e) => {
            const id = row.id || row._id;
            if (e.target.checked) {
              setSelectedOrderIds(prev => [...prev, id]);
            } else {
              setSelectedOrderIds(prev => prev.filter(item => item !== id));
            }
          }}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-border bg-surface-alt cursor-pointer"
        />
      )
    }] : []),
    {
      header: 'Order Number',
      accessor: 'number',
      cell: (row) => {
        const isEdited = row.isEdited || row.editedAt || (row.timeline && Array.isArray(row.timeline) && row.timeline.some(t => /edit/i.test(t.comment || '')));
        return (
          <div className="flex items-center gap-1.5 font-bold font-mono">
            <span className="text-primary">{row.number}</span>
            {isEdited && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-red-500/15 text-red-600 border border-red-500/25" title="Edited Order">
                <span>✏️</span>
                <span>Edited</span>
              </span>
            )}
          </div>
        );
      }
    },
    { header: 'Customer', accessor: 'customerName' },
    {
      header: 'Branch',
      accessor: 'branchId',
      cell: (row) => {
        const originBranchName = getBranchName(row.branchId || row.branch);
        const hasTransferred = row.transferredTo || row.transferredBranchName;
        const targetBranchName = row.transferredBranchName || getBranchName(row.transferredTo);
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-primary">{originBranchName}</span>
            {hasTransferred && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full mt-0.5 border border-blue-500/20 w-fit" title={`Transferred to ${targetBranchName}`}>
                <span>↳ ➔</span>
                <span>{targetBranchName}</span>
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Service',
      accessor: 'serviceType',
      cell: (row) => {
        const serviceName = row.serviceType || row.service;
        if (!serviceName) return <span className="text-secondary">—</span>;
        const isExpress = /express|urgent|مستعجل/i.test(String(serviceName));
        if (isExpress) {
          return (
            <span className="inline-flex items-center gap-1 bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-md text-xs shadow-sm whitespace-nowrap">
              <span>⚡</span>
              <span>{serviceName}</span>
            </span>
          );
        }
        return <span className="font-medium text-primary whitespace-nowrap">{serviceName}</span>;
      }
    },
    {
      header: 'Delivery Type',
      accessor: 'deliveryType',
      cell: (row) => {
        const isHome = row.deliveryType === 'Home Delivery' || row.isHomeDelivery;
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${isHome ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'}`}>
            {isHome ? 'Home Delivery' : 'Branch Pickup'}
          </span>
        );
      }
    },
    {
      header: 'Amount',
      accessor: 'totalAmount',
      format: (val) => formatCurrency(val),
    },
    {
      header: 'Payment Status',
      accessor: 'paymentStatus',
      cell: (row) => (
        <span className={paymentStatusStyles[row.paymentStatus] || paymentStatusStyles.Pending}>
          {row.paymentStatus}
        </span>
      ),
    },
    {
      header: 'Order Status',
      accessor: 'status',
      cell: (row) => (
        <span className={getOrderStatusStyle(row.status)}>{row.status}</span>
      ),
    },
    {
      header: 'Delivery Date',
      accessor: 'deliveryDate',
      format: (val) => formatDate(val),
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button type="button" className="icon-button-small" onClick={() => onView(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          <button
            type="button"
            className="icon-button-small"
            onClick={() => onUpdateStatus(row)}
            aria-label="Update status"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>
      ),
    },
  ];

  return <ReusableTable columns={columns} data={orders} getRowStyle={getRowStyle} onRowClick={onView} />;
};

export default OrderTable;
