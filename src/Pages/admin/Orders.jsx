import React, { useContext, useState, useMemo } from 'react';
import { FiSearch, FiEye, FiChevronDown, FiDownload, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import ReusableTable from '../../Components/ReusableTable';
import Modal from '../../Components/Modal';
import { toast } from 'react-toastify';
import { exportToCSV, formatCurrency, formatDate, generateInvoicePDF, getNextBranchOrderNo } from '../../utils/exportUtils';
import { ORDER_STATUSES, paymentStatusStyles, getOrderStatusStyle, HOLD_STATUS } from '../../constants/statusStyles';
import OrderTimeline from '../../Components/counter/OrderTimeline';

const statusOrder = ORDER_STATUSES;

const emptyOrderForm = {
  customerId: '',
  serviceType: '',
  items: '',
  quantity: 1,
  unitPrice: 0,
  expectedDeliveryDate: '',
  paymentStatus: 'Pending',
  notes: '',
};

const Orders = () => {
  const { orders, customers, services, addOrder, setCustomers, catalog, updateOrderStatus, deleteOrder, selectedBranch, branches, liveUpdateFilter } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  const getBranchName = (branchIdOrName) => {
    if (!branchIdOrName) return 'Main Branch';
    const b = branches?.find((branch) => String(branch.id) === String(branchIdOrName) || branch.name === branchIdOrName);
    return b ? b.name : branchIdOrName;
  };
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const activeOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [orders, selectedOrder]);

  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesBranch = (() => {
          if (!selectedBranch || selectedBranch === 'All') return true;
          const selStr = String(selectedBranch).toLowerCase();
          if (order.branchId && String(order.branchId).toLowerCase() === selStr) return true;
          if (order.branch && String(order.branch).toLowerCase() === selStr) return true;
          if (order.transferredTo && String(order.transferredTo).toLowerCase() === selStr) return true;
          if (order.transferredBranchName && String(order.transferredBranchName).toLowerCase() === selStr) return true;
          if (Array.isArray(order.sharedBranches) && order.sharedBranches.some(b => String(b).toLowerCase() === selStr)) return true;

          const activeBranchObj = branches?.find(b => String(b.id || b._id).toLowerCase() === selStr || String(b.name || '').toLowerCase() === selStr);
          if (activeBranchObj) {
            const bId = String(activeBranchObj.id || activeBranchObj._id).toLowerCase();
            const bName = String(activeBranchObj.name || '').toLowerCase();
            const bNameAr = String(activeBranchObj.nameAr || activeBranchObj.arabicName || '').toLowerCase();
            if (order.branchId && String(order.branchId).toLowerCase() === bId) return true;
            if (order.transferredTo && String(order.transferredTo).toLowerCase() === bId) return true;
            if (order.transferredBranchName && String(order.transferredBranchName).toLowerCase() === bName) return true;
            if (Array.isArray(order.sharedBranches) && order.sharedBranches.some(b => String(b).toLowerCase() === bId)) return true;

            // Section Branch item checking
            const isCarpetBranch = bName.includes('carpet') || bName.includes('rug') || bNameAr.includes('سجاد');
            const isShoeBranch = bName.includes('shoe') || bName.includes('footwear') || bNameAr.includes('أحذية') || bNameAr.includes('حذاء') || bNameAr.includes('جوتي');
            const isWorkshopBranch = bName.includes('workshop') || bNameAr.includes('ورشة');

            if (isCarpetBranch && Array.isArray(order.itemDetails)) {
              if (order.itemDetails.some(it => /carpet|سجاد|rug/i.test(it.name || '') || /carpet|سجاد|rug/i.test(it.nameAr || ''))) return true;
            }
            if (isShoeBranch && Array.isArray(order.itemDetails)) {
              if (order.itemDetails.some(it => /shoe|sneaker|boot|footwear|أحذية|حذاء|جوتي|شوز/i.test(it.name || '') || /أحذية|حذاء|جوتي|شوز|shoe/i.test(it.nameAr || ''))) return true;
            }
            if (isWorkshopBranch && (order.status === 'Preparing in workshop' || order.status === 'In Workshop' || (Array.isArray(order.itemDetails) && order.itemDetails.some(it => /carpet|curtain|blanket|heavy|سجاد|ستائر|بطانية|لحاف/i.test(it.name || ''))))) {
              return true;
            }
          }
          return false;
        })();

        const matchesSearch =
          order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
        const matchesPayment = paymentFilter === 'All' || order.paymentStatus === paymentFilter;

        const matchesLiveUpdate = liveUpdateFilter !== 'Express' ||
          order.serviceType === 'Urgent' || order.serviceType === 'Express' ||
          order.service === 'Urgent' || order.service === 'Express';

        return matchesBranch && matchesSearch && matchesStatus && matchesPayment && matchesLiveUpdate;
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
  }, [orders, searchTerm, statusFilter, paymentFilter, selectedBranch, liveUpdateFilter]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };


  const handleOrderFormChange = (e) => {
    const { name, value } = e.target;
    setOrderForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'serviceType') {
        const svc = services.find((s) => s.name === value);
        if (svc) updated.unitPrice = svc.price;
      }
      return updated;
    });
  };

  const computeTotal = () => {
    const qty = Number(orderForm.quantity) || 0;
    const price = Number(orderForm.unitPrice) || 0;
    const amount = qty * price;
    const tax = amount * 0.1;
    return { amount, tax, totalAmount: Math.round((amount + tax) * 100) / 100 };
  };

  const handleSaveOrder = () => {
    const customer = customers.find((c) => String(c.id) === String(orderForm.customerId));
    if (!customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!orderForm.items.trim() || !orderForm.expectedDeliveryDate) {
      toast.error('Items and delivery date are required');
      return;
    }

    const qty = Number(orderForm.quantity) || 1;
    const unitPrice = Number(orderForm.unitPrice) || 0;
    const { amount, tax, totalAmount } = computeTotal();

    const branchId = (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.assignedBranch || null;
    const orderNo = getNextBranchOrderNo(orders, branchId, 'ORD');

    addOrder({
      number: orderNo,
      customerId: customer.id,
      customerName: customer.name,
      serviceType: orderForm.serviceType,
      status: 'Waiting',
      paymentStatus: orderForm.paymentStatus,
      amount,
      tax,
      totalAmount,
      date: new Date().toISOString().split('T')[0],
      pickupDate: new Date().toISOString().split('T')[0],
      deliveryDate: orderForm.expectedDeliveryDate,
      itemDetails: [{ name: orderForm.items, quantity: qty, unitPrice }],
      notes: orderForm.notes,
      createdBy: storedUser.name || 'Admin',
      branchId: branchId,
    });

    setCustomers(
      customers.map((c) =>
        c.id === customer.id ? { ...c, totalOrders: (c.totalOrders || 0) + 1 } : c
      )
    );

    toast.success('Order created successfully');
    setShowFormModal(false);
    setOrderForm(emptyOrderForm);
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
    toast.success(`Order status updated to ${newStatus}`);
  };

  const handlePrintInvoice = (order) => {
    generateInvoicePDF(order);
    toast.success('Invoice generated');
  };

  const handleDeleteOrder = (orderId) => {
    setOrderToDelete(orderId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
      setOrderToDelete(null);
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
        backgroundColor: `${color}30`, // darker/more visible background opacity
        borderLeftColor: color,
      };
    }
    return {};
  };

  const tableColumns = [
    {
      header: 'Order #',
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
          <div className="flex flex-wrap gap-1">
            {row.itemDetails.map((item, idx) => {
              const catalogItem = catalog?.find(
                (g) => g.name.toLowerCase() === item.name.toLowerCase()
              );
              const color = catalogItem?.color || '#3b82f6';
              return (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 shadow-sm"
                  style={{
                    backgroundColor: `${color}15`,
                    borderColor: `${color}45`,
                    color: color,
                  }}
                >
                  {catalogItem?.image ? (
                    <img src={catalogItem.image} alt={item.name} className="w-3.5 h-3.5 object-cover rounded-full" />
                  ) : (
                    <span>{catalogItem?.icon || '👕'}</span>
                  )}
                  {item.name} ({item.quantity})
                </span>
              );
            })}
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
            onClick={() => handleDeleteOrder(row.id)}
            className="icon-button-small text-rose-600"
            title="Delete Order"
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
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Order Management</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">All Orders</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">Track and manage all laundry orders.</p>
            </div>
            {/* <button
              onClick={handleCreateOrder}
              className="dashboard-hero-pill btn-solid-primary flex w-full items-center justify-center gap-2 md:w-auto"
            >
              <FiPlus size={18} />
              <span className="font-semibold">New Order</span>
            </button> */}
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search order # or customer..."
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
          <h2 className="text-xl font-semibold text-primary">Orders List</h2>
          <p className="text-sm text-secondary">Total: {filteredOrders.length} orders | Total Value: {formatCurrency(filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}</p>
        </div>
        <button
          onClick={() => exportToCSV(filteredOrders, 'orders.csv')}
          className="action-button"
          title="Export to CSV"
        >
          <FiDownload size={16} />
          <span>Export</span>
        </button>
      </div>

      {/* Orders Table */}
      <section className="surface-card border border-border rounded-2xl overflow-hidden">
        <ReusableTable columns={tableColumns} data={filteredOrders} getRowStyle={getRowStyle} onRowClick={handleViewOrder} />
      </section>

      {/* Order Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Order Details"
        size="2xl"
      >
        {activeOrder && (
          <div className="space-y-6">
            {/* Order Header */}
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
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Status</p>
                  <span className={`status-pill border inline-block mt-1 px-2 py-1 text-xs ${paymentStatusStyles[activeOrder.paymentStatus]}`}>
                    {activeOrder.paymentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Staff Name</p>
                  <p className="mt-1 font-semibold text-primary">{activeOrder.staffName || activeOrder.createdBy || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Order Items</h3>
              <div className="space-y-3">
                {activeOrder.itemDetails?.map((item, idx) => (
                  <div key={idx} className="flex justify-between rounded-lg bg-surface-alt p-3">
                    <span className="text-primary font-medium">{item.name}</span>
                    <span className="text-secondary">{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">Status Timeline</h3>
              <OrderTimeline currentStatus={activeOrder.status} timeline={activeOrder.timeline} />
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
                <div className="flex justify-between">
                  <span className="text-secondary">Tax:</span>
                  <span className="font-semibold text-primary">{formatCurrency(activeOrder.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-primary font-semibold">Total:</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(activeOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Status & Delivery Update */}
            <div className="border-t border-border pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-primary">Update Status</h3>
                <div className="relative w-full">
                  <select
                    value={activeOrder.status}
                    onChange={(e) => handleUpdateStatus(activeOrder.id, e.target.value)}
                    className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 px-4 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
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

              <div>
                <h3 className="mb-2 text-sm font-semibold text-primary">Delivery Option</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(activeOrder.id, activeOrder.status, '', { deliveryType: 'Branch Pickup', deliveryDate: '' })}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      (activeOrder.deliveryType === 'Branch Pickup' || (!activeOrder.deliveryType && !activeOrder.isHomeDelivery))
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-surface border-border text-secondary hover:text-primary'
                    }`}
                  >
                    🏪 Branch Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(activeOrder.id, activeOrder.status, '', { deliveryType: 'Home Delivery', deliveryDate: activeOrder.deliveryDate || new Date().toISOString().split('T')[0] })}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      (activeOrder.deliveryType === 'Home Delivery' || activeOrder.isHomeDelivery)
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-surface border-border text-secondary hover:text-primary'
                    }`}
                  >
                    🚚 Home Delivery
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-6 flex gap-3">
              <button
                onClick={() => handlePrintInvoice(activeOrder)}
                className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/10 py-2 font-semibold text-blue-600 transition hover:bg-blue-500/20 flex items-center justify-center gap-2"
              >
                <FiPrinter size={16} />
                Print Invoice
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title="New Order"
        size="2xl"
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary">Customer *</label>
              <select
                name="customerId"
                value={orderForm.customerId}
                onChange={handleOrderFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
                required
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Service Type *</label>
              <select
                name="serviceType"
                value={orderForm.serviceType}
                onChange={handleOrderFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              >
                {services
                  .filter((s) => s.status === 'Active')
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({formatCurrency(s.price)})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Items *</label>
              <input
                name="items"
                value={orderForm.items}
                onChange={handleOrderFormChange}
                placeholder="e.g. Casual Shirts"
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Quantity *</label>
              <input
                type="number"
                name="quantity"
                min="1"
                value={orderForm.quantity}
                onChange={handleOrderFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Unit Price *</label>
              <input
                type="number"
                name="unitPrice"
                min="0"
                step="0.01"
                value={orderForm.unitPrice}
                onChange={handleOrderFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Expected Delivery *</label>
              <input
                type="date"
                name="expectedDeliveryDate"
                value={orderForm.expectedDeliveryDate}
                onChange={handleOrderFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Payment Status</label>
              <select
                name="paymentStatus"
                value={orderForm.paymentStatus}
                onChange={handleOrderFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-primary">Notes</label>
              <textarea
                name="notes"
                value={orderForm.notes}
                onChange={handleOrderFormChange}
                rows={2}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              />
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-border bg-surface-alt p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Total (incl. 10% tax)</p>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {formatCurrency(computeTotal().totalAmount)}
              </p>
              <p className="mt-1 text-sm text-secondary">Default status: Waiting</p>
            </div>
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleSaveOrder}
              className="btn-solid-primary flex-1 rounded-lg py-2 font-semibold transition"
            >
              Save Order
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFormModal(false);
                setOrderForm(emptyOrderForm);
              }}
              className="flex-1 rounded-lg border border-border bg-surface py-2 font-semibold text-primary hover:bg-surface-alt"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setOrderToDelete(null); }}
        title="Delete Order"
        size="sm"
      >
        <div className="space-y-6 text-center">
          <p className="text-secondary text-sm">
            Are you sure you want to delete this order? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setOrderToDelete(null); }}
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
    </div>
  );
};

export default Orders;
