import React from 'react';
import { FiHome, FiPackage, FiTruck, FiCheckCircle, FiPlusCircle, FiList, FiUsers, FiMapPin, FiSettings, FiFileText } from 'react-icons/fi';
import RoleSidebar from './RoleSidebar';

const menuItems = [
  { label: 'Dashboard', icon: <FiHome />, to: '/delivery/dashboard', end: true, permission: 'view_dashboard' },
  { label: 'Customers', icon: <FiUsers />, to: '/delivery/customers', permission: 'view_customers' },
  { label: 'Make Invoice', icon: <FiPlusCircle />, to: '/delivery/make-invoice', permission: 'make_invoice' },
  { label: 'Change invoice status', icon: <FiList />, to: '/delivery/orders', permission: 'view_orders' },
  { label: 'Invoices', icon: <FiFileText />, to: '/delivery/invoices', permission: 'view_invoice_status' },
  { label: 'Home Service', icon: <FiTruck />, to: '/delivery/pickups', permission: 'view_pickups' },
  { label: 'Assigned Deliveries', icon: <FiPackage />, to: '/delivery/deliveries', permission: 'view_deliveries' },
  { label: 'Completed Jobs', icon: <FiCheckCircle />, to: '/delivery/completed', permission: 'view_completed_jobs' },
  { label: 'Drivers', icon: <FiUsers />, to: '/delivery/drivers', permission: 'view_drivers' },
  { label: 'Order Tracking', icon: <FiMapPin />, to: '/delivery/tracking', permission: 'view_order_tracking' },
  { label: 'Settings', icon: <FiSettings />, to: '/delivery/settings', permission: 'manage_settings' },
];

const DeliverySidebar = () => (
  <RoleSidebar
    menuItems={menuItems}
    roleLabel="Delivery operations"
    footerText={
      <>
        <p className="font-semibold text-primary">Route summary</p>
        <p className="mt-2">Pickups and deliveries assigned to you appear here in real time.</p>
      </>
    }
  />
);

export default DeliverySidebar;
