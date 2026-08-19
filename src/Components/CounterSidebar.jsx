import React from 'react';
import {
  FiHome,
  FiUsers,
  FiPlusCircle,
  FiList,
  FiFileText,
  FiCreditCard,
  FiMapPin,
  FiSettings,
  FiTruck,
} from 'react-icons/fi';
import RoleSidebar from './RoleSidebar';

const menuItems = [
  { label: 'Dashboard', icon: <FiHome />, to: '/counter/dashboard', end: true, permission: 'view_dashboard' },
  { label: 'Customers', icon: <FiUsers />, to: '/counter/customers', permission: 'view_customers' },
  { label: 'Make Invoice', icon: <FiPlusCircle />, to: '/counter/orders/new', permission: 'make_invoice' },
  { label: 'Change invoice status', icon: <FiList />, to: '/counter/orders', end: true, permission: 'view_orders' },
  { label: 'Invoices', icon: <FiFileText />, to: '/counter/invoices', permission: 'view_invoice_status' },
  { label: 'Payments', icon: <FiCreditCard />, to: '/counter/payments', permission: 'view_payments' },
  { label: 'Home Service', icon: <FiTruck />, to: '/counter/pickups', permission: 'view_pickups' },
  { label: 'Order Tracking', icon: <FiMapPin />, to: '/counter/tracking', permission: 'view_order_tracking' },
  { label: 'Settings', icon: <FiSettings />, to: '/counter/settings', permission: 'manage_settings' },
];

const CounterSidebar = () => (
  <RoleSidebar
    menuItems={menuItems}
    roleLabel="Counter operations"
    footerText={
      <>
        <p className="font-semibold text-primary">Counter desk</p>
        <p className="mt-2">Process walk-ins, payments, and order status updates from one place.</p>
      </>
    }
  />
);

export default CounterSidebar;
