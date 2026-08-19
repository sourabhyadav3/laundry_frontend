import React, { useContext, useMemo, useState } from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import OrderTable from '../../Components/counter/OrderTable';
import Modal from '../../Components/Modal';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { ORDER_STATUSES, getNextOrderStatus, getOrderStatusStyle, HOLD_STATUS } from '../../constants/statusStyles';
import OrderTimeline from '../../Components/counter/OrderTimeline';

const OrderList = () => {
  const { orders, updateOrderStatus, selectedBranch, bulkUpdateOrderStatus } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [deliveryFilter, setDeliveryFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return;
    const success = await bulkUpdateOrderStatus(selectedOrderIds, bulkStatus);
    if (success) {
      setSelectedOrderIds([]);
      setBulkStatus('');
    }
  };
  
  const activeOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [orders, selectedOrder]);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('Waiting');
  const [holdComment, setHoldComment] = useState('');

  const filteredOrders = useMemo(
    () =>
      orders
        .filter(
          (o) => {
            const matchesBranch = !selectedBranch || selectedBranch === 'All' || o.branchId === selectedBranch || o.branch === selectedBranch;
            const matchesSearch = o.number.toLowerCase().includes(searchTerm.toLowerCase()) || o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
            const matchesPayment = paymentFilter === 'All' || o.paymentStatus === paymentFilter;
            const isHome = o.deliveryType === 'Home Delivery' || o.isHomeDelivery;
            const matchesDelivery = deliveryFilter === 'All' ||
              (deliveryFilter === 'Home Delivery' && isHome) ||
              (deliveryFilter === 'Branch Pickup' && !isHome);

            return matchesBranch && matchesSearch && matchesStatus && matchesPayment && matchesDelivery;
          }
        )
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          return String(b.id || '').localeCompare(String(a.id || ''));
        }),
    [orders, searchTerm, selectedBranch, statusFilter, paymentFilter, deliveryFilter]
  );

  const handleUpdateStatus = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setHoldComment(order.holdComment || '');
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = () => {
    if (newStatus === HOLD_STATUS && !holdComment.trim()) {
      toast.error('Please enter a hold comment / opinion');
      return;
    }
    updateOrderStatus(
      selectedOrder.id,
      newStatus,
      newStatus === HOLD_STATUS ? holdComment.trim() : undefined
    );
    toast.success(`Order ${selectedOrder.number} updated to ${newStatus}`);
    setShowStatusModal(false);
    setHoldComment('');
  };

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">
            {JSON.parse(localStorage.getItem('user') || '{}').role || 'Counter Staff'}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Order List</h1>
          <p className="mt-2 text-sm text-secondary">View orders and update status through the workflow.</p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by order number or customer..."
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
              <option key={status} value={status}>{status}</option>
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

        <div className="relative">
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Types</option>
            <option value="Home Delivery">Home Delivery</option>
            <option value="Branch Pickup">Branch Pickup</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      {/* Bulk Status Update Area */}
      {selectedOrderIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl animate-fade-in">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-primary">
              Selected {selectedOrderIds.length} orders
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 px-4 pr-10 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
              >
                <option value="">-- Select Status --</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary" />
            </div>
            <button
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
            >
              Update Status
            </button>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-purple-600 hover:text-purple-800 hover:bg-purple-500/10 rounded-xl transition uppercase tracking-wider text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className="surface-card border border-border overflow-hidden">
        <OrderTable
          orders={filteredOrders}
          selectedOrderIds={selectedOrderIds}
          setSelectedOrderIds={setSelectedOrderIds}
          onView={(o) => {
            setSelectedOrder(o);
            setShowViewModal(true);
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      </section>

      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Order Details" size="lg">
        {activeOrder && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Order Number</p>
              <p className="mt-1 font-semibold text-primary">{activeOrder.number}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Customer</p>
              <p className="mt-1 font-semibold text-primary">{activeOrder.customerName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Service</p>
              <p className="mt-1 font-semibold text-primary">{activeOrder.serviceType}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Staff Name</p>
              <p className="mt-1 font-semibold text-primary">{activeOrder.staffName || activeOrder.createdBy || 'N/A'}</p>
            </div>
            <div className="sm:col-span-2 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-2">Invoice Summary</p>
              <div className="space-y-1 text-sm bg-surface-alt p-3 rounded-xl">
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
                <div className="flex justify-between border-t border-border pt-1 font-bold">
                  <span className="text-primary">Total:</span>
                  <span className="text-primary">{formatCurrency(activeOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Status</p>
              <p className="mt-1">
                <span className={getOrderStatusStyle(activeOrder.status)}>{activeOrder.status}</span>
              </p>
              {activeOrder.holdComment && (
                <p className="mt-1 text-xs text-amber-600">Hold note: {activeOrder.holdComment}</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Delivery Date</p>
              <p className="mt-1 font-semibold text-primary">{formatDate(activeOrder.deliveryDate)}</p>
            </div>
            <div className="sm:col-span-2 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-3">Progress Timeline</p>
              <OrderTimeline currentStatus={activeOrder.status} timeline={activeOrder.timeline} />
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Order Status">
        {selectedOrder && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Update order through the workflow stages below.
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {newStatus === HOLD_STATUS && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Hold comment / opinion
                </label>
                <textarea
                  value={holdComment}
                  onChange={(e) => setHoldComment(e.target.value)}
                  rows={3}
                  placeholder="Reason for hold..."
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setNewStatus(getNextOrderStatus(selectedOrder.status))}
              className="action-button w-full"
            >
              Advance to next stage
            </button>
            <button
              type="button"
              onClick={confirmStatusUpdate}
              className="w-full rounded-xl bg-blue-500/10 py-2 font-semibold text-blue-600"
            >
              Save Status
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderList;
