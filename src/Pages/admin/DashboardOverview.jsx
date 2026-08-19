// src/pages/admin/DashboardOverview.jsx
import React, { useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiCreditCard, FiTrendingUp, FiShoppingBag } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import ReusableTable from '../../Components/ReusableTable';
import TypingText from '../../Components/TypingText';
import { useLanguage } from '../../context/LanguageContext';
import {
  DailyRevenueGraph,
  MonthlyRevenueChart,
  OrdersTrendChart,
  ServiceWiseRevenuePieChart,
} from '../../Components/DashboardCharts';
import { paymentStatusStyles, getOrderStatusStyle, isReadyOrderStatus } from '../../constants/statusStyles';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { getRecentOrders } from '../../utils/orderUtils';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { orders, selectedBranch, liveUpdateFilter, drivers } = useContext(AdminStateContext);
  const { t, language } = useLanguage();

  const driverStats = useMemo(() => {
    const total = drivers?.length || 0;
    const available = (drivers || []).filter(d => d.status === 'Available').length;
    const assigned = (drivers || []).filter(d => d.status === 'Assigned').length;
    const onDelivery = (drivers || []).filter(d => d.status === 'On Delivery').length;
    const offDuty = (drivers || []).filter(d => d.status === 'Off Duty').length;
    return { total, available, assigned, onDelivery, offDuty };
  }, [drivers]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (selectedBranch && selectedBranch !== 'All') {
      result = result.filter(o => o.branchId === selectedBranch || o.branch === selectedBranch);
    }
    if (liveUpdateFilter === 'Express') {
      result = result.filter(o => o.serviceType === 'Urgent' || o.serviceType === 'Express' || o.service === 'Urgent' || o.service === 'Express');
    }
    return result;
  }, [orders, selectedBranch, liveUpdateFilter]);


  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const readyOrders = filteredOrders.filter((o) => isReadyOrderStatus(o.status)).length;
  const deliveredOrders = filteredOrders.filter((o) => o.status === 'Delivered').length;
  const ordersToday = filteredOrders.filter((o) => new Date(o.date).toDateString() === new Date().toDateString()).length;

  const recentOrders = useMemo(() => getRecentOrders(filteredOrders), [filteredOrders]);
  const recentOrdersSorted = useMemo(() => [...recentOrders].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    const numA = Number(a.id);
    const numB = Number(b.id);
    if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  }), [recentOrders]);
  const recentOrdersFeed = useMemo(() => [...recentOrders].reverse(), [recentOrders]);

  const tableColumns = [
    { header: t('admin.orderNo') || 'Order #', accessor: 'number' },
    { header: t('admin.customer') || 'Customer', accessor: 'customerName' },
    { header: t('admin.service') || 'Service', accessor: 'serviceType' },
    {
      header: t('admin.status') || 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={`status-pill border ${getOrderStatusStyle(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: t('admin.payment') || 'Payment',
      accessor: 'paymentStatus',
      cell: (row) => (
        <span className={`status-pill border ${paymentStatusStyles[row.paymentStatus] || paymentStatusStyles.Pending}`}>
          {row.paymentStatus}
        </span>
      ),
    },
    { header: t('admin.amount') || 'Amount', accessor: 'totalAmount', format: (val) => formatCurrency(val) },
    { header: t('admin.date') || 'Date', accessor: 'date', format: (val) => formatDate(val) },
  ];

  return (
    <div className="space-y-8 admin-dashboard-page">
      <section className="surface-card rounded-3xl border border-border shadow-xl">
        <div className="dashboard-hero rounded-3xl p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">{t('sidebar.brand') || 'Tuhama'} {t('sidebar.dashboard') || 'Dashboard'}</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">
                <TypingText text={t('admin.heroTitle') || "Welcome back, Operations Lead"} />
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">
                {t('admin.heroSubtitle') || "Track laundry volume, dispatch readiness, and revenue performance in a clean and modern interface."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard accent="blue" icon={FiTrendingUp} label={t('admin.ordersToday') || "Orders Today"} value={ordersToday} change="+7%" changePositive />
        <StatsCard accent="emerald" icon={FiCreditCard} label={t('admin.revenueMonth') || "Revenue This Month"} value={formatCurrency(totalRevenue)} change="+12%" changePositive />
        <StatsCard accent="violet" icon={FiCheckCircle} label={t('admin.readyOrders') || "Ready Orders"} value={readyOrders} change="+5%" changePositive />
        <StatsCard accent="cyan" icon={FiShoppingBag} label={t('admin.deliveredOrders') || "Delivered Orders"} value={deliveredOrders} change="+3%" changePositive />
      </div>

      {/* Driver Status Summary Widget */}
      <section className="surface-card p-6 border border-border shadow-xl rounded-3xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">{language === 'ar' ? 'ملخص حالة السائقين' : 'Driver Status Summary'}</h2>
            <p className="text-xs text-secondary mt-0.5">{language === 'ar' ? 'مراقبة توافر السائقين اللوجستية وجاهزيتهم' : 'Monitor driver logistics availability and readiness.'}</p>
          </div>
          <Link to="/admin/drivers" className="text-xs font-semibold text-blue-600 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/15 px-3.5 py-1.5 rounded-full transition-all">
            {language === 'ar' ? 'إدارة السائقين' : 'Manage Drivers'}
          </Link>
        </div>

        <div className="grid gap-4 mt-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {/* Total Drivers */}
          <div className="p-4 rounded-2xl border border-border bg-surface-alt/45 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Total Drivers</span>
            <span className="text-2xl font-bold text-primary mt-2">{driverStats.total}</span>
          </div>
          
          {/* Available */}
          <div className="p-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available</span>
            <span className="text-2xl font-bold text-emerald-700 mt-2">{driverStats.available}</span>
          </div>

          {/* Assigned */}
          <div className="p-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Assigned</span>
            <span className="text-2xl font-bold text-amber-700 mt-2">{driverStats.assigned}</span>
          </div>

          {/* On Delivery */}
          <div className="p-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">On Delivery</span>
            <span className="text-2xl font-bold text-blue-700 mt-2">{driverStats.onDelivery}</span>
          </div>

          {/* Off Duty */}
          <div className="p-4 rounded-2xl border border-rose-500/15 bg-rose-500/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Off Duty</span>
            <span className="text-2xl font-bold text-rose-700 mt-2">{driverStats.offDuty}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-7">
        <div className="xl:col-span-4 self-start">
          <MonthlyRevenueChart />
        </div>

        <div className="xl:col-span-3 min-w-0 space-y-6">
          <div className="surface-card p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t('admin.activityTimeline') || "Activity timeline"}</p>
                <h2 className="mt-2 text-xl font-semibold text-primary">{t('admin.operationsFeed') || "Operations feed"}</h2>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                {t('admin.live') || "Live"}
              </span>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-border/80 bg-surface">
              <table className="min-w-[700px] w-full divide-y divide-border/60">
                <thead className="bg-surface-alt/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">{t('admin.orderNo') || 'Order #'}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">{t('admin.customer') || 'Customer'}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">{t('admin.service') || 'Service'}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">{t('admin.amount') || 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">{t('admin.date') || 'Date'}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">{t('admin.status') || 'Status'}</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">{t('admin.payment') || 'Payment'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentOrdersFeed.map((order) => (
                    <tr key={order.id} className="transition hover:bg-surface-alt/40">
                      <td className="px-4 py-3 text-xs font-semibold text-primary whitespace-nowrap">{order.number}</td>
                      <td className="px-4 py-3 text-xs text-primary whitespace-nowrap">{order.customerName}</td>
                      <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap">{order.serviceType}</td>
                      <td className="px-4 py-3 text-xs text-primary whitespace-nowrap">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap">{formatDate(order.date)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={`status-pill border text-[10px] py-1 px-2.5 ${getOrderStatusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={`status-pill border text-[10px] py-1 px-2.5 ${paymentStatusStyles[order.paymentStatus] || paymentStatusStyles.Pending}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-card p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t('admin.quickActions') || "Quick actions"}</p>
                <h2 className="mt-2 text-xl font-semibold text-primary">{t('admin.speedUpWorkflow') || "Speed up workflow"}</h2>
              </div>
            </div>
            <div className="quick-actions-grid mt-6 grid grid-cols-2 gap-3">
              {[
                { label: t('admin.createOrder') || 'Create Order', hint: t('admin.createOrderHint') || 'Add service' },
                { label: t('admin.schedulePickup') || 'Schedule Pickup', hint: t('admin.schedulePickupHint') || 'Dispatch driver' },
                { label: t('admin.collectPayments') || 'Collect Payments', hint: t('admin.collectPaymentsHint') || 'Process invoice' },
                { label: t('admin.systemSettings') || 'System Settings', hint: t('admin.systemSettingsHint') || 'Configure' },
              ].map((action) => (
                <button key={action.label} className="action-button p-4 text-left">
                  <p className="font-semibold text-primary text-xs truncate">{action.label}</p>
                  <p className="mt-1 text-[10px] text-secondary truncate">{action.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DailyRevenueGraph />
        <OrdersTrendChart />
        <ServiceWiseRevenuePieChart />
      </div>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">{t('admin.recentOrders') || "Recent Orders"}</h2>
            <p className="text-sm text-secondary">
              {(t('admin.recentOrdersDesc') || "Last {count} orders from the Orders list.").replace('{count}', recentOrders.length)}
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-alt"
          >
            {t('admin.viewAllOrders') || "View all orders"}
          </Link>
        </div>

        <div className="mt-5">
          <ReusableTable columns={tableColumns} data={recentOrdersSorted} onRowClick={() => navigate('/admin/orders')} />
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
