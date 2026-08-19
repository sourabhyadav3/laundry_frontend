export const ALL_MODULES = [
  // Super Admin panel
  {
    id: 'sa_dashboard',
    label: 'Dashboard',
    category: 'Super Admin',
    route: '/superadmin/dashboard',
    supportedActions: ['view']
  },
  {
    id: 'sa_users',
    label: 'User & Role Management',
    category: 'Super Admin',
    route: '/superadmin/users',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'sa_branches',
    label: 'Branches',
    category: 'Super Admin',
    route: '/superadmin/branches',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'sa_services',
    label: 'Laundry Services',
    category: 'Super Admin',
    route: '/superadmin/services',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'sa_audit_logs',
    label: 'Audit Logs',
    category: 'Super Admin',
    route: '/superadmin/audit-logs',
    supportedActions: ['view']
  },
  {
    id: 'sa_reports',
    label: 'Reports',
    category: 'Super Admin',
    route: '/superadmin/reports',
    supportedActions: ['view', 'export']
  },
  {
    id: 'sa_settings',
    label: 'Settings',
    category: 'Super Admin',
    route: '/superadmin/settings',
    supportedActions: ['view', 'edit']
  },

  // Admin panel
  {
    id: 'admin_dashboard',
    label: 'Dashboard',
    category: 'Admin',
    route: '/admin/dashboard',
    supportedActions: ['view']
  },
  {
    id: 'admin_customers',
    label: 'Customers',
    category: 'Admin',
    route: '/admin/customers',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export']
  },
  {
    id: 'admin_orders',
    label: 'Change invoice status',
    category: 'Admin',
    route: '/admin/orders',
    supportedActions: ['view', 'create', 'edit', 'delete', 'print', 'export', 'approve']
  },
  {
    id: 'admin_invoices',
    label: 'Invoices',
    category: 'Admin',
    route: '/admin/invoices',
    supportedActions: ['view', 'print', 'export']
  },
  {
    id: 'admin_branches',
    label: 'Branches',
    category: 'Admin',
    route: '/admin/branches',
    supportedActions: ['view', 'create', 'edit']
  },
  {
    id: 'admin_make_invoice',
    label: 'Make Invoices',
    category: 'Admin',
    route: '/admin/make-invoice',
    supportedActions: ['view', 'create']
  },
  {
    id: 'admin_services',
    label: 'Laundry Services',
    category: 'Admin',
    route: '/admin/services',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'admin_pickups',
    label: 'Home Service',
    category: 'Admin',
    route: '/admin/pickups',
    supportedActions: ['view', 'create', 'edit', 'approve']
  },
  {
    id: 'admin_drivers',
    label: 'Drivers',
    category: 'Admin',
    route: '/admin/drivers',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'admin_payments',
    label: 'Payments',
    category: 'Admin',
    route: '/admin/payments',
    supportedActions: ['view', 'create', 'export']
  },
  {
    id: 'admin_staff',
    label: 'Staff Management',
    category: 'Admin',
    route: '/admin/staff',
    supportedActions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'admin_reports',
    label: 'Reports',
    category: 'Admin',
    route: '/admin/reports',
    supportedActions: ['view', 'export']
  },
  {
    id: 'admin_settings',
    label: 'Settings',
    category: 'Admin',
    route: '/admin/settings',
    supportedActions: ['view', 'edit']
  },

  // Counter Staff panel
  {
    id: 'counter_dashboard',
    label: 'Dashboard',
    category: 'Counter Staff',
    route: '/counter/dashboard',
    supportedActions: ['view']
  },
  {
    id: 'counter_customers',
    label: 'Customers',
    category: 'Counter Staff',
    route: '/counter/customers',
    supportedActions: ['view', 'create', 'edit']
  },
  {
    id: 'counter_make_invoice',
    label: 'Make Invoice',
    category: 'Counter Staff',
    route: '/counter/orders/new',
    supportedActions: ['view', 'create']
  },
  {
    id: 'counter_orders',
    label: 'Change invoice status',
    category: 'Counter Staff',
    route: '/counter/orders',
    supportedActions: ['view', 'create', 'edit', 'print']
  },
  {
    id: 'counter_invoices',
    label: 'Invoices',
    category: 'Counter Staff',
    route: '/counter/invoices',
    supportedActions: ['view', 'print']
  },
  {
    id: 'counter_payments',
    label: 'Payments',
    category: 'Counter Staff',
    route: '/counter/payments',
    supportedActions: ['view', 'create']
  },
  {
    id: 'counter_pickups',
    label: 'Home Service',
    category: 'Counter Staff',
    route: '/counter/pickups',
    supportedActions: ['view', 'create', 'edit', 'approve']
  },
  {
    id: 'counter_tracking',
    label: 'Order Tracking',
    category: 'Counter Staff',
    route: '/counter/tracking',
    supportedActions: ['view']
  },
  {
    id: 'counter_settings',
    label: 'Settings',
    category: 'Counter Staff',
    route: '/counter/settings',
    supportedActions: ['view', 'edit']
  },

  // Delivery Staff panel
  {
    id: 'delivery_dashboard',
    label: 'Dashboard',
    category: 'Delivery Staff',
    route: '/delivery/dashboard',
    supportedActions: ['view']
  },
  {
    id: 'delivery_make_invoice',
    label: 'Make Invoice',
    category: 'Delivery Staff',
    route: '/delivery/make-invoice',
    supportedActions: ['view', 'create']
  },
  {
    id: 'delivery_pickups',
    label: 'Home Services',
    category: 'Delivery Staff',
    route: '/delivery/pickups',
    supportedActions: ['view', 'edit']
  },
  {
    id: 'delivery_deliveries',
    label: 'Assigned Deliveries',
    category: 'Delivery Staff',
    route: '/delivery/deliveries',
    supportedActions: ['view', 'edit']
  },
  {
    id: 'delivery_completed',
    label: 'Completed Jobs',
    category: 'Delivery Staff',
    route: '/delivery/completed',
    supportedActions: ['view']
  },
  {
    id: 'delivery_orders',
    label: 'Order',
    category: 'Delivery Staff',
    route: '/delivery/orders',
    supportedActions: ['view']
  },
  {
    id: 'delivery_drivers',
    label: 'Driver',
    category: 'Delivery Staff',
    route: '/delivery/drivers',
    supportedActions: ['view']
  },
  {
    id: 'delivery_tracking',
    label: 'Orders Tracking',
    category: 'Delivery Staff',
    route: '/delivery/tracking',
    supportedActions: ['view']
  },
  {
    id: 'delivery_settings',
    label: 'Settings',
    category: 'Delivery Staff',
    route: '/delivery/settings',
    supportedActions: ['view', 'edit']
  }
];
