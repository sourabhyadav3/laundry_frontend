import React, { useContext, useMemo, useState } from 'react';
import { FiSearch, FiPlus, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import CustomerTable from '../../Components/counter/CustomerTable';
import Modal from '../../Components/Modal';
import PaymentSettleModal from '../../Components/PaymentSettleModal';
import { formatCurrency, formatDate, generateSubscriptionReceiptPDF, generateCustomerStatementPDF, getCustomerOrders } from '../../utils/exportUtils';

const Customers = () => {
  const { customers, orders = [], addCustomer, updateCustomer, settleCustomerBalance, selectedBranch, areas, branches = [] } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTargetCustomer, setSettleTargetCustomer] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const filteredCustomers = useMemo(
    () => {
      const sorted = [...customers].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        const numA = Number(a.id);
        const numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
      return sorted.filter(
        (c) => {
          const matchesBranch = !selectedBranch || selectedBranch === 'All' || String(c.branchId) === String(selectedBranch) || String(c.branch) === String(selectedBranch);
          const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm) ||
            String(c.displayId || c.id).includes(searchTerm);

          const status = c.status || 'Active';
          const isSub = c.isSubscriber === true || (c.isSubscriber !== false && Number(c.insuranceAmount || 0) >= 20);

          let matchesStatus = true;
          if (statusFilter === 'All') {
            matchesStatus = true;
          } else if (statusFilter === 'Subscribers') {
            matchesStatus = isSub;
          } else if (statusFilter === 'Non-Subscribers') {
            matchesStatus = !isSub;
          } else {
            matchesStatus = status === statusFilter;
          }

          return matchesBranch && matchesSearch && matchesStatus;
        }
      );
    },
    [customers, searchTerm, statusFilter, selectedBranch]
  );

  const openAdd = () => {
    setFormData({
      name: '',
      phone: '',
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
      englishName: '',
      customDiscountRate: '',
      phones: ['', '', '', ''],
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
    });
    setIsEditing(false);
    setShowFormModal(true);
  };

  const handleSave = () => {
    if (formData.status === 'Inactive' && !String(formData.inactiveReason || '').trim()) {
      toast.error('Please provide a reason for inactivating this customer account');
      return;
    }

    const updatedName = formData.englishName || formData.name || formData.arabicName || 'Unnamed';
    const updatedPhone = formData.phones[0] || formData.phone || '';

    // Check for duplicate phone numbers
    const newNumbers = (formData.phones || [])
      .map(p => p.trim())
      .filter(p => p !== '');

    if (newNumbers.length > 0) {
      const duplicateCustomer = customers.find(c => {
        if (isEditing && String(c.id) === String(formData.id)) {
          return false;
        }
        const cPhone = (c.phone || '').trim();
        if (cPhone && newNumbers.includes(cPhone)) {
          return true;
        }
        const cPhones = (c.phones || []).map(p => p.trim()).filter(p => p !== '');
        if (cPhones.some(p => newNumbers.includes(p))) {
          return true;
        }
        return false;
      });

      if (duplicateCustomer) {
        toast.error(`A customer with this phone number already exists: ${duplicateCustomer.name}`);
        return;
      }
    }
    
    // Construct address representation
    const addressParts = [
      formData.areaName ? `Area: ${formData.areaName}` : '',
      formData.street ? `Street: ${formData.street}` : '',
      formData.houseNo ? `House: ${formData.houseNo}` : '',
      formData.flatNo ? `Flat: ${formData.flatNo}` : '',
    ].filter(Boolean).join(', ');

    // Determine ID and Customer No
    let customerId = formData.id;
    let customerNo = formData.customerNo;

    if (!isEditing) {
      if (customerNo) {
        // Check if this ID already exists
        const exists = customers.some(c => String(c.id || c._id) === String(customerNo) || String(c.customerNo) === String(customerNo));
        if (exists) {
          toast.error('Customer ID already exists. Please use a different ID.');
          return;
        }
        customerId = customerNo;
      } else {
        // Auto-generate next numeric ID if left empty
        const maxId = customers.length ? Math.max(...customers.map(c => Number(c.customerNo) || 0)) : 0;
        customerId = maxId + 1;
        customerNo = String(customerId);
      }
    } else {
      if (customerNo) {
        // Find the original customer being edited
        const originalCustomer = customers.find(c => String(c.id || c._id) === String(formData.id));
        const originalNo = originalCustomer ? String(originalCustomer.customerNo || '') : '';
        
        if (String(customerNo) !== originalNo) {
          // Check if another customer already has this ID
          const exists = customers.some(c => String(c.id || c._id) !== String(formData.id) && (String(c.id || c._id) === String(customerNo) || String(c.customerNo) === String(customerNo)));
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
      phone: updatedPhone,
      address: addressParts || formData.address || 'N/A',
      branchId: (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.branchId || storedUser.branch || null,
      branch: (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.branchId || storedUser.branch || null
    };

    // Check for duplicate email
    if (finalCustomer.email && finalCustomer.email.trim()) {
      const duplicateEmail = customers.find(c => {
        if (isEditing && String(c.id) === String(formData.id)) return false;
        return c.email && c.email.trim().toLowerCase() === finalCustomer.email.trim().toLowerCase();
      });
      if (duplicateEmail) {
        toast.error(`A customer with this email already exists: ${duplicateEmail.name}`);
        return;
      }
    }

    if (!finalCustomer.phone) {
      toast.error('At least one Phone Number is required');
      return;
    }

    if (isEditing) {
      updateCustomer(finalCustomer.id, finalCustomer);
    } else {
      addCustomer(finalCustomer);
    }

    if (Number(finalCustomer.insuranceAmount || 0) > 0 || finalCustomer.isSubscriber) {
      setTimeout(() => {
        generateSubscriptionReceiptPDF(finalCustomer, {
          amount: finalCustomer.insuranceAmount || 20,
          branchName: selectedBranch !== 'All' ? selectedBranch : undefined,
        });
      }, 300);
    }

    setShowFormModal(false);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData(prev => {
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
      toast.info(`Please note: Subscription will end on ${value}`);
    }
    if (name === 'freeBalance' && (value === '0' || Number(value) <= 0)) {
      toast.warning('Free balance has ended. Please renew the subscription.');
    }
  };


  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Counter Staff</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">Customers</h1>
              <p className="mt-2 text-sm text-secondary">Search, add, view, and edit customer records.</p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="dashboard-hero-pill flex w-full items-center justify-center gap-2 md:w-auto hover:bg-blue-500/10"
            >
              <FiPlus size={18} />
              <span className="font-semibold">Add Customer</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search customer by name, phone, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Subscribers">⭐ Subscribers</option>
            <option value="Non-Subscribers">Non-Subscribers</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      <section className="surface-card border border-border overflow-hidden">
        <CustomerTable
          customers={filteredCustomers}
          onView={(c) => {
            setSelectedCustomer(c);
            setShowViewModal(true);
          }}
          onEdit={(c) => {
            setFormData({
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
              status: c.status || 'Active',
              inactiveReason: c.inactiveReason || '',
              ...c,
              isSubscriber: c.isSubscriber === true || (c.isSubscriber !== false && Number(c.insuranceAmount || 0) >= 20),
              englishName: c.englishName || c.name || '',
              phones: (() => {
                const p = c.phones || [];
                return [p[0] || c.phone || '', p[1] || '', p[2] || '', p[3] || ''];
              })(),
            });
            setIsEditing(true);
            setShowFormModal(true);
          }}
        />
      </section>

      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Customer Profile" size="2xl">
        {selectedCustomer && (() => {
          const customerOrders = getCustomerOrders(selectedCustomer, orders);

          const totalItemsIssued = customerOrders.reduce((sum, o) => {
            if (o.itemDetails && Array.isArray(o.itemDetails)) {
              return sum + o.itemDetails.reduce((itemSum, item) => itemSum + (Number(item.qty || item.quantity) || 1), 0);
            }
            return sum + (Number(o.itemCount) || 1);
          }, 0);

          const totalDue = customerOrders.reduce((sum, o) => {
            const total = Number(o.totalAmount || 0);
            const paid = Number(o.amountPaid || 0);
            return sum + Math.max(0, total - paid);
          }, 0);

          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const monthOrders = customerOrders.filter(o => new Date(o.createdAt || o.date) >= thirtyDaysAgo);
          const monthSpend = monthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
          const monthItems = monthOrders.reduce((sum, o) => {
            if (o.itemDetails && Array.isArray(o.itemDetails)) {
              return sum + o.itemDetails.reduce((itemSum, item) => itemSum + (Number(item.qty || item.quantity) || 1), 0);
            }
            return sum + (Number(o.itemCount) || 1);
          }, 0);

          const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          const sixMonthOrders = customerOrders.filter(o => new Date(o.createdAt || o.date) >= sixMonthsAgo);
          const sixMonthSpend = sixMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
          const sixMonthItems = sixMonthOrders.reduce((sum, o) => {
            if (o.itemDetails && Array.isArray(o.itemDetails)) {
              return sum + o.itemDetails.reduce((itemSum, item) => itemSum + (Number(item.qty || item.quantity) || 1), 0);
            }
            return sum + (Number(o.itemCount) || 1);
          }, 0);

          const lifetimeSpend = customerOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

          const customerStats = {
            totalItemsIssued,
            totalDue,
            monthSpend,
            monthItems,
            sixMonthSpend,
            sixMonthItems,
            lifetimeSpend
          };

          const renderField = (label, val, formatFn, key) => {
            if (val === undefined || val === null) return null;
            const sVal = String(val).trim();
            if (sVal === '' || sVal === 'N/A' || sVal === '0' || sVal === '0.000') return null;
            
            let display = sVal;
            if (formatFn) {
              display = formatFn(val);
            }
            return (
              <div key={key || label}>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">{label}</p>
                <p className="mt-1 font-semibold text-primary">{display}</p>
              </div>
            );
          };

          const hasAddress = selectedCustomer.areaName || selectedCustomer.street || selectedCustomer.partNo || selectedCustomer.jadda || selectedCustomer.levelNo || selectedCustomer.houseNo || selectedCustomer.flatNo || selectedCustomer.paciNo || selectedCustomer.addressNotes;
          const hasBilling = selectedCustomer.registrationDate || selectedCustomer.insuranceAmount || selectedCustomer.invoicesCount || selectedCustomer.lastInvoiceDate || selectedCustomer.freeBalance || selectedCustomer.freeTotal || selectedCustomer.email || selectedCustomer.notes;

          return (
            <div className="space-y-6">
              {/* Inactive Account Alert Banner */}
              {selectedCustomer.status === 'Inactive' && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 shadow-xs">
                  <span className="text-2xl select-none">🛑</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-rose-500">
                        Customer Account Inactive / حساب العميل موقوف
                      </h4>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 font-black">
                        BLOCKED
                      </span>
                    </div>
                    <p className="text-xs text-primary font-semibold mt-1">
                      <span className="text-secondary">Reason / سبب إيقاف الحساب: </span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        {selectedCustomer.inactiveReason || 'No reason specified'}
                      </span>
                    </p>
                    <p className="text-[10px] text-secondary mt-0.5">
                      Invoices and orders cannot be created for this customer until reactivated.
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Identity */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3 border-b border-border pb-1">
                  Customer Identity
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderField("Customer ID", selectedCustomer.displayId)}
                  {renderField("Customer No", selectedCustomer.customerNo)}
                  {renderField("English Name", selectedCustomer.englishName || selectedCustomer.name)}
                  {renderField("Arabic Name", selectedCustomer.arabicName)}
                  {selectedCustomer.customDiscountRate && Number(selectedCustomer.customDiscountRate) > 0 ? (
                    <div key="discount">
                      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Discount</p>
                      <p className="mt-1 font-semibold text-rose-500">
                        Custom Discount ({selectedCustomer.customDiscountRate}%)
                      </p>
                    </div>
                  ) : null}
                  {renderField("Status", selectedCustomer.status)}
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="bg-blue-500/5 rounded-2xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">Phone Numbers</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderField("Primary Phone No.", selectedCustomer.phone)}
                  {selectedCustomer.phones && selectedCustomer.phones.slice(1).map((phone, idx) => {
                    return renderField(`Alternate No. ${idx + 1}`, phone, null, `alt-phone-${idx}`);
                  })}
                </div>
              </div>

              {/* Address & Location */}
              {hasAddress ? (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3 border-b border-border pb-1">Address & Location</h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {renderField("Area Name", selectedCustomer.areaName)}
                    {renderField("Street", selectedCustomer.street)}
                    {renderField("Part No", selectedCustomer.partNo)}
                    {renderField("Jadda", selectedCustomer.jadda)}
                    {renderField("Level No", selectedCustomer.levelNo)}
                    {renderField("House No", selectedCustomer.houseNo)}
                    {renderField("Flat No", selectedCustomer.flatNo)}
                    {renderField("Paci No.", selectedCustomer.paciNo)}
                    {renderField("Address Notes", selectedCustomer.addressNotes)}
                  </div>
                </div>
              ) : null}

              {/* Billing & Financial Details */}
              {hasBilling ? (
                <div className="bg-slate-500/5 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Billing & Financial Details</h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {renderField("Registration Date", selectedCustomer.registrationDate, (val) => formatDate(val))}
                    {renderField("Subscriber Status", (selectedCustomer.isSubscriber || Number(selectedCustomer.insuranceAmount || 0) >= 20) ? "⭐ YES (Subscriber)" : "No")}
                    {renderField("Insurance Paid", selectedCustomer.insuranceAmount, (val) => formatCurrency(val))}
                    {renderField("Invoices Count", selectedCustomer.invoicesCount)}
                    {renderField("Last Invoice Date", selectedCustomer.lastInvoiceDate, (val) => formatDate(val))}
                    {renderField("Free Balance", selectedCustomer.freeBalance, (val) => formatCurrency(val))}
                    {renderField("Free Total", selectedCustomer.freeTotal, (val) => formatCurrency(val))}
                    {renderField("Email", selectedCustomer.email)}
                    {renderField("General Notes", selectedCustomer.notes)}
                  </div>
                </div>
              ) : null}

              {/* Account Analytics & Usage (1 Month, 6 Months, Items, Due) */}
              <div className="rounded-2xl border border-border bg-surface-alt/60 p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
                      Account Overview &amp; Analytics
                    </h4>
                    <p className="text-xs text-secondary mt-0.5">
                      Live usage, garments processed, and financial dues
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => generateCustomerStatementPDF(selectedCustomer, customerOrders, customerStats, { branchName: selectedBranch !== 'All' ? selectedBranch : undefined })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all border border-blue-500/20"
                    title="Print Account Statement"
                  >
                    <span>📄</span>
                    <span>Print Statement</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Total Items Issued */}
                  <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        Total Items Issued
                      </span>
                      <span className="text-sm select-none">📦</span>
                    </div>
                    <p className="mt-1.5 text-lg font-black text-primary">
                      {totalItemsIssued} <span className="text-xs font-semibold text-secondary">pcs</span>
                    </p>
                    <p className="text-[10px] text-secondary mt-0.5">
                      {customerOrders.length} total orders
                    </p>
                  </div>

                  {/* Total Due */}
                  <div className="rounded-xl border border-border bg-surface p-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                          Outstanding Due
                        </span>
                        <span className="text-sm select-none">💰</span>
                      </div>
                      <p className={`mt-1.5 text-lg font-black font-mono ${totalDue > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {formatCurrency(totalDue)}
                      </p>
                      <p className="text-[10px] text-secondary mt-0.5">
                        {totalDue > 0 ? 'Unpaid balance' : 'All settled'}
                      </p>
                    </div>
                    {totalDue > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettleTargetCustomer(selectedCustomer);
                          setShowSettleModal(true);
                        }}
                        className="mt-2 w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <span>💳</span>
                        <span>Pay Balance / تسديد</span>
                      </button>
                    )}
                  </div>

                  {/* 1 Month (30d) Spend */}
                  <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        1 Month (30 Days)
                      </span>
                      <span className="text-sm select-none">📅</span>
                    </div>
                    <p className="mt-1.5 text-lg font-black font-mono text-primary">
                      {formatCurrency(monthSpend)}
                    </p>
                    <p className="text-[10px] text-secondary mt-0.5">
                      {monthItems} items processed
                    </p>
                  </div>

                  {/* 6 Months Spend */}
                  <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        6 Months Usage
                      </span>
                      <span className="text-sm select-none">📊</span>
                    </div>
                    <p className="mt-1.5 text-lg font-black font-mono text-primary">
                      {formatCurrency(sixMonthSpend)}
                    </p>
                    <p className="text-[10px] text-secondary mt-0.5">
                      {sixMonthItems} items processed
                    </p>
                  </div>
                </div>
              </div>

              {/* Order History / Activity Table */}
              {customerOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3 border-b border-border pb-1">
                    Recent Orders &amp; Invoices ({customerOrders.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
                    <table className="min-w-full divide-y divide-border text-xs">
                      <thead className="bg-surface-alt font-semibold text-secondary">
                        <tr>
                          <th className="px-3 py-2 text-left">Order #</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-center">Items</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-right">Due</th>
                          <th className="px-3 py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-surface">
                        {customerOrders.slice(0, 10).map((ord) => {
                          const itemsCount = (ord.itemDetails && Array.isArray(ord.itemDetails))
                            ? ord.itemDetails.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0)
                            : (ord.itemCount || 1);
                          const total = Number(ord.totalAmount || 0);
                          const paid = Number(ord.amountPaid || 0);
                          const due = Math.max(0, total - paid);
                          return (
                            <tr key={ord.id || ord._id} className="hover:bg-surface-alt/50">
                              <td className="px-3 py-2 font-mono font-bold text-primary">{ord.number || ord.id}</td>
                              <td className="px-3 py-2 text-secondary">{formatDate(ord.createdAt || ord.date)}</td>
                              <td className="px-3 py-2 text-center font-semibold">{itemsCount}</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(total)}</td>
                              <td className={`px-3 py-2 text-right font-mono font-bold ${due > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                {due > 0 ? formatCurrency(due) : '0.000'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="status-pill text-[10px] py-0.5 px-2">
                                  {ord.status || 'Active'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Phone Numbers */}
              <div className="bg-blue-500/5 rounded-2xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">Phone Numbers</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderField("Primary Phone No.", selectedCustomer.phone)}
                  {selectedCustomer.phones && selectedCustomer.phones.slice(1).map((phone, idx) => {
                    return renderField(`Alternate No. ${idx + 1}`, phone, null, `alt-phone-${idx}`);
                  })}
                </div>
              </div>

              {/* Address & Location */}
              {hasAddress ? (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3 border-b border-border pb-1">Address &amp; Location</h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {renderField("Area Name", selectedCustomer.areaName)}
                    {renderField("Street", selectedCustomer.street)}
                    {renderField("Part No", selectedCustomer.partNo)}
                    {renderField("Jadda", selectedCustomer.jadda)}
                    {renderField("Level No", selectedCustomer.levelNo)}
                    {renderField("House No", selectedCustomer.houseNo)}
                    {renderField("Flat No", selectedCustomer.flatNo)}
                    {renderField("Paci No.", selectedCustomer.paciNo)}
                    {renderField("Address Notes", selectedCustomer.addressNotes)}
                  </div>
                </div>
              ) : null}

              {/* Billing & Financial Details */}
              {hasBilling ? (
                <div className="bg-slate-500/5 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Billing &amp; Financial Details</h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {renderField("Registration Date", selectedCustomer.registrationDate, (val) => formatDate(val))}
                    {renderField("Subscriber Status", (selectedCustomer.isSubscriber || Number(selectedCustomer.insuranceAmount || 0) >= 20) ? "⭐ YES (Subscriber)" : "No")}
                    {renderField("Insurance Paid", selectedCustomer.insuranceAmount, (val) => formatCurrency(val))}
                    {renderField("Invoices Count", selectedCustomer.invoicesCount)}
                    {renderField("Last Invoice Date", selectedCustomer.lastInvoiceDate, (val) => formatDate(val))}
                    {renderField("Free Balance", selectedCustomer.freeBalance, (val) => formatCurrency(val))}
                    {renderField("Free Total", selectedCustomer.freeTotal, (val) => formatCurrency(val))}
                    {renderField("Email", selectedCustomer.email)}
                    {renderField("General Notes", selectedCustomer.notes)}
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="border-t border-border pt-6 flex flex-wrap gap-3">
                {totalDue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettleTargetCustomer(selectedCustomer);
                      setShowSettleModal(true);
                    }}
                    className="flex-1 min-w-[180px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    title="Pay Outstanding Balance"
                  >
                    <span className="text-base select-none">💳</span>
                    <span>Pay Outstanding Balance</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => generateCustomerStatementPDF(selectedCustomer, customerOrders, customerStats, { branchName: selectedBranch !== 'All' ? selectedBranch : undefined })}
                  className="flex-1 min-w-[180px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 shadow-md transition flex items-center justify-center gap-2"
                  title="Print Customer Statement"
                >
                  <span>📄</span>
                  <span>Print Account Statement</span>
                </button>
                {(selectedCustomer.isSubscriber === true || (selectedCustomer.isSubscriber !== false && Number(selectedCustomer.insuranceAmount || 0) >= 20)) && (
                  <button
                    type="button"
                    onClick={() => {
                      generateSubscriptionReceiptPDF(selectedCustomer, {
                        amount: selectedCustomer.insuranceAmount || 20,
                        branchName: selectedBranch !== 'All' ? selectedBranch : undefined,
                      });
                    }}
                    className="flex-1 min-w-[180px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 shadow-md transition flex items-center justify-center gap-2"
                    title="Print Subscription Receipt"
                  >
                    <span className="text-base select-none">⭐</span>
                    <span>Print Subscription Receipt</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setFormData({
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
                      status: selectedCustomer.status || 'Active',
                      inactiveReason: selectedCustomer.inactiveReason || '',
                      ...selectedCustomer,
                      isSubscriber: selectedCustomer.isSubscriber === true || (selectedCustomer.isSubscriber !== false && Number(selectedCustomer.insuranceAmount || 0) >= 20),
                      englishName: selectedCustomer.englishName || selectedCustomer.name || '',
                      phones: (() => {
                        const p = selectedCustomer.phones || [];
                        return [p[0] || selectedCustomer.phone || '', p[1] || '', p[2] || '', p[3] || ''];
                      })(),
                    });
                    setIsEditing(true);
                    setShowFormModal(true);
                  }}
                  className="btn-solid-primary flex-1 min-w-[120px] rounded-xl py-2.5 font-semibold transition"
                >
                  Edit Customer
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 min-w-[100px] rounded-xl border border-border bg-surface py-2.5 font-semibold text-primary transition hover:bg-surface-alt"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={isEditing ? 'Edit Customer' : 'Add Customer'}
      >
        {formData && (
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                        setFormData(prev => ({
                          ...prev,
                          customDiscountRate: val,
                          customerLevel: val ? 'Custom Discount' : ''
                        }));
                      }}
                      placeholder="e.g. 25"
                      min="0"
                      max="100"
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase">Customer No</label>
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
                          setFormData(prev => ({ ...prev, phones: newPhones }));
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
                      {areas.map((area) => (
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

              {/* Section 4: Billing & Financial Details */}
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
                      id="isSubscriber"
                      name="isSubscriber"
                      checked={!!formData.isSubscriber}
                      onChange={handleFormChange}
                      className="w-4 h-4 text-amber-600 border-border rounded focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="isSubscriber" className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase cursor-pointer select-none">
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
                    <label className="block text-xs font-semibold text-secondary uppercase">Status</label>
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
                        <span>Reason for Inactivation / سبب إيقاف الحساب *</span>
                      </label>
                      <input
                        type="text"
                        name="inactiveReason"
                        required
                        placeholder="Enter reason e.g. Customer request, unpaid dues, moved out..."
                        value={formData.inactiveReason || ''}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-rose-500/40 bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-secondary font-semibold">Quick presets:</span>
                        {[
                          'Customer requested cancellation / طلب العميل',
                          'Unpaid outstanding dues / عدم سداد مستحقات',
                          'Account suspended / إيقاف الحساب مؤقتاً',
                          'Address changed or moved / تغيير العنوان أو الانتقال'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, inactiveReason: preset }))}
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
                  type="button"
                  onClick={handleSave}
                  className="btn-solid-primary flex-1 rounded-lg py-2.5 font-semibold transition text-sm"
                >
                  {isEditing ? 'Save / Update' : 'Save Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 rounded-lg border border-border bg-surface py-2.5 font-semibold text-primary transition hover:bg-surface-alt text-sm"
                >
                  Cancel / Exit
                </button>
              </div>
            </form>
        )}
      </Modal>

      {/* Settle Outstanding Balance Modal */}
      <PaymentSettleModal
        isOpen={showSettleModal}
        onClose={() => {
          setShowSettleModal(false);
          setSettleTargetCustomer(null);
        }}
        customer={settleTargetCustomer}
        customerOrders={getCustomerOrders(settleTargetCustomer, orders)}
        selectedBranch={selectedBranch}
        branches={branches}
        onSettleSuccess={async (custId, payload) => {
          const res = await settleCustomerBalance(custId, payload);
          if (res && res.customer) {
            setSelectedCustomer(res.customer);
          }
          return res;
        }}
      />
    </div>
  );
};

export default Customers;
