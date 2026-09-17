import React, { useState, useEffect, useMemo, useContext } from 'react';
import { FiArrowLeft, FiSearch, FiLock, FiCheck, FiTrash2, FiX, FiUser, FiRefreshCw } from 'react-icons/fi';
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
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import { 
  defaultRoles, 
  permissionsList, 
  permissionGroups, 
  initialRolePermissions, 
  roleAllowedMenusWhitelist,
  getPermissionsForRole,
  getUserCustomPermissions,
  saveUserPermissions,
  deleteUserPermissions,
  getUserEffectivePermissions
} from '../../utils/permissionUtils';

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

const RolesPermissions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { staff = [], updateStaff } = useContext(AdminStateContext) || {};
  
  // Read optional query param ?userId=...
  const queryParams = new URLSearchParams(location.search);
  const initialUserIdParam = queryParams.get('userId');

  // Mode: 'roles' (Role Defaults) vs 'users' (User-Based)
  const [activeTab, setActiveTab] = useState(initialUserIdParam ? 'users' : 'roles');

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = storedUser.role || 'Admin';

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

  // State for Role Permissions
  const [rolePermissions, setRolePermissions] = useState(() => {
    const saved = localStorage.getItem('spinclean_role_permissions_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return initialRolePermissions;
  });

  // Selected state
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Staff for User-Based mode
  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    if (initialUserIdParam) return initialUserIdParam;
    return staff.length > 0 ? (staff[0].id || staff[0]._id || staff[0].username) : '';
  });

  const selectedStaffObj = useMemo(() => {
    if (!selectedStaffId) return staff[0] || null;
    return staff.find(s => String(s.id || s._id || s.username) === String(selectedStaffId)) || staff[0] || null;
  }, [staff, selectedStaffId]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Expand / Contract permissions for UI display
  const expandPermissions = (ids) => {
    const result = new Set();
    ids.forEach(id => {
      result.add(id);
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

  // State of checked permissions in UI
  const [currentPermissions, setCurrentPermissions] = useState([]);

  // Load permissions when switching roles or users
  useEffect(() => {
    if (activeTab === 'roles') {
      const rawPermissions = rolePermissions[selectedRole] || [];
      setCurrentPermissions(contractPermissions(rawPermissions));
    } else if (activeTab === 'users' && selectedStaffObj) {
      const effective = getUserEffectivePermissions(selectedStaffObj);
      setCurrentPermissions(contractPermissions(effective));
    }
  }, [activeTab, selectedRole, rolePermissions, selectedStaffObj]);

  const hasCustomUserOverride = useMemo(() => {
    if (!selectedStaffObj) return false;
    return Boolean(getUserCustomPermissions(selectedStaffObj));
  }, [selectedStaffObj]);

  const filteredPermissionsList = useMemo(() => {
    if (activeTab === 'users' && selectedStaffObj) {
      const staffRole = selectedStaffObj.role?.name || selectedStaffObj.role || 'Admin';
      const whitelist = roleAllowedMenusWhitelist[staffRole];
      if (!whitelist) return permissionsList;
      return permissionsList.filter(perm => whitelist.includes(perm.id));
    }
    const whitelist = roleAllowedMenusWhitelist[selectedRole];
    if (!whitelist) return permissionsList;
    return permissionsList.filter(perm => whitelist.includes(perm.id));
  }, [activeTab, selectedRole, selectedStaffObj]);

  const handleTogglePermission = (permId) => {
    setCurrentPermissions(prev => 
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  // Save changes
  const handleUpdatePermissions = async () => {
    const expanded = expandPermissions(currentPermissions);

    if (activeTab === 'roles') {
      const updated = {
        ...rolePermissions,
        [selectedRole]: expanded
      };
      setRolePermissions(updated);
      localStorage.setItem('spinclean_role_permissions_v3', JSON.stringify(updated));
      toast.success(`${selectedRole} default permissions updated successfully!`);
    } else if (activeTab === 'users' && selectedStaffObj) {
      saveUserPermissions(selectedStaffObj, expanded);
      
      // Update backend if updateStaff is available
      if (updateStaff && (selectedStaffObj.id || selectedStaffObj._id)) {
        try {
          await updateStaff(selectedStaffObj.id || selectedStaffObj._id, { customPermissions: expanded });
        } catch (e) {}
      }

      toast.success(`Custom permissions for "${selectedStaffObj.name || selectedStaffObj.username}" saved successfully!`);
    }
  };

  // Reset user override to role default
  const handleResetUserToDefault = () => {
    if (!selectedStaffObj) return;
    deleteUserPermissions(selectedStaffObj);
    const staffRole = selectedStaffObj.role?.name || selectedStaffObj.role || 'Admin';
    const defaultRolePerms = getPermissionsForRole(staffRole);
    setCurrentPermissions(contractPermissions(defaultRolePerms));
    toast.info(`Permissions for "${selectedStaffObj.name || selectedStaffObj.username}" reset to ${staffRole} default.`);
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
    localStorage.setItem('spinclean_roles_list_v3', JSON.stringify(updatedRoles));
    
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
      const updated = roles.filter(r => r.name !== roleName);
      setRoles(updated);
      localStorage.setItem('spinclean_roles_list_v3', JSON.stringify(updated));
      setRolePermissions(prev => {
        const copy = { ...prev };
        delete copy[roleName];
        localStorage.setItem('spinclean_role_permissions_v3', JSON.stringify(copy));
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

  // Filter staff by search query
  const filteredStaffList = useMemo(() => {
    return staff.filter(s => 
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (userRole === 'Super Admin') navigate('/superadmin/dashboard');
              else navigate('/admin/staff');
            }}
            className="rounded-2xl border border-border bg-surface p-2 text-secondary transition hover:text-primary"
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Roles & Permissions</h1>
            <p className="mt-1 text-sm text-secondary">
              Granular access control and permission management for platform roles and individual users
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs: Role Defaults vs User-Based */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition ${
            activeTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-surface border border-border text-secondary hover:text-primary'
          }`}
        >
          <FiUsers size={16} />
          <span>Role Defaults (Global)</span>
        </button>

        {userRole === 'Super Admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-surface border border-border text-secondary hover:text-primary'
            }`}
          >
            <FiUser size={16} />
            <span>Individual User Permissions (Per-User)</span>
          </button>
        )}
      </div>

      {/* TAB 1: Role Defaults Mode */}
      {activeTab === 'roles' && (
        <>
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
        </>
      )}

      {/* TAB 2: User-Based Permissions Mode */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="surface-card border border-border p-5 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">SELECT STAFF MEMBER</span>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase mb-1">Staff User</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  {filteredStaffList.map(s => (
                    <option key={s.id || s._id || s.username} value={s.id || s._id || s.username}>
                      {s.name || s.username} — ({s.role?.name || s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedStaffObj && (
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 bg-surface-alt p-3.5 rounded-xl border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-sm">{selectedStaffObj.name || selectedStaffObj.username}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        {selectedStaffObj.role?.name || selectedStaffObj.role || 'Staff'}
                      </span>
                    </div>
                    <div className="text-xs text-secondary mt-0.5">
                      Username: <span className="font-semibold text-primary">{selectedStaffObj.username}</span> | Email: <span className="font-semibold text-primary">{selectedStaffObj.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasCustomUserOverride ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span>✨</span>
                        <span>Custom User Permissions Active</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-secondary border border-border/50 flex items-center gap-1">
                        <span>🛡️</span>
                        <span>Inheriting Role Defaults</span>
                      </span>
                    )}

                    {hasCustomUserOverride && (
                      <button
                        onClick={handleResetUserToDefault}
                        className="px-3 py-1 bg-surface hover:bg-slate-500/10 text-rose-600 border border-border rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        title="Revert to role default permissions"
                      >
                        <FiRefreshCw size={12} />
                        <span>Reset to Role</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Matrix Container */}
      <div className="surface-card border border-border rounded-2xl shadow-xl overflow-hidden mt-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-border gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-md">
              <FiLock size={22} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">
                {activeTab === 'roles' 
                  ? `${selectedRole} Default Permissions Matrix`
                  : `Permissions for ${selectedStaffObj ? (selectedStaffObj.name || selectedStaffObj.username) : 'Selected User'}`
                }
              </h2>
              <p className="text-[10px] font-semibold text-secondary tracking-wider uppercase mt-0.5">
                {activeTab === 'roles' 
                  ? 'CONFIGURE DEFAULT MODULE ACCESS FOR ALL USERS WITH THIS ROLE' 
                  : 'CONFIGURE INDIVIDUAL MODULE ACCESS OVERRIDE FOR THIS USER'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={handleUpdatePermissions}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow transition duration-200 text-sm w-full sm:w-auto text-center"
          >
            {activeTab === 'roles' ? 'Update Role Defaults' : 'Save User Permissions'}
          </button>
        </div>

        {/* Table Columns Header */}
        <div className="grid grid-cols-2 px-8 py-4 bg-slate-500/5 border-b border-border text-[10px] font-bold text-secondary tracking-wider uppercase">
          <div>MODULE / CAPABILITY</div>
          <div className="text-right">ACCESS ALLOWED</div>
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
