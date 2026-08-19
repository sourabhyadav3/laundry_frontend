import React from 'react';
import ReusableTable from '../ReusableTable';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { paymentStatusStyles } from '../../constants/statusStyles';

const PaymentTable = ({ payments, onView }) => {
  const columns = [
    { header: 'Payment ID', accessor: 'paymentId' },
    { header: 'Order Number', accessor: 'orderNumber' },
    { header: 'Customer', accessor: 'customerName' },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => {
        const showDetails = row.orderTotal && row.orderTotal > row.amount;
        const due = showDetails ? Math.max(0, row.orderTotal - (row.orderAmountPaid || 0)) : 0;
        return (
          <div className="flex flex-col">
            <span className="font-mono">{formatCurrency(row.amount)}</span>
            {showDetails && (
              <div className="flex flex-col mt-0.5">
                <span className="text-[10px] text-secondary font-medium">Total: {formatCurrency(row.orderTotal)}</span>
                {due > 0 && (
                  <span className="text-[10px] text-rose-500 font-bold">Due: {formatCurrency(due)}</span>
                )}
              </div>
            )}
          </div>
        );
      }
    },
    { header: 'Payment Method', accessor: 'method' },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const displayStatus = row.orderPaymentStatus || row.status || 'Paid';
        const statusClass = paymentStatusStyles[displayStatus] || paymentStatusStyles.Pending;
        return <span className={statusClass}>{displayStatus}</span>;
      },
    },
    {
      header: 'Date',
      accessor: 'date',
      format: (val) => formatDate(val),
    },
  ];

  return <ReusableTable columns={columns} data={payments} onRowClick={onView} />;
};

export default PaymentTable;
