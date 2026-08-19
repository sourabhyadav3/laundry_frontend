import React, { useContext, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiChevronDown, FiBell } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import ReusableTable from '../../Components/ReusableTable';
import { toast } from 'react-toastify';
import ExportMenu from '../../Components/ExportMenu';
import { exportPaymentsCSV, exportPaymentsPDF, formatCurrency, formatDate } from '../../utils/exportUtils';

const paymentMethods = ['Cash', 'Card', 'Link', 'Credit', 'Wamd'];
const paymentStatuses = ['Paid', 'Partial', 'Pending'];

const paymentStatusColors = {
  Paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  Partial: 'bg-sky-500/10 text-sky-600 border-sky-500/15',
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/15',
};

const Payments = () => {
  const { payments, customers, settleCustomerBalance, updatePayment, addPayment, orders } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPaymentData, setEditPaymentData] = useState(null);

  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('Cash');

  // States for Record Payment modal
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordPaymentForm, setRecordPaymentForm] = useState({
    orderId: '',
    amount: '',
    method: 'Cash',
    status: 'Paid'
  });

  const handleEditPayment = (payment) => {
    setEditPaymentData({ ...payment });
    setShowEditModal(true);
  };

  // Calculate summary stats
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter((p) => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const outstandingAmount = customers.reduce((sum, c) => sum + c.balance, 0);
  const dueCustomers = customers.filter((c) => c.balance > 0).length;

  const filteredPayments = useMemo(() => {
    return payments
      .filter((payment) => {
        const matchesSearch =
          (payment.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (payment.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || payment.status === statusFilter;
        const matchesMethod = methodFilter === 'All' || payment.method === methodFilter;

        return matchesSearch && matchesStatus && matchesMethod;
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        const numA = Number(a.id);
        const numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }, [payments, searchTerm, statusFilter, methodFilter]);

  const duePayments = customers.filter((c) => c.balance > 0);

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleRecordPayment = () => {
    const pendingOrders = orders.filter(o => o.paymentStatus !== 'Paid');
    setRecordPaymentForm({
      orderId: pendingOrders.length > 0 ? pendingOrders[0].id : '',
      amount: '',
      method: 'Cash',
      status: 'Paid'
    });
    setShowRecordPaymentModal(true);
  };

  const handleConfirmRecordPayment = async (e) => {
    e.preventDefault();
    const { orderId, amount, method, status } = recordPaymentForm;
    if (!orderId) {
      toast.error('Please select an order');
      return;
    }
    const orderObj = orders.find(o => String(o.id) === String(orderId) || String(o._id) === String(orderId));
    if (!orderObj) {
      toast.error('Selected order not found');
      return;
    }
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    const payload = {
      orderId: orderObj.id || orderObj._id,
      orderNumber: orderObj.number,
      customerName: orderObj.customerName,
      amount: amountVal,
      method: method,
      status: status
    };

    const res = await addPayment(payload);
    if (res) {
      toast.success(`Payment of ${formatCurrency(amountVal)} recorded successfully for Order ${orderObj.number}`);
      setShowRecordPaymentModal(false);
    }
  };

  const paymentSummaryLines = [
    `Total Revenue: ${formatCurrency(totalRevenue)}`,
    `Payments Received: ${formatCurrency(paidAmount)}`,
    `Outstanding Amount: ${formatCurrency(outstandingAmount)}`,
    `Due Customers: ${dueCustomers}`,
    `Filtered Records: ${filteredPayments.length}`,
  ];

  const handleExportCSV = () => {
    if (!filteredPayments.length) {
      toast.warning('No payment records to export');
      return;
    }
    const ok = exportPaymentsCSV(
      filteredPayments,
      `payments-report-${new Date().toISOString().slice(0, 10)}`
    );
    if (ok) toast.success('Payments exported as CSV');
  };

  const handleExportPDF = () => {
    if (!filteredPayments.length) {
      toast.warning('No payment records to export');
      return;
    }
    const ok = exportPaymentsPDF(
      filteredPayments,
      paymentSummaryLines,
      `payments-report-${new Date().toISOString().slice(0, 10)}`
    );
    if (ok) toast.success('Payments exported as PDF');
  };


  const handleMarkPaid = (customer) => {
    setSelectedCustomer(customer);
    setSelectedMethod('Cash');
    setShowMarkPaidModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedCustomer) return;

    const paidAmountValue = selectedCustomer.balance;
    if (paidAmountValue <= 0) {
      toast.warning('Customer has no outstanding balance');
      return;
    }

    const success = await settleCustomerBalance(selectedCustomer.id, selectedMethod);
    if (success) {
      toast.success(`Payment of ${formatCurrency(paidAmountValue)} via ${selectedMethod} recorded successfully for ${selectedCustomer.name}`);
      setShowMarkPaidModal(false);
    }
  };

  const tableColumns = [
    { header: 'Payment ID', accessor: 'paymentId' },
    { header: 'Order #', accessor: 'orderNumber' },
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
    { header: 'Method', accessor: 'method' },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const displayStatus = row.status || 'Paid';
        const statusClass = `status-pill ${paymentStatusColors[displayStatus] || paymentStatusColors.Pending}`;
        return <span className={statusClass}>{displayStatus}</span>;
      },
    },
    { header: 'Date', accessor: 'date', format: (val) => formatDate(val) },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button className="icon-button-small" onClick={() => handleViewPayment(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          <button className="icon-button-small" onClick={() => handleEditPayment(row)} aria-label="Edit">
            <FiEdit2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="surface-card rounded-3xl border border-border shadow-xl">
        <div className="dashboard-hero rounded-3xl p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Financial Management</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">Payments</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">Track and manage all payment transactions.</p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <button
                onClick={handleRecordPayment}
                className="dashboard-hero-pill flex items-center justify-center gap-2"
              >
                <FiPlus size={18} />
                <span className="font-semibold">Record Payment</span>
              </button>
              <ExportMenu
                label="Export Report"
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
                disabled={!filteredPayments.length}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard accent="blue" label="Total Revenue" value={formatCurrency(totalRevenue)} change="+8%" changePositive />
        <StatsCard accent="emerald" label="Payments Received" value={formatCurrency(paidAmount)} change="+12%" changePositive />
        <StatsCard accent="amber" label="Outstanding Amount" value={formatCurrency(outstandingAmount)} change="-5%" changePositive={false} />
        <StatsCard accent="rose" label="Due Customers" value={dueCustomers} change="+2" changePositive={false} />
      </div>

      {/* Search and Filter Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by order or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Status</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>

        <div className="relative">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Methods</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      {/* Payments Table */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">Payment Records</h2>
            <p className="text-sm text-secondary">Total: {filteredPayments.length} transactions</p>
          </div>
        </div>

        <div className="mt-5">
          <ReusableTable columns={tableColumns} data={filteredPayments} onRowClick={handleViewPayment} />
        </div>
      </section>

      {/* Due Payments Section */}
      {duePayments.length > 0 && (
        <section className="surface-card rounded-3xl border border-border p-6 shadow-xl">
          <div className="flex items-center justify-between gap-4 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <FiBell className="text-amber-600" />
                <h2 className="text-xl font-semibold text-primary">Outstanding Payments</h2>
              </div>
              <p className="mt-2 text-sm text-secondary">{duePayments.length} customers with due balances</p>
            </div>
          </div>

          <div className="space-y-3">
            {duePayments.map((customer) => (
              <div key={customer.id} className="rounded-3xl border border-border bg-surface p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
                  <div className="flex-1">
                    <p className="font-semibold text-primary">{customer.name}</p>
                    <p className="text-sm text-secondary">Outstanding: {formatCurrency(customer.balance)}</p>
                  </div>
                  <div className="flex flex-row justify-between sm:justify-end items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <p className="text-sm text-secondary font-mono">{customer.phone}</p>
                    <button
                      onClick={() => handleMarkPaid(customer)}
                      className="rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 shadow-sm"
                    >
                      Mark Paid
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment Details Modal */}
      {showModal && selectedPayment && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">Payment Details</h2>
              <button onClick={() => setShowModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Payment ID</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedPayment.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Order Number</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedPayment.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Customer</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedPayment.customer}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Amount</p>
                <p className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Payment Method</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedPayment.method}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Date</p>
                <p className="mt-2 text-lg font-semibold text-primary">{formatDate(selectedPayment.date)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Status</p>
                <p className={`status-pill mt-2 inline-block ${paymentStatusColors[selectedPayment.status]}`}>{selectedPayment.status}</p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => {
                  handleEditPayment(selectedPayment);
                  setShowModal(false);
                }}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Edit Payment
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-3xl border border-blue-500/50 bg-blue-500/10 py-3 font-semibold text-blue-600 transition hover:bg-blue-500/15 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Payment Modal */}
      {showEditModal && editPaymentData && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (Number(editPaymentData.amount) <= 0) {
                toast.error('Amount must be greater than 0');
                return;
              }
              const success = await updatePayment(editPaymentData.id, {
                method: editPaymentData.method,
                status: editPaymentData.status,
                amount: Number(editPaymentData.amount),
                date: editPaymentData.date
              });
              if (success) {
                toast.success(`Payment ID ${editPaymentData.id} updated successfully`);
                setShowEditModal(false);
              }
            }}
            className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border p-5 sm:p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">Edit Payment #{editPaymentData.id}</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Customer</label>
                <input
                  type="text"
                  disabled
                  value={editPaymentData.customer}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface-alt py-3 px-4 text-secondary disabled:opacity-75 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Order Number</label>
                <input
                  type="text"
                  disabled
                  value={editPaymentData.orderNumber}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface-alt py-3 px-4 text-secondary disabled:opacity-75 focus:opacity-75 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Amount (KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={editPaymentData.amount}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Payment Method</label>
                  <select
                    value={editPaymentData.method}
                    onChange={(e) => setEditPaymentData({ ...editPaymentData, method: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Payment Status</label>
                  <select
                    value={editPaymentData.status}
                    onChange={(e) => setEditPaymentData({ ...editPaymentData, status: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Date</label>
                <input
                  type="date"
                  required
                  value={editPaymentData.date ? editPaymentData.date.substring(0, 10) : ''}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, date: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Mark As Paid Selection Modal */}
      {showMarkPaidModal && selectedCustomer && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border p-5 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">💳 Settle & Pay</h2>
              <button type="button" onClick={() => setShowMarkPaidModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Customer</p>
                <p className="mt-1 text-lg font-semibold text-primary">{selectedCustomer.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Outstanding Balance</p>
                <p className="mt-1 text-2xl font-bold text-amber-500">{formatCurrency(selectedCustomer.balance)}</p>
              </div>
              
              <div className="border-t border-border pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-3">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { method: 'Cash', icon: '💵', bg: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,0.4)', payMethod: 'Cash' },
                    { method: 'Card', icon: '💳', bg: 'linear-gradient(135deg,#3b82f6,#4f46e5)', shadow: 'rgba(59,130,246,0.4)', payMethod: 'Card' },
                    { method: 'Link', icon: '🔗', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,0.4)', payMethod: 'Link' },
                    { method: 'Credit', icon: '💰', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', shadow: 'rgba(139,92,246,0.4)', payMethod: 'Credit' },
                  ].map(({ method, icon, bg, shadow, payMethod }) => {
                    const isActive = selectedMethod === payMethod;
                    return (
                      <button
                        key={payMethod}
                        type="button"
                        onClick={() => setSelectedMethod(payMethod)}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl text-white transition-all hover:-translate-y-1 active:scale-95 group overflow-hidden border-2 ${
                          isActive ? 'border-white scale-102 ring-4 ring-blue-500/30' : 'border-transparent opacity-85 hover:opacity-100'
                        }`}
                        style={{ background: bg, boxShadow: `0 8px 20px -5px ${shadow}` }}
                      >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{icon}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setShowMarkPaidModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="flex-1 rounded-3xl text-white bg-emerald-600 hover:bg-emerald-700 py-3 font-semibold transition shadow-md text-sm"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form 
            onSubmit={handleConfirmRecordPayment}
            className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border p-5 sm:p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary font-outfit">Record Payment</h2>
              <button type="button" onClick={() => setShowRecordPaymentModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Select Unpaid Order / Invoice</label>
                <div className="relative">
                  <select
                    required
                    value={recordPaymentForm.orderId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const orderObj = orders.find(o => String(o.id) === String(selectedId) || String(o._id) === String(selectedId));
                      const due = orderObj ? (orderObj.totalAmount - (orderObj.amountPaid || 0)) : 0;
                      setRecordPaymentForm({
                        ...recordPaymentForm,
                        orderId: selectedId,
                        amount: due > 0 ? due.toFixed(3) : ''
                      });
                    }}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    <option value="">-- Choose Order --</option>
                    {orders
                      .filter(o => o.paymentStatus !== 'Paid')
                      .map((o) => (
                        <option key={o.id || o._id} value={o.id || o._id}>
                          {o.number} ({o.customerName}) - Due: {formatCurrency(o.totalAmount - (o.amountPaid || 0))}
                        </option>
                      ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
                </div>
                {orders.filter(o => o.paymentStatus !== 'Paid').length === 0 && (
                  <p className="mt-2 text-xs text-rose-500 font-semibold">No unpaid invoices exist in the system.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Amount (KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="0.000"
                  value={recordPaymentForm.amount}
                  onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, amount: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Payment Method</label>
                  <select
                    value={recordPaymentForm.method}
                    onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, method: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Payment Status</label>
                  <select
                    value={recordPaymentForm.status}
                    onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, status: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={orders.filter(o => o.paymentStatus !== 'Paid').length === 0}
                className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Payment
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Payments;
