import React, { useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TypingText from '../../Components/TypingText';
import { useLanguage } from '../../context/LanguageContext';
import {
  FiShoppingBag,
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiCreditCard,
  FiUsers,
  FiPlus,
  FiDollarSign,
  FiMapPin,
} from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import ReusableTable from '../../Components/ReusableTable';
import { formatCurrency } from '../../utils/exportUtils';
import { getOrderStatusStyle, isReadyOrderStatus, ORDER_STATUSES } from '../../constants/statusStyles';
import { translateNotification } from '../../utils/notificationTranslator';

const formatTimeAgo = (dateValue, language) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const isAr = language === 'ar';

  if (seconds < 60) {
    return isAr ? 'الآن' : 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    if (isAr) {
      if (minutes === 1) return 'منذ دقيقة';
      if (minutes === 2) return 'منذ دقيقتين';
      if (minutes >= 3 && minutes <= 10) return `منذ ${minutes} دقائق`;
      return `منذ ${minutes} دقيقة`;
    }
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (isAr) {
      if (hours === 1) return 'منذ ساعة';
      if (hours === 2) return 'منذ ساعتين';
      if (hours >= 3 && hours <= 10) return `منذ ${hours} ساعات`;
      return `منذ ${hours} ساعة`;
    }
    return hours === 1 ? '1 hr ago' : `${hours} hrs ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    if (isAr) {
      if (days === 1) return 'منذ يوم';
      if (days === 2) return 'منذ يومين';
      if (days >= 3 && days <= 10) return `منذ ${days} أيام`;
      return `منذ ${days} يوم`;
    }
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const CounterDashboard = () => {
  const navigate = useNavigate();
  const { orders, customers, payments, selectedBranch, notifications } = useContext(AdminStateContext);
  const { t, language } = useLanguage();
  const today = new Date().toDateString();

  // Get active role and dynamic permissions from localStorage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = storedUser.role || '';

  const getPermissionsForRole = (role) => {
    const defaultPermissions = {
      'Admin': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'manage_orders', 
        'view_invoice_status', 'change_invoice_status', 'make_invoice', 'view_invoice_details', 
        'view_services', 'manage_services', 'view_logistics', 'manage_logistics', 
        'view_payments', 'manage_payments', 'view_reports', 'manage_staff', 'assign_roles', 
        'manage_permissions', 'manage_settings', 'full_access', 'create_records', 
        'edit_records', 'delete_records', 'view_all_data', 'access_all_modules'
      ],
      'Counter Staff': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'make_invoice',
        'view_invoice_status', 'change_invoice_status', 'view_invoice_details', 'view_payments',
        'manage_payments', 'view_services'
      ],
      'Delivery Staff': [
        'view_dashboard', 'view_logistics', 'view_invoice_status', 'change_invoice_status',
        'view_customers', 'manage_customers', 'make_invoice', 'view_orders'
      ],
    };

    const saved = localStorage.getItem('spinclean_role_permissions_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed[role]) {
          return parsed[role];
        }
      } catch (e) {
        console.error("Failed to parse role permissions", e);
      }
    }
    return defaultPermissions[role] || [];
  };

  const allowedPermissions = getPermissionsForRole(userRole);

  const metrics = useMemo(() => {
    let filteredOrders = orders;
    let filteredPayments = payments;
    let filteredCustomers = customers;

    if (selectedBranch && selectedBranch !== 'All') {
      filteredOrders = orders.filter((o) => o.branchId === selectedBranch || o.branch === selectedBranch);
      filteredPayments = payments.filter((p) => p.branchId === selectedBranch || p.branch === selectedBranch);
      const uniqueCustomerNames = new Set(filteredOrders.map(o => o.customerName));
      filteredCustomers = customers.filter(c => uniqueCustomerNames.has(c.name));
    }

    const todayOrders = filteredOrders.filter((o) => new Date(o.date).toDateString() === today);
    const todayPayments = filteredPayments.filter((p) => new Date(p.date).toDateString() === today);
    const revenueToday = todayPayments
      .filter((p) => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      ordersToday: todayOrders.length,
      pendingOrders: filteredOrders.filter((o) => !isReadyOrderStatus(o.status) && o.status !== 'Delivered').length,
      readyOrders: filteredOrders.filter((o) => isReadyOrderStatus(o.status)).length,
      deliveredOrders: filteredOrders.filter((o) => o.status === 'Delivered').length,
      revenueToday,
      totalCustomers: filteredCustomers.length,
      recentOrders: [...filteredOrders].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return String(b.id || '').localeCompare(String(a.id || ''));
      }).slice(0, 5),
      statusSummary: ORDER_STATUSES.map((status) => ({
        status,
        count: filteredOrders.filter((o) => o.status === status).length,
      })),
      activity: (() => {
        let filteredNotifs = notifications || [];
        if (selectedBranch && selectedBranch !== 'All') {
          filteredNotifs = filteredNotifs.filter(
            (n) => n.branchId === selectedBranch
          );
        }
        const todayNotifs = filteredNotifs
          .filter((n) => new Date(n.time || n.timestamp || n.createdAt).toDateString() === today)
          .sort((a, b) => new Date(b.time || b.timestamp || b.createdAt) - new Date(a.time || a.timestamp || a.createdAt));

        return todayNotifs.map(n => {
          const { title, text } = translateNotification(n.title, n.text, language);
          return {
            id: n.id || n._id,
            title,
            text,
            time: formatTimeAgo(n.time || n.timestamp || n.createdAt, language)
          };
        });
      })()
    };
  }, [orders, customers, payments, today, selectedBranch, notifications, language]);

  const tableColumns = [
    { header: t('admin.orderNo') || 'Order #', accessor: 'number' },
    {
      header: t('admin.service') || 'Service',
      accessor: 'serviceType',
      cell: (row) => {
        const serviceName = row.serviceType || row.service;
        if (!serviceName) return <span className="text-secondary">—</span>;
        const isExpress = /express|urgent|مستعجل/i.test(String(serviceName));
        if (isExpress) {
          return (
            <span className="inline-flex items-center gap-1 bg-red-600 text-white font-bold px-2 py-0.5 rounded-md text-xs shadow-sm whitespace-nowrap">
              <span>⚡</span>
              <span>{serviceName}</span>
            </span>
          );
        }
        return <span className="font-medium text-primary whitespace-nowrap">{serviceName}</span>;
      }
    },
    {
      header: t('admin.status') || 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={getOrderStatusStyle(row.status)}>{row.status}</span>
      ),
    },
    {
      header: t('admin.amount') || 'Amount',
      accessor: 'totalAmount',
      format: (v) => formatCurrency(v),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-3xl border border-border shadow-xl">
        <div className="dashboard-hero rounded-3xl p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">{t('nav.counterStaff') || 'Counter Staff'}</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">
                <TypingText text={t('counter.heroTitle') || "Welcome back, Counter Agent"} />
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">
                {t('counter.heroSubtitle') || "Manage customers, create orders, collect payments, and track order progress."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard icon={FiShoppingBag} label={t('counter.ordersToday') || "Orders Today"} value={metrics.ordersToday} change="Active counter" changePositive />
        <StatsCard icon={FiClock} label={t('counter.pendingOrders') || "Pending Orders"} value={metrics.pendingOrders} change="In workflow" changePositive={false} />
        <StatsCard icon={FiCheckCircle} label={t('counter.readyOrders') || "Ready Orders"} value={metrics.readyOrders} change="For pickup" changePositive />
        <StatsCard icon={FiTruck} label={t('counter.deliveredOrders') || "Delivered Orders"} value={metrics.deliveredOrders} change="Completed" changePositive />
        <StatsCard icon={FiCreditCard} label={t('counter.revenueToday') || "Revenue Today"} value={formatCurrency(metrics.revenueToday)} change="Collections" changePositive />
        <StatsCard icon={FiUsers} label={t('counter.totalCustomers') || "Total Customers"} value={metrics.totalCustomers} change="Registered" changePositive />
      </div>

      <div className="grid gap-6 xl:grid-cols-7">
        <section className="surface-card border border-border shadow-xl xl:col-span-4">
          <div className="border-b border-border p-6">
            <h2 className="text-xl font-semibold text-primary">{t('counter.recentOrders') || "Recent Orders"}</h2>
            <p className="mt-1 text-sm text-secondary">{t('counter.recentOrdersDesc') || "Latest orders from the counter"}</p>
          </div>
          <div className="p-6">
            <ReusableTable columns={tableColumns} data={metrics.recentOrders} onRowClick={() => navigate('/counter/orders')} />
          </div>
        </section>

        <div className="space-y-6 xl:col-span-3">
          <div className="surface-card p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t('counter.quickActions') || "Quick actions"}</p>
            <h2 className="mt-2 text-xl font-semibold text-primary">{t('counter.speedUpWorkflow') || "Speed up workflow"}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {allowedPermissions.includes('view_customers') && (
                <Link to="/counter/customers" className="action-button p-4 text-left">
                  <FiUsers size={18} />
                  <p className="mt-2 font-semibold text-primary text-xs">{t('counter.addCustomer') || "Add Customer"}</p>
                </Link>
              )}
              {allowedPermissions.includes('make_invoice') && (
                <Link to="/counter/orders/new" className="action-button p-4 text-left">
                  <FiPlus size={18} />
                  <p className="mt-2 font-semibold text-primary text-xs">{t('counter.createOrder') || "Create Order"}</p>
                </Link>
              )}
              {allowedPermissions.includes('view_payments') && (
                <Link to="/counter/payments" className="action-button p-4 text-left">
                  <FiDollarSign size={18} />
                  <p className="mt-2 font-semibold text-primary text-xs">{t('counter.collectPayment') || "Collect Payment"}</p>
                </Link>
              )}
              <Link to="/counter/expenses" className="action-button p-4 text-left border-rose-500/30 hover:border-rose-500/50">
                <span className="text-lg">💸</span>
                <p className="mt-2 font-semibold text-primary text-xs">{language === 'ar' ? 'المصروفات' : 'Expenses'}</p>
              </Link>
              {allowedPermissions.includes('view_orders') && (
                <Link to="/counter/tracking" className="action-button p-4 text-left">
                  <FiMapPin size={18} />
                  <p className="mt-2 font-semibold text-primary text-xs">{t('counter.trackOrder') || "Track Order"}</p>
                </Link>
              )}
            </div>
          </div>

          <div className="surface-card p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t('counter.orderStatus') || "Order status"}</p>
            <h2 className="mt-2 text-xl font-semibold text-primary">{t('counter.statusSummary') || "Status summary"}</h2>
            <div className="mt-5 space-y-3">
              {metrics.statusSummary.map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between rounded-2xl border border-border bg-surface-alt px-4 py-3">
                  <span className={getOrderStatusStyle(status)}>{status}</span>
                  <span className="font-semibold text-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="surface-card p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t('counter.todayActivity') || "Today's activity"}</p>
        <h2 className="mt-2 text-xl font-semibold text-primary">{t('counter.activityFeed') || "Counter activity feed"}</h2>
        <div className="mt-5 space-y-3">
          {metrics.activity.length > 0 ? (
            metrics.activity.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-alt px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-semibold text-primary">{item.title}</span>
                  <span className="text-sm text-secondary mt-0.5">{item.text}</span>
                </div>
                <span className="text-sm text-secondary whitespace-nowrap ml-4">{item.time}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-secondary text-sm">
              {language === 'ar' ? 'لا توجد أنشطة مسجلة اليوم' : 'No activity logged today'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CounterDashboard;
