import React, { useContext, useState, useMemo } from 'react';
import { FiSearch, FiEye, FiChevronDown, FiDownload, FiPrinter, FiTrash2, FiEdit2, FiPlus } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import ReusableTable from '../../Components/ReusableTable';
import Modal from '../../Components/Modal';
import { toast } from 'react-toastify';
import { exportToCSV, formatCurrency, formatDate, generateInvoicePDF, cacheReceiptSnapshot } from '../../utils/exportUtils';
import { ORDER_STATUSES, paymentStatusStyles, getOrderStatusStyle, HOLD_STATUS } from '../../constants/statusStyles';
import { useLanguage } from '../../context/LanguageContext';

const statusOrder = ORDER_STATUSES;
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partial'];

const Invoices = () => {
  const { orders, catalog, updateOrderStatus, updateOrderPaymentStatus, editOrder, deleteOrder, selectedBranch, branches, addPayment } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  
  const getBranchName = (branchIdOrName) => {
    if (!branchIdOrName) return 'Main Branch';
    const b = branches?.find((branch) => String(branch.id) === String(branchIdOrName) || branch.name === branchIdOrName);
    return b ? b.name : branchIdOrName;
  };
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Edit Invoice State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrderData, setEditOrderData] = useState(null);

  
  const activeOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [orders, selectedOrder]);

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesBranch = !selectedBranch || selectedBranch === 'All' || !order.branchId || String(order.branchId) === String(selectedBranch) || String(order.branch) === String(selectedBranch);

        const matchesSearch =
          order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
        const matchesPayment = paymentFilter === 'All' || order.paymentStatus === paymentFilter;
        const isInvoice = order.number.includes('INV') || !order.number.includes('ORD');

        return matchesBranch && matchesSearch && matchesStatus && matchesPayment && isInvoice;
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
  }, [orders, searchTerm, statusFilter, paymentFilter, selectedBranch]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    let holdComment;
    if (newStatus === HOLD_STATUS) {
      holdComment = window.prompt('Hold comment / opinion:');
      if (holdComment === null) return;
      if (!holdComment.trim()) {
        toast.error('Please enter a hold comment / opinion');
        return;
      }
      holdComment = holdComment.trim();
    }
    updateOrderStatus(orderId, newStatus, holdComment);
    toast.success(`Invoice status updated to ${newStatus}`);
  };

  const { t, language } = useLanguage();

  // Settle Pay States
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleOrderTarget, setSettleOrderTarget] = useState(null);
  const [paymentMode, setPaymentMode] = useState('full'); // 'full' | 'partial'
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'card' | 'link' | 'wamt'
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [linkForm, setLinkForm] = useState({ email: '' });
  const [wamtForm, setWamtForm] = useState({ mobile: '' });

  const handlePaymentStatusSelect = (newVal) => {
    if (!activeOrder) return;
    if (newVal === 'Pending') {
      handleUpdatePaymentStatus(activeOrder.id, 'Pending');
    } else {
      const remaining = activeOrder.totalAmount - (activeOrder.amountPaid || 0);
      if (remaining <= 0) {
        toast.info('Invoice is already fully paid.');
        return;
      }
      setSettleOrderTarget(activeOrder);
      setPaymentMode(newVal === 'Paid' ? 'full' : 'partial');
      setAmountReceived(String(remaining.toFixed(3)));
      setPaymentStep('select');
      setShowSettleModal(true);
    }
  };

  const handleSettleAndPay = async (method) => {
    if (!settleOrderTarget) return;

    const remainingMax = settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0);
    const received = paymentMode === 'full' ? remainingMax : Number(amountReceived);
    if (isNaN(received) || received < 0 || received > remainingMax) {
      toast.error('Please enter a valid amount');
      return;
    }

    const payload = {
      orderId: settleOrderTarget.id || settleOrderTarget._id,
      orderNumber: settleOrderTarget.number,
      customerName: settleOrderTarget.customerName,
      amount: received,
      method: method,
      status: 'Paid'
    };

    const paymentRes = await addPayment(payload);
    if (paymentRes) {
      toast.success(`✅ Payment of ${formatCurrency(received)} recorded via ${method}`);
      setShowSettleModal(false);
      setPaymentStep('select');
      
      // Update selectedOrder details so the details modal refreshes immediately
      setSelectedOrder((prev) => {
        if (!prev || prev.id !== settleOrderTarget.id) return prev;
        const newPaid = (prev.amountPaid || 0) + received;
        const newStatus = newPaid >= prev.totalAmount ? 'Paid' : 'Partial';
        return { ...prev, amountPaid: newPaid, paymentStatus: newStatus };
      });
    }
  };

  const handleUpdatePaymentStatus = async (orderId, newPaymentStatus) => {
    let amountPaidVal = undefined;
    if (newPaymentStatus === 'Partial') {
      const promptVal = window.prompt('Enter amount paid (KWD):', '0.000');
      if (promptVal === null) return; // User cancelled
      const num = parseFloat(promptVal);
      if (isNaN(num) || num < 0) {
        toast.error('Invalid amount entered');
        return;
      }
      const orderObj = orders.find(o => o.id === orderId);
      if (orderObj && num > orderObj.totalAmount) {
        toast.error('Amount paid cannot exceed total order amount');
        return;
      }
      amountPaidVal = num;
    }

    await updateOrderPaymentStatus(orderId, newPaymentStatus, amountPaidVal);
    setSelectedOrder((prev) => {
      if (!prev || prev.id !== orderId) return prev;
      let nextAmountPaid = prev.amountPaid || 0;
      if (newPaymentStatus === 'Paid') nextAmountPaid = prev.totalAmount;
      else if (newPaymentStatus === 'Pending') nextAmountPaid = 0;
      else if (newPaymentStatus === 'Partial' && amountPaidVal !== undefined) nextAmountPaid = amountPaidVal;

      const updated = { ...prev, paymentStatus: newPaymentStatus, amountPaid: nextAmountPaid };
      cacheReceiptSnapshot(updated);
      return updated;
    });
  };

  const handleEditClick = (order) => {
    setEditOrderData(JSON.parse(JSON.stringify(order))); // deep copy
    setShowEditModal(true);
    setShowModal(false); // Close view modal if open
  };

  const handleEditItemChange = (index, field, value) => {
    const newItems = [...editOrderData.itemDetails];
    newItems[index][field] = value;
    setEditOrderData({ ...editOrderData, itemDetails: newItems });
  };

  const handleEditItemRemove = (index) => {
    const newItems = [...editOrderData.itemDetails];
    newItems.splice(index, 1);
    setEditOrderData({ ...editOrderData, itemDetails: newItems });
  };

  const handleEditItemAdd = () => {
    setEditOrderData({
      ...editOrderData,
      itemDetails: [...editOrderData.itemDetails, { name: '', quantity: 1, unitPrice: 0, modifiers: '' }]
    });
  };

  const handleSaveEdit = async () => {
    if (!editOrderData.itemDetails || editOrderData.itemDetails.length === 0) {
      toast.error('Invoice must have at least one item');
      return;
    }
    
    for (let item of editOrderData.itemDetails) {
      if (!item.name || item.name.trim() === '') {
        toast.error('All items must have a name');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return;
      }
      if (item.unitPrice < 0) {
        toast.error('Unit price cannot be negative');
        return;
      }
    }

    const payload = {
      itemDetails: editOrderData.itemDetails.map(item => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        modifiers: item.modifiers || ''
      })),
      notes: editOrderData.notes,
      serviceType: editOrderData.serviceType,
      discountAmount: Number(editOrderData.discountAmount || 0)
    };

    const res = await editOrder(editOrderData.id || editOrderData._id, payload);

    if (res) {
      setShowEditModal(false);
      setEditOrderData(null);
      if (selectedOrder && (selectedOrder.id === res.id || selectedOrder._id === res.id)) {
        setSelectedOrder(res);
      }
    }
  };

  const handlePrintInvoice = (order) => {
    generateInvoicePDF(order);
    toast.success('Invoice generated');
  };

  const handleDeleteOrder = (orderId) => {
    setInvoiceToDelete(orderId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteOrder(invoiceToDelete);
      setInvoiceToDelete(null);
      setShowDeleteModal(false);
    }
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
        backgroundColor: `${color}30`,
        borderLeftColor: color,
      };
    }
    return {};
  };

  const tableColumns = [
    {
      header: 'Invoice #',
      accessor: 'number',
      cell: (row) => {
        const isEdited = row.isEdited || row.editedAt || (row.timeline && Array.isArray(row.timeline) && row.timeline.some(t => /edit/i.test(t.comment || '')));
        return (
          <div className="flex items-center gap-1.5 font-bold font-mono">
            <span className="text-primary">{row.number}</span>
            {isEdited && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-red-500/15 text-red-600 border border-red-500/25" title="Edited Invoice">
                <span>✏️</span>
                <span>Edited</span>
              </span>
            )}
          </div>
        );
      }
    },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Branch', accessor: 'branchId', cell: (row) => getBranchName(row.branchId || row.branch) },
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
      header: 'Items',
      accessor: 'itemDetails',
      cell: (row) => {
        if (!row.itemDetails || row.itemDetails.length === 0) return 'N/A';
        return (
          <div className="flex flex-col gap-1.5 py-1 text-[11px] font-semibold text-primary">
            {row.itemDetails.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-secondary">{item.name}</span>
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[9px] font-bold font-mono">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <span className={`status-pill border ${getOrderStatusStyle(row.status)}`}>{row.status}</span>,
    },
    {
      header: 'Payment',
      accessor: 'paymentStatus',
      cell: (row) => <span className={`status-pill border ${paymentStatusStyles[row.paymentStatus] || paymentStatusStyles.Pending}`}>{row.paymentStatus}</span>,
    },
    { header: 'Amount', accessor: 'totalAmount', format: (val) => formatCurrency(val) },
    { header: 'Date', accessor: 'date', format: (val) => formatDate(val) },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewOrder(row)}
            className="icon-button-small text-blue-600"
            title="View Details"
          >
            <FiEye size={16} />
          </button>
          <button
            onClick={() => handleEditClick(row)}
            className="icon-button-small text-amber-500"
            title="Edit Invoice"
          >
            <FiEdit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteOrder(row.id)}
            className="icon-button-small text-rose-600"
            title="Delete Invoice"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="surface-card overflow-hidden border border-border shadow-xl rounded-2xl">
        <div className="dashboard-hero p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Invoice Management</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">All Invoices</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">Track and manage all customer invoices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
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
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>

        <div className="relative">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      {/* Export and Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-primary">Invoices List</h2>
          <p className="text-sm text-secondary">Total: {filteredOrders.length} invoices | Total Value: {formatCurrency(filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}</p>
        </div>
        <button
          onClick={() => exportToCSV(filteredOrders, 'invoices.csv')}
          className="action-button"
          title="Export to CSV"
        >
          <FiDownload size={16} />
          <span>Export</span>
        </button>
      </div>

      {/* Invoices Table */}
      <section className="surface-card border border-border rounded-2xl overflow-hidden">
        <ReusableTable columns={tableColumns} data={filteredOrders} getRowStyle={getRowStyle} onRowClick={handleViewOrder} />
      </section>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Invoice Details"
        size="2xl"
      >
        {activeOrder && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary">{activeOrder.number}</h2>
                <p className="mt-1 text-sm text-secondary">{formatDate(activeOrder.date)}</p>
              </div>
              <span className={`status-pill border px-4 py-2 ${getOrderStatusStyle(activeOrder.status)}`}>
                {activeOrder.status}
              </span>
            </div>

            {/* Customer Info */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Customer Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Name</p>
                  <p className="mt-1 font-semibold text-primary">{activeOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-1">Status</p>
                  <div className="relative">
                    <select
                      value={activeOrder.paymentStatus || 'Pending'}
                      onChange={(e) => handlePaymentStatusSelect(e.target.value)}
                      className={`w-full appearance-none rounded-xl border py-2 px-3 pr-9 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 ${paymentStatusStyles[activeOrder.paymentStatus] || paymentStatusStyles.Pending}`}
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary" />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Staff Name</p>
                  <p className="mt-1 font-semibold text-primary">{activeOrder.staffName || activeOrder.createdBy || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Invoice Items</h3>
              <div className="space-y-3">
                {activeOrder.itemDetails?.map((item, idx) => (
                  <div key={idx} className="flex justify-between rounded-lg bg-surface-alt p-3">
                    <span className="text-primary font-medium">{item.name}</span>
                    <span className="text-secondary">{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t border-border pt-6 bg-surface-alt p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal:</span>
                  <span className="font-semibold text-primary">{formatCurrency(activeOrder.amount)}</span>
                </div>
                {activeOrder.discount > 0 && (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(activeOrder.discount)}</span>
                  </div>
                )}
                {activeOrder.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Tax:</span>
                    <span className="font-semibold text-primary">{formatCurrency(activeOrder.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-primary font-semibold">Total:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(activeOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold text-xs mt-1 pt-1 border-t border-dashed border-border/60">
                  <span>Amount Paid:</span>
                  <span>
                    {formatCurrency(activeOrder.paymentStatus === 'Paid' ? activeOrder.totalAmount : (activeOrder.paymentStatus === 'Pending' ? 0 : (activeOrder.amountPaid || 0)))}
                  </span>
                </div>
                <div className="flex justify-between text-rose-500 font-bold text-xs mt-1">
                  <span>Remaining Balance:</span>
                  <span>
                    {formatCurrency(activeOrder.paymentStatus === 'Paid' ? 0 : (activeOrder.paymentStatus === 'Pending' ? activeOrder.totalAmount : (activeOrder.totalAmount - (activeOrder.amountPaid || 0))))}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Update Status</h3>
              <div className="relative inline-block w-full sm:w-64">
                <select
                  value={activeOrder.status}
                  onChange={(e) => handleUpdateStatus(activeOrder.id, e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 px-4 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-6 flex gap-3 flex-wrap">
              <button
                onClick={() => handlePrintInvoice(activeOrder)}
                className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/10 py-2 font-semibold text-blue-600 transition hover:bg-blue-500/20 flex items-center justify-center gap-2 min-w-[120px]"
              >
                <FiPrinter size={16} />
                Print Invoice
              </button>
              <button
                onClick={() => handleEditClick(activeOrder)}
                className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 font-semibold text-amber-600 transition hover:bg-amber-500/20 flex items-center justify-center gap-2 min-w-[120px]"
              >
                <FiEdit2 size={16} />
                Edit Invoice
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt min-w-[120px]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
        title="Delete Invoice"
        size="sm"
      >
        <div className="space-y-6 text-center">
          <p className="text-secondary text-sm">
            Are you sure you want to delete this invoice? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
              className="flex-1 rounded-xl border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="flex-1 rounded-xl bg-rose-600 py-2 font-semibold text-white transition hover:bg-rose-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditOrderData(null); }}
        title="Edit Invoice (Admin Only)"
        size="3xl"
      >
        {editOrderData && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-700 dark:text-amber-400">
              <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                <FiEdit2 /> Editing Invoice: {editOrderData.number}
              </p>
              <p className="text-xs">Modifying items will recalculate the invoice total. Payments and balances will be adjusted automatically.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Invoice Items</h3>
              
              <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="p-3 font-semibold text-secondary">Item Name</th>
                      <th className="p-3 font-semibold text-secondary w-24">Qty</th>
                      <th className="p-3 font-semibold text-secondary w-32">Unit Price</th>
                      <th className="p-3 font-semibold text-secondary w-32">Total</th>
                      <th className="p-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {editOrderData.itemDetails?.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-surface-alt/50 transition-colors">
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleEditItemChange(idx, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-border focus:border-blue-500 focus:outline-none py-1"
                            placeholder="Item Name"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleEditItemChange(idx, 'quantity', e.target.value)}
                            className="w-full bg-transparent border-b border-border focus:border-blue-500 focus:outline-none py-1"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.unitPrice}
                            onChange={(e) => handleEditItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full bg-transparent border-b border-border focus:border-blue-500 focus:outline-none py-1"
                          />
                        </td>
                        <td className="p-3 font-mono text-primary">
                          {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleEditItemRemove(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Remove Item"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button
                onClick={handleEditItemAdd}
                className="flex items-center gap-2 text-blue-600 font-semibold text-sm hover:text-blue-700 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                <FiPlus /> Add New Item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">Service Type</label>
                  <input
                    type="text"
                    value={editOrderData.serviceType}
                    onChange={(e) => setEditOrderData({...editOrderData, serviceType: e.target.value})}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">Discount Amount (KWD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={editOrderData.discountAmount || 0}
                    onChange={(e) => setEditOrderData({...editOrderData, discountAmount: e.target.value})}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              
              <div className="bg-surface-alt p-4 rounded-xl border border-border space-y-2">
                <h4 className="font-semibold text-primary mb-3">Live Recalculation</h4>
                {(() => {
                  const newAmount = editOrderData.itemDetails?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0) || 0;
                  const discount = Number(editOrderData.discountAmount || 0);
                  const subtotal = Math.max(0, newAmount - discount);
                  const originalTaxRate = editOrderData.amount > 0 ? (editOrderData.tax / editOrderData.amount) : 0;
                  const newTax = subtotal * originalTaxRate;
                  const newTotal = subtotal + newTax;
                  
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">Subtotal (Items):</span>
                        <span>{formatCurrency(newAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-rose-500">
                        <span>Discount:</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">Tax (auto-calculated):</span>
                        <span>{formatCurrency(newTax)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-border mt-2">
                        <span>New Total:</span>
                        <span className="text-emerald-500">{formatCurrency(newTotal)}</span>
                      </div>
                      <div className="text-xs text-secondary text-right mt-1">
                        Previous Total: {formatCurrency(editOrderData.totalAmount)}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                onClick={() => { setShowEditModal(false); setEditOrderData(null); }}
                className="flex-1 rounded-xl border border-border bg-surface py-2.5 font-semibold text-primary transition hover:bg-surface-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== SETTLE & PAY MODAL ===== */}
      {showSettleModal && settleOrderTarget && (
        <div className="fixed -inset-4 z-[2000] flex items-center justify-center p-4 sm:p-6" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.45)' }}>
          <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border bg-surface text-primary" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-extrabold tracking-tight">
                  {paymentStep === 'select' && `💳 ${t('counter.makeInvoice.settleAndPay')}`}
                  {paymentStep === 'card' && `💳 ${t('counter.makeInvoice.cardPayment')}`}
                  {paymentStep === 'link' && `🔗 ${t('counter.makeInvoice.linkPayment')}`}
                  {paymentStep === 'wamt' && `💰 ${t('counter.makeInvoice.creditPayment')}`}
                </h2>
                <button
                  onClick={() => { setShowSettleModal(false); setPaymentStep('select'); }}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none"
                >✕</button>
              </div>
              <p className="text-xs mb-5 text-secondary">
                Total Outstanding: <span className="font-mono font-bold text-emerald-500">{formatCurrency(settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0))}</span>
                {paymentStep !== 'select' && (
                  <button onClick={() => setPaymentStep('select')} className="ml-3 text-blue-500 hover:underline text-[11px]">← {t('counter.makeInvoice.back')}</button>
                )}
              </p>

              {/* ── STEP: SELECT ── */}
              {paymentStep === 'select' && (
                <div className="space-y-4">
                  {/* Payment Type Selector */}
                  <div className="bg-surface-alt/50 border border-border p-1 rounded-2xl flex gap-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('full');
                        setAmountReceived(String((settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0)).toFixed(3)));
                      }}
                      className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${paymentMode === 'full' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                    >
                      {language === 'ar' ? 'دفع كامل' : 'Full Payment'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('partial')}
                      className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${paymentMode === 'partial' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                    >
                      {language === 'ar' ? 'دفع جزئي' : 'Partial'}
                    </button>
                  </div>

                  {/* Amount Received Input */}
                  {paymentMode === 'partial' && (
                    <div className="bg-surface-alt/30 border border-border/80 rounded-2xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium text-secondary">
                        <span>{language === 'ar' ? 'المبلغ المستلم' : 'Amount Received'}:</span>
                        <span className="font-mono">{language === 'ar' ? 'د.ك' : 'KWD'}</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max={settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0)}
                          step="0.001"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          className="flex-1 text-sm rounded-xl border border-border bg-surface px-3 py-2 text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          placeholder="0.000"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.target.blur();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const activeEl = document.activeElement;
                            if (activeEl && activeEl.tagName === 'INPUT') {
                              activeEl.blur();
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
                        >
                          {language === 'ar' ? 'إدخال' : 'Enter'}
                        </button>
                      </div>
                      {(() => {
                        const received = Number(amountReceived) || 0;
                        const remaining = Math.max(0, (settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0)) - received);
                        return (
                          <div className="flex justify-between items-center text-xs font-bold text-rose-500 pt-1.5 border-t border-border/40">
                            <span>{language === 'ar' ? 'المتبقي في الحساب' : 'Balance Remaining'}:</span>
                            <span className="font-mono">{formatCurrency(remaining)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { method: t('counter.makeInvoice.paymentCash') || 'CASH', icon: '💵', bg: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,0.4)', payMethod: 'Cash' },
                      { method: t('counter.makeInvoice.paymentBukey') || 'BUKEY', icon: '🎟️', bg: 'linear-gradient(135deg,#3b82f6,#4f46e5)', shadow: 'rgba(59,130,246,0.4)', payMethod: 'Bukey' },
                      { method: t('counter.makeInvoice.paymentKnet') || 'K-NET', icon: '💳', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,0.4)', payMethod: 'K-Net' },
                      { method: t('counter.makeInvoice.paymentCredit') || 'CREDIT', icon: '💰', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', shadow: 'rgba(139,92,246,0.4)', payMethod: 'Credit' },
                    ].map(({ method, icon, bg, shadow, payMethod }) => (
                      <button
                        key={payMethod}
                        type="button"
                        onClick={() => handleSettleAndPay(payMethod)}
                        className="relative flex flex-col items-center justify-center p-4 rounded-2xl text-white transition-all hover:-translate-y-1 active:scale-95 group overflow-hidden"
                        style={{ background: bg, boxShadow: `0 8px 20px -5px ${shadow}` }}
                      >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{method}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CARD ── */}
              {paymentStep === 'card' && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl p-5 text-white overflow-hidden mb-4" style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', minHeight: '130px' }}>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold tracking-widest opacity-70">{t('counter.makeInvoice.creditDebit')}</span>
                      <span className="text-2xl">💳</span>
                    </div>
                    <p className="mt-3 text-lg font-mono tracking-[0.2em] font-bold">
                      {cardForm.number ? cardForm.number.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                    </p>
                    <div className="flex justify-between mt-3">
                      <p className="text-xs font-semibold tracking-wider">{cardForm.name || t('counter.makeInvoice.cardHolder')}</p>
                      <p className="text-xs font-semibold tracking-wider">{cardForm.expiry || 'MM/YY'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.nameOnCard')}</label>
                    <input className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="e.g. John Doe" value={cardForm.name} onChange={(e) => setCardForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.cardNumber')}</label>
                    <input className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="1234 5678 9012 3456" maxLength={19} value={cardForm.number} onChange={(e) => { const raw = e.target.value.replace(/\D/g, '').slice(0, 16); setCardForm(f => ({ ...f, number: raw })); }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.expiry')}</label>
                      <input className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="MM/YY" maxLength={5} value={cardForm.expiry} onChange={(e) => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2); setCardForm(f => ({ ...f, expiry: v })); }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('counter.makeInvoice.cvv')}</label>
                      <input type="password" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="•••" maxLength={4} value={cardForm.cvv} onChange={(e) => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!cardForm.name.trim()) { toast.error('Enter name on card'); return; }
                      if (cardForm.number.length < 16) { toast.error('Enter valid 16-digit card number'); return; }
                      if (cardForm.expiry.length < 5) { toast.error('Enter valid expiry MM/YY'); return; }
                      if (cardForm.cvv.length < 3) { toast.error('Enter valid CVV'); return; }
                      handleSettleAndPay('Card');
                    }}
                    className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', boxShadow: '0 6px 18px rgba(59,130,246,0.4)' }}
                  >
                    💳 Pay {formatCurrency(paymentMode === 'full' ? (settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0)) : (Number(amountReceived) || 0))}
                  </button>
                </div>
              )}

              {/* ── STEP: LINK ── */}
              {paymentStep === 'link' && (
                <div className="space-y-4 mt-2">
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <span className="text-4xl mb-2">🔗</span>
                    <p className="text-sm font-semibold text-primary">Pay with Link</p>
                    <p className="text-xs text-secondary text-center mt-1">Fast, secure, 1-click checkout by Stripe.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Link Account Email</label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      placeholder="e.g. user@example.com"
                      value={linkForm.email}
                      onChange={(e) => setLinkForm({ email: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!linkForm.email.includes('@')) { toast.error('Enter a valid email'); return; }
                      handleSettleAndPay('Link');
                    }}
                    className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.4)' }}
                  >
                    🔗 Pay {formatCurrency(paymentMode === 'full' ? (settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0)) : (Number(amountReceived) || 0))}
                  </button>
                </div>
              )}

              {/* ── STEP: CREDIT ── */}
              {paymentStep === 'wamt' && (
                <div className="space-y-4 mt-2">
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                    <span className="text-4xl mb-2">💰</span>
                    <p className="text-sm font-semibold text-primary">Credit Payment</p>
                    <p className="text-xs text-secondary text-center mt-1">Directly charge customer's mobile wallet.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Wallet Mobile Number</label>
                    <input
                      type="tel"
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                      placeholder="e.g. 965 xxxx xxxx"
                      value={wamtForm.mobile}
                      onChange={(e) => setWamtForm({ mobile: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (wamtForm.mobile.length < 5) { toast.error('Enter a valid mobile number'); return; }
                      handleSettleAndPay('Credit');
                    }}
                    className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', boxShadow: '0 6px 18px rgba(139,92,246,0.4)' }}
                  >
                    💰 Pay {formatCurrency(paymentMode === 'full' ? (settleOrderTarget.totalAmount - (settleOrderTarget.amountPaid || 0)) : (Number(amountReceived) || 0))}
                  </button>
                </div>
              )}

              <p className="text-center text-[10px] mt-4 text-slate-400">
                Secured payment • Invoice saved on completion
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
