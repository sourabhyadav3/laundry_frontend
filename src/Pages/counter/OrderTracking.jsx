import React, { useContext, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import OrderTimeline from '../../Components/counter/OrderTimeline';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { getOrderStatusStyle } from '../../constants/statusStyles';

const OrderTracking = () => {
  const { orders, customers } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const results = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(
      (o) => o.number.toLowerCase().includes(term) || o.customerName.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  const activeOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [orders, selectedOrder]);

  const customer = activeOrder
    ? customers.find((c) => c.id === activeOrder.customerId || c._id === activeOrder.customerId)
    : null;

  const customerAddress = useMemo(() => {
    if (!customer) return 'N/A';
    const parts = [];
    if (customer.areaName) parts.push(`Area: ${customer.areaName}`);
    if (customer.street) parts.push(`Street: ${customer.street}`);
    if (customer.partNo) parts.push(`Part: ${customer.partNo}`);
    if (customer.jadda) parts.push(`Jadda: ${customer.jadda}`);
    if (customer.houseNo) parts.push(`House: ${customer.houseNo}`);
    if (customer.levelNo) parts.push(`Floor: ${customer.levelNo}`);
    if (customer.flatNo) parts.push(`Flat: ${customer.flatNo}`);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }, [customer]);

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Counter Staff</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Order Tracking</h1>
          <p className="mt-2 text-sm text-secondary">Search by order number or customer name.</p>
        </div>
      </section>

      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Order number or customer name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedOrder(null);
          }}
          className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary"
        />
      </div>

      {results.length > 0 && !selectedOrder && (
        <section className="surface-card border border-border p-4">
          <p className="mb-3 text-sm text-secondary">{results.length} result(s)</p>
          <div className="space-y-2">
            {results.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-alt px-4 py-3 text-left hover:bg-surface"
              >
                <span className="font-semibold text-primary">{order.number}</span>
                <span className="text-sm text-secondary">{order.customerName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeOrder && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="surface-card border border-border p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-primary">Order Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Order Number</p>
                <p className="mt-1 font-semibold text-primary">{activeOrder.number}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Service</p>
                <p className="mt-1 font-semibold text-primary">{activeOrder.serviceType}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Amount</p>
                <p className="mt-1 font-semibold text-primary">{formatCurrency(activeOrder.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Delivery Date</p>
                <p className="mt-1 font-semibold text-primary">{formatDate(activeOrder.deliveryDate)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Current Status</p>
                <p className="mt-1">
                  <span className={getOrderStatusStyle(activeOrder.status)}>{activeOrder.status}</span>
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card border border-border p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-primary">Customer Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Name</p>
                <p className="mt-1 font-semibold text-primary">{activeOrder.customerName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Phone</p>
                <p className="mt-1 font-semibold text-primary">{customer?.phone || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Address</p>
                <p className="mt-1 font-semibold text-primary">{customerAddress}</p>
              </div>
            </div>
          </section>

          <section className="surface-card border border-border p-6 shadow-xl lg:col-span-2">
            <h2 className="text-xl font-semibold text-primary">Progress Timeline</h2>
            <div className="mt-6">
              <OrderTimeline currentStatus={activeOrder.status} timeline={activeOrder.timeline} />
            </div>
          </section>
        </div>
      )}

      {searchTerm && results.length === 0 && (
        <p className="text-center text-secondary">No orders found for &quot;{searchTerm}&quot;</p>
      )}
    </div>
  );
};

export default OrderTracking;
