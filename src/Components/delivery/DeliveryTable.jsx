import React from 'react';
import { FiEye, FiRefreshCw } from 'react-icons/fi';
import ReusableTable from '../ReusableTable';
import { formatDate } from '../../utils/exportUtils';
import { deliveryStatusStyles } from '../../constants/statusStyles';
import { useLanguage } from '../../context/LanguageContext';

const DeliveryTable = ({ deliveries, onView, onUpdateStatus }) => {
  const { language } = useLanguage();

  const columns = [
    { header: 'Delivery ID', accessor: 'deliveryId' },
    {
      header: 'Invoice No.',
      accessor: 'orderNumber',
      cell: (row) => row.orderNumber || 'N/A'
    },
    { header: 'Customer Name', accessor: 'customer' },
    {
      header: language === 'ar' ? 'العنوان' : 'Address',
      accessor: 'address',
      cell: (row) => {
        if (language === 'ar') {
          return (
            <div className="text-xs space-y-0.5 text-right font-medium" dir="rtl">
              <div><strong>المنطقة:</strong> {row.areaName || 'Salmiya'}</div>
              <div><strong>قطعة:</strong> {row.partNo || '12'}</div>
              <div><strong>الشارع:</strong> {row.street || '5'}</div>
              <div><strong>الجادة:</strong> {row.jadda || '2'}</div>
              <div><strong>المنزل:</strong> {row.houseNo || '14'}</div>
              <div><strong>الطابق:</strong> {row.levelNo || '3'}</div>
              <div><strong>الشقة:</strong> {row.flatNo || '12'}</div>
            </div>
          );
        }
        return (
          <div className="text-xs space-y-0.5 text-left font-medium" dir="ltr">
            <div><strong>Area:</strong> {row.areaName || 'Salmiya'}</div>
            <div><strong>Block:</strong> {row.partNo || '12'}</div>
            <div><strong>S:</strong> {row.street || '5'}</div>
            <div><strong>Jadah:</strong> {row.jadda || '2'}</div>
            <div><strong>House:</strong> {row.houseNo || '14'}</div>
            <div><strong>F:</strong> {row.levelNo || '3'}</div>
            <div><strong>Flat:</strong> {row.flatNo || '12'}</div>
          </div>
        );
      }
    },
    { header: 'Contact Number', accessor: 'contactNumber' },
    {
      header: language === 'ar' ? 'التسليم المتوقع' : 'Expected Delivery',
      accessor: 'deliveryDate',
      cell: (row) => {
        const dateFormatted = formatDate(row.deliveryDate || row.expectedDeliveryDate);
        const timeVal = row.expectedDeliveryTime || row.deliveryTime;
        return (
          <div className="text-xs font-semibold text-primary">
            <div>{dateFormatted || 'N/A'}</div>
            {timeVal && <div className="text-[10px] text-emerald-600 font-medium">{timeVal}</div>}
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={deliveryStatusStyles[row.status] || deliveryStatusStyles.Assigned}>{row.status}</span>
      ),
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

  return <ReusableTable columns={columns} data={deliveries} onRowClick={onView} />;
};

export default DeliveryTable;
