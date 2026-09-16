// src/utils/permissionUtils.js

export const defaultRoles = [
  {
    name: 'Admin',
    description: 'Full system administrator with complete access.',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/15',
  },
  {
    name: 'Counter Staff',
    description: 'Counter desk operations, customers, new orders, invoices and payments.',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  },
  {
    name: 'Delivery Staff',
    description: 'Logistics, route summaries, pickups and deliveries.',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/15',
  },
];

export const permissionsList = [
  { id: 'view_dashboard', label: 'Dashboard', category: 'General' },
  { id: 'view_customers', label: 'Customers', category: 'General' },
  { id: 'make_invoice', label: 'Make Invoice', category: 'Orders' },
  { id: 'view_orders', label: 'Change invoice status', category: 'Orders' },
  { id: 'view_invoice_status', label: 'Invoices', category: 'Orders' },
  { id: 'view_pickups', label: 'Home Service', category: 'Logistics' },
  { id: 'view_deliveries', label: 'Assigned Deliveries', category: 'Logistics' },
  { id: 'view_completed_jobs', label: 'Completed Jobs', category: 'Logistics' },
  { id: 'view_drivers', label: 'Drivers', category: 'Logistics' },
  { id: 'view_order_tracking', label: 'Order Tracking', category: 'Orders' },
  { id: 'manage_settings', label: 'Settings', category: 'Administration' },
  { id: 'view_payments', label: 'Payments', category: 'Financials' },
  { id: 'manage_branches', label: 'Branches', category: 'Administration' },
  { id: 'view_services', label: 'Laundry Services', category: 'Services' },
  { id: 'manage_staff', label: 'Staff Management', category: 'Administration' },
  { id: 'view_reports', label: 'Reports', category: 'Analytics' },
];

export const permissionGroups = {
  'view_dashboard': ['view_dashboard'],
  'view_customers': ['view_customers', 'manage_customers'],
  'make_invoice': ['make_invoice', 'create_orders'],
  'view_orders': ['view_orders', 'manage_orders', 'change_invoice_status'],
  'view_invoice_status': ['view_invoice_status', 'view_invoice_details'],
  'view_pickups': ['view_logistics', 'manage_logistics', 'manage_pickups'],
  'view_deliveries': ['view_logistics', 'manage_logistics', 'manage_deliveries'],
  'view_completed_jobs': ['view_logistics'],
  'view_drivers': ['view_logistics', 'manage_staff'],
  'view_order_tracking': ['view_orders'],
  'manage_settings': ['manage_settings'],
  'view_payments': ['view_payments', 'manage_payments'],
  'manage_branches': ['manage_settings'],
  'view_services': ['view_services', 'manage_services'],
  'manage_staff': ['manage_staff', 'assign_roles'],
  'view_reports': ['view_reports'],
};

export const initialRolePermissions = {
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
    'manage_payments', 'view_services', 'view_logistics', 'view_order_tracking', 'manage_settings'
  ],
  'Delivery Staff': [
    'view_dashboard', 'view_logistics', 'view_invoice_status', 'change_invoice_status',
    'view_customers', 'manage_customers', 'make_invoice', 'view_orders', 'view_pickups',
    'view_deliveries', 'view_completed_jobs', 'view_drivers', 'view_order_tracking', 'manage_settings'
  ],
};

export const roleAllowedMenusWhitelist = {
  'Admin': [
    'view_dashboard', 'view_customers', 'view_orders', 'view_invoice_status', 
    'manage_branches', 'make_invoice', 'view_services', 'view_pickups', 
    'view_drivers', 'view_payments', 'manage_staff', 'view_reports', 'manage_settings'
  ],
  'Counter Staff': [
    'view_dashboard', 'view_customers', 'make_invoice', 'view_orders', 
    'view_invoice_status', 'view_payments', 'view_pickups', 'view_order_tracking', 
    'manage_settings'
  ],
  'Delivery Staff': [
    'view_dashboard', 'view_customers', 'make_invoice', 'view_orders', 
    'view_invoice_status', 'view_pickups', 'view_deliveries', 'view_completed_jobs', 
    'view_drivers', 'view_order_tracking', 'manage_settings'
  ]
};

export const getPermissionsForRole = (role) => {
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
  return initialRolePermissions[role] || [];
};

export const getUserKey = (user) => {
  if (!user) return null;
  return String(user.id || user._id || user.userId || user.username || '').trim();
};

export const getAllUserPermissions = () => {
  try {
    const saved = localStorage.getItem('spinclean_user_permissions_v1');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

export const getUserCustomPermissions = (userOrId) => {
  const uKey = typeof userOrId === 'string' ? userOrId : getUserKey(userOrId);
  if (!uKey) return null;
  const all = getAllUserPermissions();
  return all[uKey] || null;
};

export const saveUserPermissions = (userOrId, permissions) => {
  const uKey = typeof userOrId === 'string' ? userOrId : getUserKey(userOrId);
  if (!uKey) return;
  const all = getAllUserPermissions();
  all[uKey] = permissions;
  localStorage.setItem('spinclean_user_permissions_v1', JSON.stringify(all));
};

export const deleteUserPermissions = (userOrId) => {
  const uKey = typeof userOrId === 'string' ? userOrId : getUserKey(userOrId);
  if (!uKey) return;
  const all = getAllUserPermissions();
  delete all[uKey];
  localStorage.setItem('spinclean_user_permissions_v1', JSON.stringify(all));
};

export const getUserEffectivePermissions = (user) => {
  if (!user) {
    try {
      const stored = localStorage.getItem('user');
      if (stored) user = JSON.parse(stored);
    } catch (e) {}
  }
  if (!user) return [];

  const userRole = user.role?.name || user.role || 'Admin';
  if (userRole === 'Super Admin') {
    return permissionsList.map(p => p.id).concat(['full_access', 'all']);
  }

  // 1. Check user-specific override
  const customPerms = getUserCustomPermissions(user);
  if (customPerms && Array.isArray(customPerms)) {
    return customPerms;
  }

  // 2. Check user model customPermissions if present
  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    return user.customPermissions;
  }

  // 3. Fallback to Role Permissions
  return getPermissionsForRole(userRole);
};

export const hasUserPermission = (user, permissionId) => {
  const effective = getUserEffectivePermissions(user);
  if (effective.includes('full_access') || effective.includes('all')) return true;
  if (!permissionId) return true;

  if (effective.includes(permissionId)) return true;

  // Check sub-permissions mapping
  const mappedSubPerms = permissionGroups[permissionId] || [];
  return mappedSubPerms.some(sub => effective.includes(sub));
};
