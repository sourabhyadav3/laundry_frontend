import React, { useContext } from 'react';
import { FiEye, FiRefreshCw } from 'react-icons/fi';
import ReusableTable from '../ReusableTable';
import { formatDate } from '../../utils/exportUtils';
import { pickupStatusStyles } from '../../constants/statusStyles';
import { useLanguage } from '../../context/LanguageContext';
import { AdminStateContext } from '../../context/AdminStateContext';

const PickupTable = ({ pickups, onView, onUpdateStatus }) => {
  const { language } = useLanguage();
  const { customers } = useContext(AdminStateContext);

  const columns = [
    { header: 'Pickup ID', accessor: 'pickupId' },
    { header: 'Customer Name', accessor: 'customer' },
    {
      header: language === 'ar' ? 'العنوان' : 'Address',
      accessor: 'address',
      cell: (row) => {
        const cust = customers.find((c) => c.name === row.customer);
        if (language === 'ar') {
          return (
            <div className="text-xs space-y-0.5 text-right font-medium" dir="rtl">
              <div><strong>المنطقة:</strong> {cust?.areaName || row.areaName || 'Salmiya'}</div>
              <div><strong>قطعة:</strong> {cust?.partNo || row.partNo || '12'}</div>
              <div><strong>الشارع:</strong> {cust?.street || row.street || '5'}</div>
              <div><strong>الجادة:</strong> {cust?.jadda || row.jadda || '2'}</div>
              <div><strong>المنزل:</strong> {cust?.houseNo || row.houseNo || '14'}</div>
              <div><strong>الطابق:</strong> {cust?.levelNo || row.levelNo || '3'}</div>
              <div><strong>الشقة:</strong> {cust?.flatNo || row.flatNo || '12'}</div>
            </div>
          );
        }
        return (
          <div className="text-xs space-y-0.5 text-left font-medium" dir="ltr">
            <div><strong>Area:</strong> {cust?.areaName || row.areaName || 'Salmiya'}</div>
            <div><strong>Block:</strong> {cust?.partNo || row.partNo || '12'}</div>
            <div><strong>S:</strong> {cust?.street || row.street || '5'}</div>
            <div><strong>Jadah:</strong> {cust?.jadda || row.jadda || '2'}</div>
            <div><strong>House:</strong> {cust?.houseNo || row.houseNo || '14'}</div>
            <div><strong>F:</strong> {cust?.levelNo || row.levelNo || '3'}</div>
            <div><strong>Flat:</strong> {cust?.flatNo || row.flatNo || '12'}</div>
          </div>
        );
      }
    },
    { header: 'Contact Number', accessor: 'contactNumber' },
    {
      header: 'Pickup Date',
      accessor: 'pickupDate',
      format: (val) => formatDate(val),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={pickupStatusStyles[row.status] || pickupStatusStyles.Assigned}>{row.status}</span>
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

  return <ReusableTable columns={columns} data={pickups} onRowClick={onView} />;
};

export default PickupTable;
