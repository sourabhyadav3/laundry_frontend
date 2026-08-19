import React, { useState, useEffect, useMemo } from 'react';
import { FiArrowLeft, FiSearch, FiLock, FiCheck, FiTrash2, FiX } from 'react-icons/fi';
import { 
  FiHome, 
  FiUsers, 
  FiList, 
  FiFileText, 
  FiPlusCircle, 
  FiTool, 
  FiTruck, 
  FiCreditCard, 
  FiUserCheck, 
  FiBarChart2, 
  FiSettings,
  FiPackage,
  FiCheckCircle,
  FiMapPin
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const defaultRoles = [
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

const permissionsList = [
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

const permissionGroups = {
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

const initialRolePermissions = {
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
    'manage_payments', 'view_services', 'view_logistics'
  ],
  'Delivery Staff': [
    'view_dashboard', 'view_logistics', 'view_invoice_status', 'change_invoice_status',
    'view_customers', 'manage_customers', 'make_invoice', 'view_orders'
  ],
};

const roleAllowedMenusWhitelist = {
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

const getPermissionIcon = (id) => {
  switch (id) {
    case 'view_dashboard':
      return <FiHome className="text-blue-500 text-lg" />;
    case 'view_customers':
      return <FiUsers className="text-emerald-500 text-lg" />;
    case 'make_invoice':
      return <FiPlusCircle className="text-indigo-500 text-lg" />;
    case 'view_orders':
      return <FiList className="text-orange-500 text-lg" />;
    case 'view_invoice_status':
      return <FiFileText className="text-purple-500 text-lg" />;
    case 'view_pickups':
      return <FiTruck className="text-pink-500 text-lg" />;
    case 'view_deliveries':
      return <FiPackage className="text-blue-500 text-lg" />;
    case 'view_completed_jobs':
      return <FiCheckCircle className="text-teal-500 text-lg" />;
    case 'view_drivers':
      return <FiUsers className="text-sky-500 text-lg" />;
    case 'view_order_tracking':
      return <FiMapPin className="text-violet-500 text-lg" />;
    case 'manage_settings':
      return <FiSettings className="text-slate-500 text-lg" />;
    case 'view_payments':
      return <FiCreditCard className="text-amber-500 text-lg" />;
    case 'manage_branches':
      return <FiMapPin className="text-rose-500 text-lg" />;
    case 'view_services':
      return <FiTool className="text-cyan-500 text-lg" />;
    case 'manage_staff':
      return <FiUserCheck className="text-red-500 text-lg" />;
    case 'view_reports':
      return <FiBarChart2 className="text-emerald-600 text-lg" />;
    default:
      return <FiFileText className="text-slate-400 text-lg" />;
  }
};



const runPermissionsMigration = () => {
  const migratedFlag = localStorage.getItem('spinclean_permissions_migrated_v5');
  if (migratedFlag) return;
  const saved = localStorage.getItem('spinclean_role_permissions_v3');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.keys(parsed).forEach(role => {
        const rolePerms = parsed[role] || [];
        if (rolePerms.includes('view_logistics')) {
          if (!rolePerms.includes('view_pickups')) rolePerms.push('view_pickups');
          if (!rolePerms.includes('view_deliveries')) rolePerms.push('view_deliveries');
          if (!rolePerms.includes('view_completed_jobs')) rolePerms.push('view_completed_jobs');
          if (!rolePerms.includes('view_drivers')) rolePerms.push('view_drivers');
        }
        if (rolePerms.includes('view_orders')) {
          if (!rolePerms.includes('view_order_tracking')) rolePerms.push('view_order_tracking');
        }
        if (rolePerms.includes('manage_settings')) {
          if (!rolePerms.includes('manage_branches')) rolePerms.push('manage_branches');
        }
        if ((role === 'Counter Staff' || role === 'Delivery Staff') && !rolePerms.includes('manage_settings')) {
          rolePerms.push('manage_settings');
        }
      });
      localStorage.setItem('spinclean_role_permissions_v3', JSON.stringify(parsed));
    } catch (e) {}
  }
  localStorage.setItem('spinclean_permissions_migrated_v5', 'true');
};
runPermissionsMigration();

const RolesPermissions = () => {
  const navigate = useNavigate();
  // const { staff = [] } = useContext(AdminStateContext) || {};
  
  // State for Roles
  const [roles, setRoles] = useState(() => {
    const saved = localStorage.getItem('spinclean_roles_list_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return defaultRoles;
  });

  // State for Permissions
  const [rolePermissions, setRolePermissions] = useState(() => {
    const saved = localStorage.getItem('spinclean_role_permissions_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return initialRolePermissions;
  });

  // Save roles and permissions to localStorage
  useEffect(() => {
    localStorage.setItem('spinclean_roles_list_v3', JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem('spinclean_role_permissions_v3', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  const [selectedRole, setSelectedRole] = useState('Admin');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Expand / Contract permissions for UI display
  const expandPermissions = (ids) => {
    const result = new Set();
    ids.forEach(id => {
      result.add(id); // Keep the UI key itself
      if (permissionGroups[id]) {
        permissionGroups[id].forEach(subId => result.add(subId));
      }
    });
    return Array.from(result);
  };

  const contractPermissions = (ids) => {
    if (!ids) return [];
    return permissionsList.map(p => p.id).filter(id => ids.includes(id));
  };

  // State of permissions checked in UI for the selected role
  const [currentPermissions, setCurrentPermissions] = useState([]);

  useEffect(() => {
    const rawPermissions = rolePermissions[selectedRole] || [];
    setCurrentPermissions(contractPermissions(rawPermissions));
  }, [selectedRole, rolePermissions]);

  const filteredPermissionsList = useMemo(() => {
    const whitelist = roleAllowedMenusWhitelist[selectedRole];
    if (!whitelist) return permissionsList;
    return permissionsList.filter(perm => whitelist.includes(perm.id));
  }, [selectedRole]);

  const handleTogglePermission = (permId) => {
    setCurrentPermissions(prev => 
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  const handleUpdatePermissions = () => {
    const expanded = expandPermissions(currentPermissions);
    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: expanded
    }));
    const language = localStorage.getItem('language') || 'en';
    toast.success(
      language === 'ar' 
        ? `${selectedRole} تم تحديث صلاحيات` 
        : `${selectedRole} permissions updated successfully`
    );
  };

  const handleCreateRoleSubmit = () => {
    const trimmedName = newRoleName.trim();
    if (!trimmedName) {
      toast.error('Role name is required');
      return;
    }
    if (roles.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('A role with this name already exists');
      return;
    }
    
    const predefinedColors = [
      'bg-purple-500/10 text-purple-600 border-purple-500/15',
      'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
      'bg-blue-500/10 text-blue-600 border-blue-500/15',
      'bg-indigo-500/10 text-indigo-600 border-indigo-500/15',
      'bg-pink-500/10 text-pink-600 border-pink-500/15',
      'bg-amber-500/10 text-amber-600 border-amber-500/15',
      'bg-cyan-500/10 text-cyan-600 border-cyan-500/15',
    ];

    const newRole = {
      name: trimmedName,
      description: newRoleDesc.trim() || 'Custom user role.',
      color: predefinedColors[roles.length % predefinedColors.length],
    };

    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    setRolePermissions(prev => ({
      ...prev,
      [trimmedName]: []
    }));

    setSelectedRole(trimmedName);
    setShowCreateModal(false);
    setNewRoleName('');
    setNewRoleDesc('');
    toast.success(`Role "${trimmedName}" created successfully!`);
  };

  const handleDeleteRole = (roleName) => {
    if (window.confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      setRoles(prev => prev.filter(r => r.name !== roleName));
      setRolePermissions(prev => {
        const copy = { ...prev };
        delete copy[roleName];
        return copy;
      });
      if (selectedRole === roleName) {
        setSelectedRole('Admin');
      }
      toast.success(`Role "${roleName}" deleted successfully`);
    }
  };

  // Filter roles by search query
  const filteredRoles = useMemo(() => {
    return roles.filter(role => 
      role.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [roles, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/staff')}
            className="rounded-2xl border border-border bg-surface p-2 text-secondary transition hover:text-primary"
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Roles & Permissions</h1>
            <p className="mt-1 text-sm text-secondary">Granular access control and permission management for all platform roles</p>
          </div>
        </div>
      </div>

      {/* Search roles bar */}
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-secondary">
          <FiSearch size={18} />
        </span>
        <input
          type="text"
          placeholder="Search roles.."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition shadow-sm"
        />
      </div>

      {/* Platform Roles Header & Grid */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-secondary uppercase tracking-wider">PLATFORM ROLES</span>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 animate-fadeIn">
          {filteredRoles.map((role) => {
            const isSelected = selectedRole === role.name;
            return (
              <div
                key={role.name}
                onClick={() => setSelectedRole(role.name)}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none relative group ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-500/5 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-border bg-surface hover:border-slate-400'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-600 text-white' 
                    : 'border-slate-300 bg-transparent'
                }`}>
                  {isSelected && <FiCheck size={14} />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary text-sm">{role.name}</h3>
                </div>
                {!['Admin', 'Counter Staff', 'Delivery Staff'].includes(role.name) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRole(role.name);
                    }}
                    className="absolute top-2 right-2 text-secondary hover:text-rose-600 p-1 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Delete custom role"
                  >
                    <FiTrash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Permissions Matrix Container */}
      <div className="surface-card border border-border rounded-2xl shadow-xl overflow-hidden mt-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-border gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-md">
              <FiLock size={22} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">{selectedRole} Permissions Matrix</h2>
              <p className="text-[10px] font-semibold text-secondary tracking-wider uppercase mt-0.5">
                CONFIGURE MODULE ACCESS & CAPABILITIES
              </p>
            </div>
          </div>
          
          <button
            onClick={handleUpdatePermissions}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow transition duration-200 text-sm w-full sm:w-auto text-center"
          >
            Update
          </button>
        </div>

        {/* Table Columns Header */}
        <div className="grid grid-cols-2 px-8 py-4 bg-slate-500/5 border-b border-border text-[10px] font-bold text-secondary tracking-wider uppercase">
          <div>MODULE / CAPABILITY</div>
          <div className="text-right">VISIBLE</div>
        </div>

        {/* Matrix Rows */}
        <div className="divide-y divide-border">
          {filteredPermissionsList.map((perm) => {
            const isVisible = currentPermissions.includes(perm.id);
            return (
              <div 
                key={perm.id} 
                onClick={() => handleTogglePermission(perm.id)}
                className="grid grid-cols-2 items-center px-8 py-5 hover:bg-slate-500/5 transition duration-150 cursor-pointer select-none"
              >
                <div className="flex items-center gap-4">
                  <span className="p-2 rounded-xl bg-slate-500/5">
                    {getPermissionIcon(perm.id)}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-primary text-sm">{perm.label}</span>
                    <span className="text-[9px] bg-slate-500/10 text-secondary px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                      {perm.category}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all ${
                      isVisible
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-transparent hover:border-slate-400'
                    }`}
                  >
                    {isVisible && <FiCheck size={14} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Custom Role Popup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-primary">Create Custom Role</h3>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoleName('');
                  setNewRoleDesc('');
                }}
                className="text-secondary hover:text-primary transition"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-bold text-secondary uppercase">Role Name</label>
              <input
                type="text"
                placeholder="e.g. HR Manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm transition"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-bold text-secondary uppercase">Description</label>
              <textarea
                placeholder="Describe role responsibilities..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                rows="3"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm resize-none transition"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoleName('');
                  setNewRoleDesc('');
                }}
                className="px-5 py-2.5 border border-border hover:bg-slate-500/5 text-secondary rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoleSubmit}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPermissions;
