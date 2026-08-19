import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { formatDate } from '../../utils/exportUtils';
import { pickupStatusStyles, deliveryStatusStyles } from '../../constants/statusStyles';
import { useLanguage } from '../../context/LanguageContext';

const PICKUP_STATUSES = ['Assigned', 'In Progress', 'Picked Up', 'Completed'];
const DELIVERY_STATUSES = ['Assigned', 'Out For Delivery', 'Delivered', 'Failed'];

const DeliveryDetailsModal = ({ isOpen, onClose, job, type, onUpdateStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState(job?.status || '');
  const { language } = useLanguage();

  useEffect(() => {
    if (job?.status) setSelectedStatus(job.status);
  }, [job]);

  if (!job) return null;

  const statuses = type === 'pickup' ? PICKUP_STATUSES : DELIVERY_STATUSES;
  const statusStyles = type === 'pickup' ? pickupStatusStyles : deliveryStatusStyles;

  const handleUpdate = () => {
    onUpdateStatus(job.id, selectedStatus);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={type === 'pickup' ? 'Pickup Details' : 'Delivery Details'} size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-primary">Customer Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Name</p>
              <p className="mt-1 font-semibold text-primary">{job.customer}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Phone</p>
              <p className="mt-1 font-semibold text-primary">{job.contactNumber}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {language === 'ar' ? 'العنوان' : 'Address'}
              </p>
              {type === 'delivery' ? (
                language === 'ar' ? (
                  <div className="mt-1 text-sm text-right font-semibold text-primary space-y-0.5 animate-fadeIn" dir="rtl">
                    <div><strong>المنطقة:</strong> {job.areaName || 'Salmiya'}</div>
                    <div><strong>قطعة:</strong> {job.partNo || '12'}</div>
                    <div><strong>الشارع:</strong> {job.street || '5'}</div>
                    <div><strong>الجادة:</strong> {job.jadda || '2'}</div>
                    <div><strong>المنزل:</strong> {job.houseNo || '14'}</div>
                    <div><strong>الطابق:</strong> {job.levelNo || '3'}</div>
                    <div><strong>الشقة:</strong> {job.flatNo || '12'}</div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-left font-semibold text-primary space-y-0.5 animate-fadeIn" dir="ltr">
                    <div><strong>Area:</strong> {job.areaName || 'Salmiya'}</div>
                    <div><strong>Block:</strong> {job.partNo || '12'}</div>
                    <div><strong>S:</strong> {job.street || '5'}</div>
                    <div><strong>Jadah:</strong> {job.jadda || '2'}</div>
                    <div><strong>House:</strong> {job.houseNo || '14'}</div>
                    <div><strong>F:</strong> {job.levelNo || '3'}</div>
                    <div><strong>Flat:</strong> {job.flatNo || '12'}</div>
                  </div>
                )
              ) : (
                <p className="mt-1 font-semibold text-primary">{job.address}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="mb-4 text-lg font-semibold text-primary">
            {type === 'pickup' ? 'Pickup Information' : 'Order Information'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {type === 'pickup' ? 'Pickup ID' : 'Order Number'}
              </p>
              <p className="mt-1 font-semibold text-primary">
                {type === 'pickup' ? (job.pickupId || 'N/A') : (job.orderNumber || 'N/A')}
              </p>
            </div>
            {type === 'delivery' && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Service Type</p>
                <p className="mt-1 font-semibold text-primary">{job.serviceType || 'N/A'}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {type === 'pickup' ? 'Pickup Date' : 'Delivery Date'}
              </p>
              <p className="mt-1 font-semibold text-primary">
                {formatDate(type === 'pickup' ? job.pickupDate : job.deliveryDate)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Current Status</p>
              <p className="mt-1">
                <span className={statusStyles[job.status] || statusStyles.Assigned}>{job.status}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <label className="block text-sm font-medium text-primary">Update Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleUpdate}
            className="mt-4 w-full rounded-xl border border-blue-500/30 bg-blue-500/10 py-2 font-semibold text-blue-600 transition hover:bg-blue-500/20"
          >
            Update Status
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeliveryDetailsModal;
