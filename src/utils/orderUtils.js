/** Matches Admin Orders page: list follows context array order (newest appended last). */
export const RECENT_ORDERS_LIMIT = 5;

export const getRecentOrders = (orders, limit = RECENT_ORDERS_LIMIT) => {
  if (!orders?.length) return [];
  return orders.slice(-limit);
};
