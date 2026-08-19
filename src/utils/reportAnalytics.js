import { TERMINAL_ORDER_STATUSES } from '../constants/statusStyles';

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

export const getDateRange = (preset, customStart = '', customEnd = '') => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(end.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: new Date(`${customStart}T00:00:00`),
          end: new Date(`${customEnd}T23:59:59`),
        };
      }
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
};

export const getPreviousRange = ({ start, end }) => {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { start: prevStart, end: prevEnd };
};

export const isInRange = (dateStr, range) => {
  if (!dateStr || !range) return false;
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
};

export const growthIndicator = (current, previous) => {
  if (previous === 0 && current === 0) return { text: '0%', positive: true };
  if (previous === 0) return { text: '+100%', positive: true };
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.abs(pct).toFixed(1);
  return {
    text: `${pct >= 0 ? '+' : '-'}${rounded}%`,
    positive: pct >= 0,
  };
};

const washingKeywords = ['wash', 'fold', 'express', 'bulk', 'blanket'];
const ironingKeywords = ['iron', 'pressing', 'press'];
const dryCleanKeywords = ['dry clean'];
const premiumKeywords = ['premium', 'silk', 'wool', 'wedding', 'leather', 'stain'];

export const categorizeServiceRevenue = (orders) => {
  const buckets = {
    washing: 0,
    ironing: 0,
    dryCleaning: 0,
    premium: 0,
  };

  orders.forEach((o) => {
    const name = (o.serviceType || '').toLowerCase();
    const amount = o.totalAmount || o.amount || 0;
    if (premiumKeywords.some((k) => name.includes(k))) buckets.premium += amount;
    else if (dryCleanKeywords.some((k) => name.includes(k))) buckets.dryCleaning += amount;
    else if (ironingKeywords.some((k) => name.includes(k))) buckets.ironing += amount;
    else if (washingKeywords.some((k) => name.includes(k))) buckets.washing += amount;
    else buckets.washing += amount;
  });

  return buckets;
};

export const buildTopCustomers = (orders) => {
  const map = {};
  orders.forEach((o) => {
    const key = o.customerName || 'Unknown';
    if (!map[key]) {
      map[key] = {
        customerName: key,
        totalOrders: 0,
        totalRevenue: 0,
        lastOrderDate: o.date,
      };
    }
    map[key].totalOrders += 1;
    map[key].totalRevenue += o.totalAmount || o.amount || 0;
    if (new Date(o.date) > new Date(map[key].lastOrderDate)) {
      map[key].lastOrderDate = o.date;
    }
  });

  return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
};

export const buildStaffPerformance = (staff, orders) => {
  return staff.map((s) => {
    const handled = orders.filter(
      (o) => o.createdBy === s.name || o.createdBy === s.username
    ).length;
    const revenue = handled * 45 + (s.paymentsCollected || 0) * 0.1;
    return {
      id: s.id,
      staffName: s.name,
      role: s.role,
      ordersHandled: s.ordersHandled || handled,
      deliveriesCompleted: s.deliveriesCompleted || 0,
      revenueGenerated: Math.round(revenue * 100) / 100,
    };
  });
};

export const computeReportMetrics = ({
  orders,
  customers,
  payments,
  pickups,
  deliveries,
  staff,
  range,
}) => {
  const prevRange = getPreviousRange(range);
  const periodOrders = orders.filter((o) => isInRange(o.date, range));
  const prevOrders = orders.filter((o) => isInRange(o.date, prevRange));
  const periodPayments = payments.filter((p) => isInRange(p.date, range));

  const totalRevenue = periodOrders.reduce((s, o) => s + (o.totalAmount || o.amount || 0), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + (o.totalAmount || o.amount || 0), 0);

  const completedOrders = periodOrders.filter((o) => o.status === 'Delivered').length;
  const pendingOrders = periodOrders.filter(
    (o) => !TERMINAL_ORDER_STATUSES.includes(o.status) && o.status !== 'Delivered'
  ).length;
  const cancelledOrders = periodOrders.filter((o) => o.status === 'Return' || o.status === 'Cancelled').length;
  const deliveredOrders = completedOrders;

  const activeCustomers = customers.filter((c) => c.status === 'Active').length;
  const avgOrderValue = periodOrders.length ? totalRevenue / periodOrders.length : 0;

  const paidAmount = periodPayments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = periodPayments.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const partialAmount = periodPayments.filter((p) => p.status === 'Partial').reduce((s, p) => s + p.amount, 0);
  const dueCustomers = customers.filter((c) => (c.balance || 0) > 0).length;

  const periodPickups = pickups.filter((p) => isInRange(p.pickupDate, range));
  const completedPickups = periodPickups.filter((p) =>
    ['Completed', 'Picked Up'].includes(p.status)
  ).length;
  const periodDeliveries = deliveries.filter((d) => isInRange(d.deliveryDate, range));
  const failedDeliveries = periodDeliveries.filter((d) => d.status === 'Failed').length;
  const completedDeliveries = periodDeliveries.filter((d) => d.status === 'Delivered').length;

  const todayRange = getDateRange('today');
  const todayOrders = orders.filter((o) => isInRange(o.date, todayRange));
  const todayPayments = payments.filter((p) => isInRange(p.date, todayRange));

  const serviceRevenue = categorizeServiceRevenue(periodOrders);
  const topCustomers = buildTopCustomers(periodOrders);
  const staffPerformance = buildStaffPerformance(staff, periodOrders);

  const monthlyRevenue = totalRevenue;
  const prevMonthly = prevRevenue;

  return {
    summary: {
      totalRevenue,
      totalOrders: periodOrders.length,
      completedOrders,
      pendingOrders,
      activeCustomers,
      averageOrderValue: avgOrderValue,
      growth: {
        revenue: growthIndicator(totalRevenue, prevRevenue),
        orders: growthIndicator(periodOrders.length, prevOrders.length),
        completed: growthIndicator(completedOrders, prevOrders.filter((o) => o.status === 'Delivered').length),
        pending: growthIndicator(
          pendingOrders,
          prevOrders.filter((o) => !TERMINAL_ORDER_STATUSES.includes(o.status) && o.status !== 'Delivered').length
        ),
        customers: growthIndicator(activeCustomers, activeCustomers),
        avgOrder: growthIndicator(avgOrderValue, prevOrders.length ? prevRevenue / prevOrders.length : 0),
      },
    },
    daily: {
      revenueToday: todayOrders.reduce((s, o) => s + (o.totalAmount || o.amount || 0), 0),
      ordersToday: todayOrders.length,
      paymentsReceived: todayPayments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
    },
    monthly: {
      monthlyRevenue,
      revenueGrowth: growthIndicator(monthlyRevenue, prevMonthly),
      revenueComparison: prevMonthly,
    },
    orders: {
      totalOrders: periodOrders.length,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
    },
    serviceRevenue,
    payments: { paidAmount, pendingAmount, partialAmount, dueCustomers },
    logistics: {
      totalPickups: periodPickups.length,
      completedPickups,
      totalDeliveries: periodDeliveries.length,
      failedDeliveries,
      completedDeliveries,
    },
    topCustomers,
    staffPerformance,
    periodOrders,
    paymentMethodBreakdown: periodPayments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
      return acc;
    }, {}),
    orderStatusBreakdown: periodOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {}),
  };
};
