import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import TypingText from '../../Components/TypingText';
import { useLanguage } from '../../context/LanguageContext';
import { FiPackage, FiTruck, FiCheckCircle, FiCalendar } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import { formatDate } from '../../utils/exportUtils';
import { pickupStatusStyles, deliveryStatusStyles } from '../../constants/statusStyles';

const DEFAULT_STAFF = 'Frank Brown';

const DeliveryDashboard = () => {
  const { pickups, deliveries } = useContext(AdminStateContext);
  const { t } = useLanguage();
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const staffName = storedUser?.name || DEFAULT_STAFF;
  const today = new Date().toISOString().split('T')[0];

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

  const myPickups = useMemo(
    () => pickups.filter((p) => p.assignedStaff === staffName),
    [pickups, staffName]
  );
  const myDeliveries = useMemo(
    () => deliveries.filter((d) => d.assignedStaff === staffName),
    [deliveries, staffName]
  );

  const metrics = useMemo(() => {
    const completedJobs = [
      ...myPickups.filter((p) => ['Picked Up', 'Completed'].includes(p.status)),
      ...myDeliveries.filter((d) => ['Delivered', 'Failed'].includes(d.status)),
    ].length;
    const todayDeliveries = myDeliveries.filter((d) => d.deliveryDate === today);

    return {
      assignedPickups: myPickups.filter((p) => !['Completed', 'Picked Up'].includes(p.status)).length,
      assignedDeliveries: myDeliveries.filter((d) => !['Delivered', 'Failed'].includes(d.status)).length,
      completedJobs,
      todayDeliveries: todayDeliveries.length,
      schedule: [...myPickups, ...myDeliveries]
        .filter((j) => (j.pickupDate || j.deliveryDate) === today)
        .slice(0, 6),
      upcoming: myDeliveries.filter((d) => d.status === 'Assigned').slice(0, 5),
      pickupRequests: myPickups.filter((p) => p.status === 'Assigned').slice(0, 5),
    };
  }, [myPickups, myDeliveries, today]);

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-3xl border border-border shadow-xl">
        <div className="dashboard-hero rounded-3xl p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">{t('nav.deliveryStaff') || 'Delivery Staff'}</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">
                <TypingText text={t('delivery.heroTitle') || "Welcome back, Dispatch Rider"} />
              </h1>
              <p className="mt-2 text-sm text-secondary">{t('delivery.heroSubtitle') || "Handle pickups and deliveries assigned by admin."}</p>
            </div>
            <div className="dashboard-hero-pill">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t('delivery.assignedTo') || "Assigned to"}</p>
              <p className="mt-2 text-xl font-semibold text-primary">{staffName}</p>
            </div>
          </div>
        </div>
      </section>

      {allowedPermissions.includes('view_logistics') ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard icon={FiPackage} label={t('delivery.assignedPickups') || "Assigned Pickups"} value={metrics.assignedPickups} change="Active" changePositive />
            <StatsCard icon={FiTruck} label={t('delivery.assignedDeliveries') || "Assigned Deliveries"} value={metrics.assignedDeliveries} change="In queue" changePositive />
            <StatsCard icon={FiCheckCircle} label={t('delivery.completedJobs') || "Completed Jobs"} value={metrics.completedJobs} change="Total" changePositive />
            <StatsCard icon={FiCalendar} label={t('delivery.todayDeliveries') || "Today's Deliveries"} value={metrics.todayDeliveries} change="Scheduled" changePositive />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="surface-card border border-border p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-primary">{t('delivery.todaySchedule') || "Today's Schedule"}</h2>
              <div className="mt-4 space-y-3">
                {metrics.schedule.length ? (
                  metrics.schedule.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
                      <p className="font-semibold text-primary">{item.customer}</p>
                      <p className="text-sm text-secondary">
                        {item.pickupId || item.deliveryId} · {formatDate(item.pickupDate || item.deliveryDate)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-secondary">{t('delivery.noJobsToday') || "No jobs scheduled for today."}</p>
                )}
              </div>
            </section>

            <section className="surface-card border border-border p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-primary">{t('delivery.upcomingDeliveries') || "Upcoming Deliveries"}</h2>
              <div className="mt-4 space-y-3">
                {metrics.upcoming.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-alt px-4 py-3">
                    <div>
                      <p className="font-semibold text-primary">{d.customer}</p>
                      <p className="text-sm text-secondary">{formatDate(d.deliveryDate)}</p>
                    </div>
                    <span className={deliveryStatusStyles[d.status]}>{d.status}</span>
                  </div>
                ))}
              </div>
              <Link to="/delivery/deliveries" className="mt-4 inline-block text-sm font-semibold text-blue-600">
                {t('delivery.viewAllDeliveries') || "View all deliveries →"}
              </Link>
            </section>

            <section className="surface-card border border-border p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-primary">{t('delivery.pickupRequests') || "Pickup Requests"}</h2>
              <div className="mt-4 space-y-3">
                {metrics.pickupRequests.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-alt px-4 py-3">
                    <div>
                      <p className="font-semibold text-primary">{p.customer}</p>
                      <p className="text-sm text-secondary">{p.address}</p>
                    </div>
                    <span className={pickupStatusStyles[p.status]}>{p.status}</span>
                  </div>
                ))}
              </div>
              <Link to="/delivery/pickups" className="mt-4 inline-block text-sm font-semibold text-blue-600">
                {t('delivery.viewAllPickups') || "View all pickups →"}
              </Link>
            </section>

            <section className="surface-card border border-border p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-primary">{t('delivery.deliveryPerformance') || "Delivery Performance"}</h2>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-surface-alt p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{metrics.completedJobs}</p>
                  <p className="mt-1 text-xs text-secondary">{t('delivery.completed') || "Completed"}</p>
                </div>
                <div className="rounded-2xl bg-surface-alt p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{metrics.assignedDeliveries}</p>
                  <p className="mt-1 text-xs text-secondary">{t('delivery.pending') || "Pending"}</p>
                </div>
                <div className="rounded-2xl bg-surface-alt p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">94%</p>
                  <p className="mt-1 text-xs text-secondary">{t('delivery.successRate') || "Success rate"}</p>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="surface-card p-10 text-center border border-border rounded-3xl shadow-xl">
          <p className="text-secondary text-lg">Logistics operations are currently restricted for your account.</p>
          <p className="text-xs text-secondary mt-1">Please contact your administrator if this is a mistake.</p>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
