import React from 'react';
import { FiEye, FiEdit2 } from 'react-icons/fi';
import ReusableTable from '../ReusableTable';
import { formatCurrency } from '../../utils/exportUtils';

const CustomerTable = ({ customers, onView, onEdit }) => {
  const columns = [
    { header: 'Customer ID', accessor: 'displayId' },
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => {
        const isSub = row.isSubscriber === true || (row.isSubscriber !== false && Number(row.insuranceAmount || 0) >= 20);
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-primary">{row.name}</span>
            {isSub && (
              <span className="text-amber-400 text-lg leading-none select-none drop-shadow" title="Subscriber">
                ⭐
              </span>
            )}
          </div>
        );
      }
    },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Email', accessor: 'email', format: (val) => val || 'N/A' },
    { header: 'Total Orders', accessor: 'totalOrders' },
    {
      header: 'Outstanding Balance',
      accessor: 'balance',
      format: (val) => formatCurrency(val),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusClass = row.status === 'Active'
          ? 'status-pill bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
          : 'status-pill bg-red-500/10 text-red-600 border-red-500/15';
        return <span className={statusClass}>{row.status || 'Active'}</span>;
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button type="button" className="icon-button-small" onClick={() => onView(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          <button type="button" className="icon-button-small" onClick={() => onEdit(row)} aria-label="Edit">
            <FiEdit2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return <ReusableTable columns={columns} data={customers} onRowClick={onView} />;
};

export default CustomerTable;
