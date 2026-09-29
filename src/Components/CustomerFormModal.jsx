import React, { useState, useEffect, useContext } from 'react';
import Modal from './Modal';
import { AdminStateContext } from '../context/AdminStateContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import { generateSubscriptionReceiptPDF } from '../utils/exportUtils';
import { CUSTOMER_AREAS } from '../constants/areas';

const CustomerFormModal = ({
  isOpen,
  onClose,
  isEditing = false,
  customerData = null,
  initialQuery = '',
  onSuccess,
}) => {
  const { customers = [], addCustomer, updateCustomer, selectedBranch, areas = CUSTOMER_AREAS } = useContext(AdminStateContext);
  const { tr } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getInitialFormData = () => {
    if (customerData) {
      return {
        customerLevel: '',
        customerNo: '',
        arabicName: '',
        customDiscountRate: '',
        partNo: '',
        areaName: '',
        jadda: '',
        street: '',
        levelNo: '',
        houseNo: '',
        flatNo: '',
        paciNo: '',
        addressNotes: '',
        automaticAddressNo: '0',
        date: new Date().toISOString().split('T')[0],
        insuranceAmount: '0.000',
        invoicesCount: '0',
        lastInvoiceDate: '',
        freeBalance: '0',
        freeTotal: '0',
        status: customerData.status || 'Active',
        inactiveReason: customerData.inactiveReason || '',
        ...customerData,
        isSubscriber: customerData.isSubscriber === true || (customerData.isSubscriber !== false && Number(customerData.insuranceAmount || 0) >= 20),
        englishName: customerData.englishName || customerData.name || '',
        phones: (() => {
          const p = customerData.phones || [];
          return [p[0] || customerData.phone || '', p[1] || '', p[2] || '', p[3] || ''];
        })(),
      };
    }

    const trimmed = String(initialQuery || '').trim();
    const isDigits = /^\d+$/.test(trimmed);

    return {
      name: '',
      phone: isDigits ? trimmed : '',
      email: '',
      address: '',
      totalOrders: 0,
      balance: 0,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      notes: '',
      customerLevel: '',
      customerNo: '',
      arabicName: '',
      englishName: isDigits ? '' : trimmed,
      customDiscountRate: '',
      phones: [isDigits ? trimmed : '', '', '', ''],
      partNo: '',
      areaName: '',
      jadda: '',
      street: '',
      levelNo: '',
      houseNo: '',
      flatNo: '',
      paciNo: '',
      addressNotes: '',
      automaticAddressNo: '0',
      date: new Date().toISOString().split('T')[0],
      insuranceAmount: '0.000',
      isSubscriber: false,
      invoicesCount: '0',
      lastInvoiceDate: '',
      freeBalance: '0',
      freeTotal: '0',
      inactiveReason: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
    }
  }, [isOpen, customerData, initialQuery]);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const next = { ...prev, [name]: val };
      if (name === 'insuranceAmount') {
        if (Number(val) >= 20) {
          next.isSubscriber = true;
        } else if (Number(val) === 0) {
          next.isSubscriber = false;
        }
      } else if (name === 'isSubscriber') {
        if (val) {
          if (!next.insuranceAmount || Number(next.insuranceAmount) === 0) {
            next.insuranceAmount = '20.000';
          }
        } else {
          next.isSubscriber = false;
          next.insuranceAmount = '0.000';
        }
      }
      return next;
    });

    if (name === 'lastInvoiceDate' && value) {
      const invoiceDate = new Date(value);
      const today = new Date();
      const diffTime = Math.abs(today - invoiceDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 30) {
        setFormData((prev) => ({
          ...prev,
          status: 'Inactive',
          inactiveReason: `Auto-inactivated: Inactive for ${diffDays} days (over 30 days without orders)`,
        }));
      }
    }
  };

  const handleSaveCustomer = async () => {
    if (formData.status === 'Inactive' && !String(formData.inactiveReason || '').trim()) {
      toast.error(tr('Please provide a reason for inactivating this customer account'));
      return;
    }

    const updatedName = formData.englishName || formData.name || formData.arabicName || 'Unnamed';
    const updatedPhone = formData.phones?.[0] || formData.phone || '';

    // Check for duplicate phone numbers
    const newNumbers = (formData.phones || [])
      .map((p) => p.trim())
      .filter((p) => p !== '');

    const currentBranchId = (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.branchId || storedUser.branch || null;

    if (newNumbers.length > 0) {
      const duplicateCustomer = customers.find((c) => {
        if (isEditing && String(c.id || c._id) === String(formData.id || formData._id)) {
          return false;
        }
        // Scope phone check to current branch
        const cBranch = String(c.branchId || c.branch || '');
        if (currentBranchId && cBranch && cBranch !== String(currentBranchId)) {
          return false;
        }
        const cPhone = (c.phone || '').trim();
        if (cPhone && newNumbers.includes(cPhone)) {
          return true;
        }
        const cPhones = (c.phones || []).map((p) => p.trim()).filter((p) => p !== '');
        if (cPhones.some((p) => newNumbers.includes(p))) {
          return true;
        }
        return false;
      });

      if (duplicateCustomer) {
        toast.error(`A customer with this phone number already exists in this branch: ${duplicateCustomer.name}`);
        return;
      }
    }

    // Construct address representation
    const addressParts = [
      formData.areaName ? `Area: ${formData.areaName}` : '',
      formData.partNo ? `Block: ${formData.partNo}` : '',
      formData.street ? `Street: ${formData.street}` : '',
      formData.jadda ? `Jadda: ${formData.jadda}` : '',
      formData.houseNo ? `House: ${formData.houseNo}` : '',
      formData.flatNo ? `Flat: ${formData.flatNo}` : '',
      formData.levelNo ? `Floor: ${formData.levelNo}` : '',
      formData.paciNo ? `PACI: ${formData.paciNo}` : '',
    ].filter(Boolean).join(', ');

    // Determine ID and Customer No
    let customerId = formData.id;
    let customerNo = formData.customerNo;

    if (!isEditing) {
      if (customerNo) {
        const exists = customers.some(
          (c) => String(c.id || c._id) === String(customerNo) || String(c.customerNo) === String(customerNo)
        );
        if (exists) {
          toast.error('Customer ID already exists. Please use a different ID.');
          return;
        }
        customerId = customerNo;
      } else {
        const maxId = customers.length ? Math.max(...customers.map((c) => Number(c.customerNo) || 0)) : 0;
        customerId = maxId + 1;
        customerNo = String(customerId);
      }
    } else {
      if (customerNo) {
        const originalCustomer = customers.find((c) => String(c.id || c._id) === String(formData.id || formData._id));
        const originalNo = originalCustomer ? String(originalCustomer.customerNo || '') : '';

        if (String(customerNo) !== originalNo) {
          const exists = customers.some(
            (c) =>
              String(c.id || c._id) !== String(formData.id || formData._id) &&
              (String(c.id || c._id) === String(customerNo) || String(c.customerNo) === String(customerNo))
          );
          if (exists) {
            toast.error('Customer ID already exists. Please use a different ID.');
            return;
          }
        }
        customerId = customerNo;
      }
    }

    const finalCustomer = {
      ...formData,
      id: customerId,
      customerNo: customerNo,
      name: updatedName,
      englishName: updatedName,
      phone: updatedPhone,
      address: addressParts || formData.address || 'N/A',
      branchId: (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.branchId || storedUser.branch || null,
      branch: (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.branchId || storedUser.branch || null,
    };

    if (finalCustomer.email && finalCustomer.email.trim()) {
      const duplicateEmail = customers.find((c) => {
        if (isEditing && String(c.id || c._id) === String(formData.id || formData._id)) return false;
        const cBranch = String(c.branchId || c.branch || '');
        if (currentBranchId && cBranch && cBranch !== String(currentBranchId)) {
          return false;
        }
        return c.email && c.email.trim().toLowerCase() === finalCustomer.email.trim().toLowerCase();
      });
      if (duplicateEmail) {
        toast.error(`A customer with this email already exists in this branch: ${duplicateEmail.name}`);
        return;
      }
    }

    if (!finalCustomer.phone) {
      toast.error('At least one Phone Number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      let savedResult = null;
      if (isEditing) {
        savedResult = await updateCustomer(formData.id || formData._id, finalCustomer);
      } else {
        savedResult = await addCustomer(finalCustomer);
      }

      if (Number(finalCustomer.insuranceAmount || 0) > 0 || finalCustomer.isSubscriber) {
        setTimeout(() => {
          try {
            generateSubscriptionReceiptPDF(finalCustomer, {
              amount: finalCustomer.insuranceAmount || 20,
              branchName: selectedBranch !== 'All' ? selectedBranch : undefined,
            });
          } catch (e) {
            console.error('Failed to generate subscription receipt:', e);
          }
        }, 300);
      }

      if (onSuccess) {
        onSuccess(savedResult || finalCustomer);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableAreas = areas && areas.length > 0 ? areas : CUSTOMER_AREAS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? tr('Edit Customer') : tr('Add New Customer')}
      size="2xl"
    >
      {formData && (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveCustomer(); }}>
          {/* Section 1: Customer Identity */}
          <div className="border-b border-border pb-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Customer Identity</h4>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Discount Value (%)</label>
                <input
                  type="number"
                  name="customDiscountRate"
                  value={formData.customDiscountRate || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      customDiscountRate: val,
                      customerLevel: val ? 'Custom Discount' : '',
                    }));
                  }}
                  placeholder="e.g. 25"
                  min="0"
                  max="100"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Customer ID</label>
                <input
                  type="text"
                  name="customerNo"
                  value={formData.customerNo || ''}
                  readOnly
                  placeholder="Auto-generated"
                  className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-secondary cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Arabic Name</label>
                <input
                  type="text"
                  name="arabicName"
                  value={formData.arabicName || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">English Name *</label>
                <input
                  type="text"
                  name="englishName"
                  value={formData.englishName || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Phone Numbers */}
          <div className="border-b border-border pb-4 bg-blue-500/5 rounded-2xl p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">Phone Numbers</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {formData.phones.map((phone, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-medium text-secondary">
                    {idx === 0 ? 'Phone No. *' : `Alternate No. ${idx}`}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const newPhones = [...formData.phones];
                      newPhones[idx] = e.target.value;
                      setFormData((prev) => ({ ...prev, phones: newPhones }));
                    }}
                    className="mt-1 w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                    required={idx === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Address Details */}
          <div className="border-b border-border pb-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Address & Location</h4>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Area Name</label>
                <select
                  name="areaName"
                  value={formData.areaName || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                >
                  <option value="">Select Area</option>
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Part No (Block)</label>
                <input
                  type="text"
                  name="partNo"
                  value={formData.partNo || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Street</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Jadda (Avenue)</label>
                <input
                  type="text"
                  name="jadda"
                  value={formData.jadda || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">House No</label>
                <input
                  type="text"
                  name="houseNo"
                  value={formData.houseNo || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Flat No (Apartment)</label>
                <input
                  type="text"
                  name="flatNo"
                  value={formData.flatNo || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Level No (Floor)</label>
                <input
                  type="text"
                  name="levelNo"
                  value={formData.levelNo || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Paci No.</label>
                <input
                  type="text"
                  name="paciNo"
                  value={formData.paciNo || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-secondary uppercase">Address Notes</label>
                <textarea
                  name="addressNotes"
                  value={formData.addressNotes || ''}
                  onChange={handleFormChange}
                  rows="2"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Billing & Financials */}
          <div className="border-b border-border pb-4 bg-slate-500/5 rounded-2xl p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Billing & Financial Details</h4>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Insurance Paid</label>
                <input
                  type="number"
                  name="insuranceAmount"
                  value={formData.insuranceAmount || '0.000'}
                  onChange={handleFormChange}
                  step="0.001"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="modalIsSubscriber"
                  name="isSubscriber"
                  checked={!!formData.isSubscriber}
                  onChange={handleFormChange}
                  className="w-4 h-4 text-amber-600 border-border rounded focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="modalIsSubscriber" className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase cursor-pointer select-none">
                  ⭐ Old Subscriber / مشترك
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Invoices Count</label>
                <input
                  type="number"
                  name="invoicesCount"
                  value={formData.invoicesCount || '0'}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-secondary cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Last Invoice Date</label>
                <input
                  type="date"
                  name="lastInvoiceDate"
                  value={formData.lastInvoiceDate || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Free Balance</label>
                <input
                  type="number"
                  name="freeBalance"
                  value={formData.freeBalance || '0'}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase">Free Total</label>
                <input
                  type="number"
                  name="freeTotal"
                  value={formData.freeTotal || '0'}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-secondary cursor-not-allowed text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-secondary uppercase">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-secondary uppercase">{tr('Status')}</label>
                <select
                  name="status"
                  value={formData.status || 'Active'}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm cursor-pointer"
                >
                  <option value="Active">Active / نشط</option>
                  <option value="Inactive">Inactive / غير نشط</option>
                </select>
              </div>

              {formData.status === 'Inactive' && (
                <div className="col-span-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                  <label className="block text-xs font-bold text-rose-500 uppercase flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{tr('Reason for Inactivation / سبب إيقاف الحساب')} *</span>
                  </label>
                  <input
                    type="text"
                    name="inactiveReason"
                    required
                    placeholder={tr('Enter reason e.g. Customer request, unpaid dues, moved out...')}
                    value={formData.inactiveReason || ''}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-rose-500/40 bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-secondary font-semibold">{tr('Quick presets:')}</span>
                    {[
                      'Customer requested cancellation / طلب العميل',
                      'Unpaid outstanding dues / عدم سداد مستحقات',
                      'Account suspended / إيقاف الحساب مؤقتاً',
                      'Address changed or moved / تغيير العنوان أو الانتقال',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, inactiveReason: preset }))}
                        className="px-2 py-1 text-[10px] font-medium rounded-md border border-rose-500/30 bg-surface text-secondary hover:text-rose-500 hover:border-rose-500 transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-secondary uppercase">General Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-solid-primary flex-1 rounded-lg py-2.5 font-semibold transition text-sm disabled:opacity-50"
            >
              {isSubmitting
                ? tr('Saving...') || 'Saving...'
                : isEditing
                ? tr('Save / Update')
                : tr('Save Customer')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-surface py-2.5 font-semibold text-primary transition hover:bg-surface-alt text-sm"
            >
              {tr('Cancel / Exit')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default CustomerFormModal;
