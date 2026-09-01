import React, { useContext, useMemo, useState } from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import OrderTable from '../../Components/counter/OrderTable';
import Modal from '../../Components/Modal';
import { formatCurrency } from '../../utils/exportUtils';
import { ORDER_STATUSES, getNextOrderStatus, getOrderStatusStyle, HOLD_STATUS } from '../../constants/statusStyles';
import OrderTimeline from '../../Components/counter/OrderTimeline';

const OrderList = () => {
  const { orders, updateOrderStatus, selectedBranch, bulkUpdateOrderStatus, transferOrdersToBranch, branches, language } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [deliveryFilter, setDeliveryFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return;
    const success = await bulkUpdateOrderStatus(selectedOrderIds, bulkStatus);
    if (success) {
      setSelectedOrderIds([]);
      setBulkStatus('');
    }
  };

  const handleTransferBranch = async () => {
    if (!targetBranch || selectedOrderIds.length === 0) return;
    setIsTransferring(true);
    const success = await transferOrdersToBranch(selectedOrderIds, targetBranch);
    setIsTransferring(false);
    if (success) {
      setSelectedOrderIds([]);
      setTargetBranch('');
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
  const [statusDeliveryType, setStatusDeliveryType] = useState('Branch Pickup');
  const [statusDeliveryDate, setStatusDeliveryDate] = useState('');
  const [statusDeliveryTime, setStatusDeliveryTime] = useState('');

  // Local state for Order Details Delivery section
  const [viewDeliveryMode, setViewDeliveryMode] = useState('branch');
  const [viewDeliveryDate, setViewDeliveryDate] = useState('');
  const [viewDeliveryTime, setViewDeliveryTime] = useState('');

  const filteredOrders = useMemo(
    () =>
      orders
        .filter(
          (o) => {
            const matchesBranch = (() => {
              if (!selectedBranch || selectedBranch === 'All') return true;
              const selStr = String(selectedBranch).toLowerCase();
              if (o.branchId && String(o.branchId).toLowerCase() === selStr) return true;
              if (o.branch && String(o.branch).toLowerCase() === selStr) return true;
              if (o.transferredTo && String(o.transferredTo).toLowerCase() === selStr) return true;
              if (o.transferredBranchName && String(o.transferredBranchName).toLowerCase() === selStr) return true;
              if (Array.isArray(o.sharedBranches) && o.sharedBranches.some(b => String(b).toLowerCase() === selStr)) return true;

              const activeBranchObj = branches?.find(b => String(b.id || b._id).toLowerCase() === selStr || String(b.name || '').toLowerCase() === selStr);
              if (activeBranchObj) {
                const bId = String(activeBranchObj.id || activeBranchObj._id).toLowerCase();
                const bName = String(activeBranchObj.name || '').toLowerCase();
                if (o.branchId && String(o.branchId).toLowerCase() === bId) return true;
                if (o.transferredTo && String(o.transferredTo).toLowerCase() === bId) return true;
                if (o.transferredBranchName && String(o.transferredBranchName).toLowerCase() === bName) return true;
                if (Array.isArray(o.sharedBranches) && o.sharedBranches.some(b => String(b).toLowerCase() === bId)) return true;
              }
              return false;
            })();

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
    [orders, searchTerm, selectedBranch, statusFilter, paymentFilter, deliveryFilter, branches]
  );

  const handleUpdateStatus = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setHoldComment(order.holdComment || '');
    setStatusDeliveryType(order.deliveryType || (order.isHomeDelivery ? 'Home Delivery' : 'Branch Pickup'));
    setStatusDeliveryDate(order.deliveryDate ? order.deliveryDate.substring(0, 10) : '');
    setStatusDeliveryTime(order.expectedDeliveryTime || '');
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
      newStatus === HOLD_STATUS ? holdComment.trim() : undefined,
      {
        deliveryType: statusDeliveryType,
        deliveryDate: statusDeliveryType === 'Home Delivery' ? statusDeliveryDate : '',
        expectedDeliveryTime: statusDeliveryTime
      }
    );
    setShowStatusModal(false);
    setHoldComment('');
  };

  const handleSaveDeliveryInViewModal = async () => {
    if (!selectedOrder) return;
    const isHome = viewDeliveryMode === 'home';
    const targetType = isHome ? 'Home Delivery' : 'Branch Pickup';
    const targetDate = isHome ? (viewDeliveryDate || new Date().toISOString().split('T')[0]) : '';
    await updateOrderStatus(
      selectedOrder.id || selectedOrder._id,
      {
        status: selectedOrder.status || 'Waiting',
        deliveryType: targetType,
        isHomeDelivery: isHome,
        deliveryMode: viewDeliveryMode,
        deliveryDate: targetDate,
        expectedDeliveryDate: targetDate,
        expectedDeliveryTime: viewDeliveryTime,
        isDeliveryOnly: true
      }
    );
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

      {/* Bulk Status & Branch Transfer Area */}
      {selectedOrderIds.length > 0 && (
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl animate-fade-in">
          <div className="flex items-center gap-2 w-full xl:w-auto">
            <span className="text-sm font-bold text-primary">
              {language === 'ar' ? `تم تحديد ${selectedOrderIds.length} طلبات` : `Selected ${selectedOrderIds.length} orders`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Status Update section */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[200px]">
              <div className="relative flex-1">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 px-3.5 pr-9 text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  <option value="">{language === 'ar' ? '-- تحديد الحالة --' : '-- Select Status --'}</option>
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
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              >
                {language === 'ar' ? 'تحديث الحالة' : 'Update Status'}
              </button>
            </div>

            <div className="hidden sm:block h-6 w-px bg-purple-500/30" />

            {/* Branch Transfer Section */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[220px]">
              <div className="relative flex-1">
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 px-3.5 pr-9 text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                >
                  <option value="">{language === 'ar' ? '-- إرسال إلى فرع --' : '-- Send to Branch --'}</option>
                  {branches?.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {language === 'ar' ? (b.nameAr || b.arabicName || b.name) : b.name}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary" />
              </div>
              <button
                onClick={handleTransferBranch}
                disabled={!targetBranch || isTransferring}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>🚀</span>
                <span>{isTransferring ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال للفرع' : 'Send to Branch')}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedOrderIds([]);
                setBulkStatus('');
                setTargetBranch('');
              }}
              className="px-3.5 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-border/40 rounded-xl transition uppercase tracking-wider text-center"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
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
            const isHome = String(o.deliveryType || '').trim().toLowerCase() === 'home delivery' || o.isHomeDelivery === true || o.deliveryMode === 'home';
            setViewDeliveryMode(isHome ? 'home' : 'branch');
            setViewDeliveryDate(o.deliveryDate ? o.deliveryDate.substring(0, 10) : (o.expectedDeliveryDate ? o.expectedDeliveryDate.substring(0, 10) : ''));
            setViewDeliveryTime(o.expectedDeliveryTime || '');
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
              <div className="mt-1">
                {/express|urgent|مستعجل/i.test(String(activeOrder.serviceType || '')) ? (
                  <span className="inline-flex items-center gap-1 bg-red-600 text-white font-bold px-2 py-0.5 rounded-md text-xs shadow-sm">
                    <span>⚡</span>
                    <span>{activeOrder.serviceType}</span>
                  </span>
                ) : (
                  <p className="font-semibold text-primary">{activeOrder.serviceType || '—'}</p>
                )}
              </div>
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

            {/* Delivery Method & Time Controls (matching Make Invoice / Edit Invoice) */}
            <div className="sm:col-span-2 p-3 bg-surface-alt/40 border border-border/70 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Delivery Type
                </label>
                <div className="flex bg-surface p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setViewDeliveryMode('branch')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      viewDeliveryMode === 'branch'
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    🏪 Branch Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewDeliveryMode('home');
                      if (!viewDeliveryDate) {
                        setViewDeliveryDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      viewDeliveryMode === 'home'
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    🏠 Home Delivery
                  </button>
                </div>
              </div>

              {/* Date & Time Edit Controls */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                <div className={`grid ${viewDeliveryMode === 'home' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                  {viewDeliveryMode === 'home' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                        📅 Expected Ready Date
                      </label>
                      <input
                        type="date"
                        value={viewDeliveryDate}
                        onChange={(e) => setViewDeliveryDate(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                      ⏰ Ready In / Delivery Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Hour, 2 Hours"
                      value={viewDeliveryTime}
                      onChange={(e) => setViewDeliveryTime(e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                    />
                  </div>
                </div>

                {/* Quick Time Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  <span className="text-[9px] font-bold text-secondary uppercase shrink-0">
                    ⚡ Quick Time:
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewDeliveryTime('')}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all ${
                      !viewDeliveryTime
                        ? 'bg-blue-500/15 border-blue-500 text-blue-600 font-bold'
                        : 'bg-surface border-border text-secondary hover:text-primary'
                    }`}
                  >
                    Default
                  </button>
                  {[
                    'After 1 Hour',
                    'After 2 Hours',
                    'After 3 Hours',
                    'After 4 Hours',
                    'After 6 Hours',
                    'After 12 Hours',
                    'After 24 Hours',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setViewDeliveryTime(preset)}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md border shrink-0 transition-all ${
                        viewDeliveryTime === preset || viewDeliveryTime === preset.replace(/^After\s+/, '')
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                          : 'bg-surface border-border text-secondary hover:text-primary hover:border-blue-500 hover:text-blue-500'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveDeliveryInViewModal}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Save Delivery Option
                  </button>
                </div>
              </div>
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

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1 block">
                Workflow Stage
              </label>
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
            </div>

            {/* Delivery Method & Time Controls (matching Make Invoice / Edit Invoice) */}
            <div className="p-3 bg-surface-alt/40 border border-border/70 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Delivery Type
                </label>
                <div className="flex bg-surface p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setStatusDeliveryType('Branch Pickup')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      statusDeliveryType === 'Branch Pickup'
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    🏪 Branch Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusDeliveryType('Home Delivery');
                      if (!statusDeliveryDate) {
                        setStatusDeliveryDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      statusDeliveryType === 'Home Delivery'
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    🏠 Home Delivery
                  </button>
                </div>
              </div>

              {/* Date & Time Edit Controls */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                <div className={`grid ${statusDeliveryType === 'Home Delivery' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                  {statusDeliveryType === 'Home Delivery' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                        📅 Expected Ready Date
                      </label>
                      <input
                        type="date"
                        value={statusDeliveryDate}
                        onChange={(e) => setStatusDeliveryDate(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                      ⏰ Ready In / Delivery Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Hour, 2 Hours"
                      value={statusDeliveryTime}
                      onChange={(e) => setStatusDeliveryTime(e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                    />
                  </div>
                </div>

                {/* Quick Time Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  <span className="text-[9px] font-bold text-secondary uppercase shrink-0">
                    ⚡ Quick Time:
                  </span>
                  <button
                    type="button"
                    onClick={() => setStatusDeliveryTime('')}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all ${
                      !statusDeliveryTime
                        ? 'bg-blue-500/15 border-blue-500 text-blue-600 font-bold'
                        : 'bg-surface border-border text-secondary hover:text-primary'
                    }`}
                  >
                    Default
                  </button>
                  {[
                    'After 1 Hour',
                    'After 2 Hours',
                    'After 3 Hours',
                    'After 4 Hours',
                    'After 6 Hours',
                    'After 12 Hours',
                    'After 24 Hours',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStatusDeliveryTime(preset)}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md border shrink-0 transition-all ${
                        statusDeliveryTime === preset || statusDeliveryTime === preset.replace(/^After\s+/, '')
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                          : 'bg-surface border-border text-secondary hover:text-primary hover:border-blue-500 hover:text-blue-500'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
              className="w-full rounded-xl bg-blue-500/10 py-2 font-semibold text-blue-600 hover:bg-blue-500/20 transition-all"
            >
              Save Changes
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderList;
