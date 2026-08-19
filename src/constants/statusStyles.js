export const ORDER_STATUSES = [
  'Waiting',
  'Preparing in shop',
  'Preparing in workshop',
  'Hold',
  'Ready',
  'Ready for delivery',
  'Ready for shop',
  'With Driver',
  'Delivered',
  'Return',
  'Store',
];

export const HOLD_STATUS = 'Hold';

export const READY_ORDER_STATUSES = ['Ready', 'Ready for delivery', 'Ready for shop'];

export const TERMINAL_ORDER_STATUSES = ['Delivered', 'Return', 'Store'];

export const LEGACY_STATUS_ALIASES = {
  Received: 'Waiting',
  'In Workshop': 'Preparing in workshop',
  'In Shop': 'Preparing in shop',
  'On Hold': 'Hold',
  'In Store': 'Store',
  'H Services': 'Ready for delivery',
  Cancel: 'Return',
  Cancelled: 'Return',
  Washing: 'Preparing in shop',
  Drying: 'Preparing in workshop',
  Ironing: 'Preparing in workshop',
};

export const normalizeOrderStatus = (status) =>
  LEGACY_STATUS_ALIASES[status] || status;

const pill = {
  waiting: 'status-pill bg-sky-500/10 text-sky-600 border-sky-500/15',
  shopPrep: 'status-pill bg-violet-500/10 text-violet-600 border-violet-500/15',
  workshopPrep: 'status-pill bg-indigo-500/10 text-indigo-600 border-indigo-500/15',
  hold: 'status-pill bg-amber-500/10 text-amber-600 border-amber-500/15',
  ready: 'status-pill bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  readyDelivery: 'status-pill bg-teal-500/10 text-teal-600 border-teal-500/15',
  readyShop: 'status-pill bg-lime-500/10 text-lime-700 border-lime-500/15',
  driver: 'status-pill bg-blue-500/10 text-blue-600 border-blue-500/15',
  delivered: 'status-pill bg-emerald-700/10 text-emerald-700 border-emerald-500/15',
  return: 'status-pill bg-orange-500/10 text-orange-600 border-orange-500/15',
  store: 'status-pill bg-slate-500/10 text-slate-600 border-slate-500/15',
};

export const orderStatusStyles = {
  Waiting: pill.waiting,
  'Preparing in shop': pill.shopPrep,
  'Preparing in workshop': pill.workshopPrep,
  Hold: pill.hold,
  Ready: pill.ready,
  'Ready for delivery': pill.readyDelivery,
  'Ready for shop': pill.readyShop,
  'With Driver': pill.driver,
  Delivered: pill.delivered,
  Return: pill.return,
  Store: pill.store,
  // Legacy labels — keep badges readable for old records
  Received: pill.waiting,
  'In Workshop': pill.workshopPrep,
  'In Shop': pill.shopPrep,
  'On Hold': pill.hold,
  'In Store': pill.store,
  'H Services': pill.readyDelivery,
  Cancel: pill.return,
  Cancelled: pill.return,
  Washing: pill.shopPrep,
  Drying: pill.workshopPrep,
  Ironing: pill.workshopPrep,
};

export const getOrderStatusStyle = (status) =>
  orderStatusStyles[status] ||
  orderStatusStyles[normalizeOrderStatus(status)] ||
  orderStatusStyles.Waiting;

export const isReadyOrderStatus = (status) =>
  READY_ORDER_STATUSES.includes(normalizeOrderStatus(status));

export const isTerminalOrderStatus = (status) =>
  TERMINAL_ORDER_STATUSES.includes(normalizeOrderStatus(status));

export const paymentStatusStyles = {
  Paid: 'status-pill bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  Partial: 'status-pill bg-sky-500/10 text-sky-600 border-sky-500/15',
  Pending: 'status-pill bg-amber-500/10 text-amber-600 border-amber-500/15',
};

export const pickupStatusStyles = {
  Assigned: 'status-pill bg-sky-500/10 text-sky-600 border-sky-500/15',
  'In Progress': 'status-pill bg-indigo-500/10 text-indigo-600 border-indigo-500/15',
  'Picked Up': 'status-pill bg-violet-500/10 text-violet-600 border-violet-500/15',
  Completed: 'status-pill bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
};

export const deliveryStatusStyles = {
  Assigned: 'status-pill bg-sky-500/10 text-sky-600 border-sky-500/15',
  'Out For Delivery': 'status-pill bg-indigo-500/10 text-indigo-600 border-indigo-500/15',
  Delivered: 'status-pill bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  Failed: 'status-pill bg-rose-500/10 text-rose-600 border-rose-500/15',
};

export const getNextOrderStatus = (current) => {
  const normalized = normalizeOrderStatus(current);
  const idx = ORDER_STATUSES.indexOf(normalized);
  if (idx < 0 || idx >= ORDER_STATUSES.length - 1) return current;
  return ORDER_STATUSES[idx + 1];
};

export const ORDER_STATUS_AR = {
  Waiting: 'قيد الانتظار',
  'Preparing in shop': 'قيد التحضير في المحل',
  'Preparing in workshop': 'قيد التحضير في الورشة',
  Hold: 'معلق',
  Ready: 'جاهز',
  'Ready for delivery': 'جاهز للتوصيل',
  'Ready for shop': 'جاهز للمحل',
  'With Driver': 'مع السائق',
  Delivered: 'تم التسليم',
  Return: 'مرتجع',
  Store: 'في المخزن',
};
