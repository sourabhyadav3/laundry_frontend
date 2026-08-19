const firstNames = [
  'Alice', 'Bob', 'Carol', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
  'Karen', 'Leo', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rita', 'Sam', 'Tina',
  'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zane', 'Amber', 'Blake', 'Chloe', 'Derek',
];

const lastNames = [
  'Johnson', 'Smith', 'Davis', 'Wilson', 'Martinez', 'Turner', 'Lee', 'Miller', 'Brown', 'Garcia',
  'Rodriguez', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis',
];

const cities = [
  { city: 'New York', state: 'NY', zip: '10001' },
  { city: 'Los Angeles', state: 'CA', zip: '90001' },
  { city: 'Chicago', state: 'IL', zip: '60601' },
  { city: 'Houston', state: 'TX', zip: '77001' },
  { city: 'Phoenix', state: 'AZ', zip: '85001' },
];

const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Maple Ave', 'Cedar Dr', 'Birch St', 'Lake View'];

const serviceTypes = [
  'Wash & Fold', 'Dry Cleaning', 'Ironing', 'Wash & Iron', 'Premium Care', 'Express Wash',
];

const orderStatuses = [
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
const paymentStatuses = ['Paid', 'Pending', 'Partial'];
const paymentMethods = ['Cash', 'Card', 'Link', 'Wamd'];

const pickupStatuses = ['Assigned', 'In Progress', 'Picked Up', 'Completed'];
const deliveryStatuses = ['Assigned', 'Out For Delivery', 'Delivered', 'Failed'];

const itemNames = [
  'Casual Shirts', 'Dress Pants', 'Winter Coat', 'Office Shirts', 'Silk Dress',
  'Work Uniforms', 'Bed Sheets', 'Towels', 'Suits', 'Jeans',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const formatDateOffset = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const generateCustomers = (count) =>
  Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    const first = firstNames[i % firstNames.length];
    const last = lastNames[i % lastNames.length];
    const loc = cities[i % cities.length];
    const streetNum = 100 + id * 7;
    return {
      id,
      name: `${first} ${last}`,
      phone: `555-${String(1000 + id).slice(-4)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
      address: `${streetNum} ${streets[i % streets.length]}, ${loc.city}, ${loc.state} ${loc.zip}`,
      totalOrders: rand(1, 25),
      balance: Math.random() > 0.6 ? Math.round(Math.random() * 80 * 100) / 100 : 0,
      registrationDate: formatDateOffset(rand(30, 400)),
      status: Math.random() > 0.1 ? 'Active' : 'Inactive',
      orderHistory: [],
      notes: i % 5 === 0 ? 'Preferred customer' : '',
      areaName: i % 3 === 0 ? 'Salmiya' : i % 3 === 1 ? 'Hawally' : 'Kuwait City',
      partNo: String(rand(1, 15)),
      street: String(rand(1, 40)),
      jadda: String(rand(1, 10)),
      houseNo: String(rand(1, 100)),
      levelNo: String(rand(1, 5)),
      flatNo: String(rand(1, 20)),
    };
  });

export const generateOrders = (count, customers) =>
  Array.from({ length: count }, (_, i) => {
    const id = 101 + i;
    const customer = customers[i % customers.length];
    const qty = rand(1, 12);
    const unitPrice = Math.round((rand(15, 80) / 10) * 10) / 10;
    const amount = Math.round(qty * unitPrice * 100) / 100;
    const tax = Math.round(amount * 0.1 * 100) / 100;
    const status = orderStatuses[i % orderStatuses.length];
    const paymentStatus = paymentStatuses[i % paymentStatuses.length];
    const daysAgo = rand(0, 29);

    return {
      id,
      number: `ORD-${String(id).padStart(5, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      serviceType: serviceTypes[i % serviceTypes.length],
      status,
      paymentStatus,
      amount,
      tax,
      totalAmount: Math.round((amount + tax) * 100) / 100,
      date: formatDateOffset(daysAgo),
      pickupDate: formatDateOffset(daysAgo),
      deliveryDate: formatDateOffset(Math.max(0, daysAgo - 2)),
      itemDetails: [{ name: pick(itemNames), quantity: qty, unitPrice }],
      notes: i % 7 === 0 ? 'Handle with care' : '',
      createdBy: 'Counter Staff',
    };
  });

export const generatePayments = (count, orders) =>
  Array.from({ length: count }, (_, i) => {
    const order = orders[i % orders.length];
    return {
      id: i + 1,
      orderId: order.id,
      orderNumber: order.number,
      customer: order.customerName,
      amount: order.totalAmount,
      method: paymentMethods[i % paymentMethods.length],
      status: order.paymentStatus,
      date: order.date,
    };
  });

export const enhancePickups = (pickups, customers) =>
  pickups.map((p, i) => {
    const customer = customers.find((c) => c.name === p.customer) || customers[i % customers.length];
    const statusMap = {
      Scheduled: 'Assigned',
      Assigned: 'Assigned',
      'Picked Up': 'Picked Up',
      Completed: 'Completed',
    };
    const status = statusMap[p.status] || pickupStatuses[i % pickupStatuses.length];

    return {
      ...p,
      pickupId: p.requestId || `PKP-${String(i + 1).padStart(3, '0')}`,
      contactNumber: customer?.phone || '555-0000',
      status,
      orderNumber: `ORD-${String(101 + (i % 50)).padStart(5, '0')}`,
      serviceType: serviceTypes[i % serviceTypes.length],
      areaName: customer?.areaName || 'Salmiya',
      partNo: customer?.partNo || '12',
      street: customer?.street || '5',
      jadda: customer?.jadda || '2',
      houseNo: customer?.houseNo || '14',
      levelNo: customer?.levelNo || '3',
      flatNo: customer?.flatNo || '12',
    };
  });

export const enhanceDeliveries = (deliveries, customers, orders) =>
  deliveries.map((d, i) => {
    const customer = customers.find((c) => c.name === d.customer) || customers[i % customers.length];
    const order = orders[i % orders.length];
    const statusMap = {
      Scheduled: 'Assigned',
      'Out for Delivery': 'Out For Delivery',
      Delivered: 'Delivered',
      Failed: 'Failed',
    };

    return {
      ...d,
      contactNumber: customer?.phone || '555-0000',
      status: statusMap[d.status] || deliveryStatuses[i % deliveryStatuses.length],
      orderNumber: order?.number || `ORD-${String(101 + i).padStart(5, '0')}`,
      serviceType: order?.serviceType || 'Wash & Fold',
      areaName: customer?.areaName || 'Salmiya',
      partNo: customer?.partNo || '12',
      street: customer?.street || '5',
      jadda: customer?.jadda || '2',
      houseNo: customer?.houseNo || '14',
      levelNo: customer?.levelNo || '3',
      flatNo: customer?.flatNo || '12',
    };
  });

export const generateCompletedJobs = (pickups, deliveries) => {
  const completedPickups = pickups
    .filter((p) => p.status === 'Completed' || p.status === 'Picked Up')
    .map((p) => ({
      id: `job-p-${p.id}`,
      jobId: p.pickupId || p.requestId,
      customerName: p.customer,
      jobType: 'Pickup',
      completionDate: p.pickupDate,
      status: p.status === 'Picked Up' ? 'Picked Up' : 'Completed',
    }));

  const completedDeliveries = deliveries
    .filter((d) => d.status === 'Delivered' || d.status === 'Failed')
    .map((d) => ({
      id: `job-d-${d.id}`,
      jobId: d.deliveryId,
      customerName: d.customer,
      jobType: 'Delivery',
      completionDate: d.deliveryDate,
      status: d.status,
    }));

  return [...completedPickups, ...completedDeliveries].sort(
    (a, b) => new Date(b.completionDate) - new Date(a.completionDate)
  );
};
