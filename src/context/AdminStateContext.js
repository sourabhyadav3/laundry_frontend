// src/context/AdminStateContext.js
import React, { createContext, useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import {
  mockRoles,
} from '../data/mockData';

export const GARMENT_CATALOG = [
  // Row 1
  { name: 'Dishdasha', key: 'dishdasha', price: 1.5, icon: '🥋', category: 'traditional' },
  { name: 'Dishdasha (Premium)', key: 'dishdashaPremium', price: 2.5, icon: '🥋', category: 'traditional' },
  { name: 'Small Dishdasha', key: 'smallDishdasha', price: 1.0, icon: '🥋', category: 'traditional' },
  { name: 'Small Dishdasha (Premium)', key: 'smallDishdashaPremium', price: 1.75, icon: '🥋', category: 'traditional' },
  { name: 'Ghotraa', key: 'ghotraa', price: 0.5, icon: '👳', category: 'traditional' },
  { name: 'Shmage', key: 'shmage', price: 0.75, icon: '🧣', category: 'traditional' },
  { name: 'Shmage (Special)', key: 'shmageSpecial', price: 1.25, icon: '🧣', category: 'traditional' },
  { name: 'Gahfiya', key: 'gahfiya', price: 0.25, icon: '🧢', category: 'traditional' },
  { name: 'Shirt', key: 'shirt', price: 0.75, icon: '👔', category: 'casual' },
  // Row 2
  { name: 'Bisht', key: 'bisht', price: 3.5, icon: '🧥', category: 'traditional' },
  { name: 'Trousers', key: 'trousers', price: 0.75, icon: '👖', category: 'casual' },
  { name: 'Jacket', key: 'jacket', price: 1.5, icon: '🧥', category: 'outerwear' },
  { name: 'BIG Jacket', key: 'bigJacket', price: 2.5, icon: '🧥', category: 'outerwear' },
  { name: 'Carpet', key: 'carpet', price: 5.0, icon: '🧹', category: 'household' },
  { name: 'Military Suit', key: 'militarySuit', price: 3.0, icon: '🎖️', category: 'casual' },
  { name: 'Cap', key: 'cap', price: 0.5, icon: '🧢', category: 'casual' },
  { name: 'Coat', key: 'coat', price: 2.0, icon: '🧥', category: 'outerwear' },
  { name: 'Suit', key: 'suit', price: 2.5, icon: '🤵', category: 'casual' },
  // Row 3
  { name: 'Small Trousers', key: 'smallTrousers', price: 0.5, icon: '👖', category: 'casual' },
  { name: 'Dress', key: 'dress', price: 1.5, icon: '👗', category: 'casual' },
  { name: 'School Dress', key: 'schoolDress', price: 1.0, icon: '👗', category: 'casual' },
  { name: 'Dressing Gown', key: 'dressingGown', price: 2.0, icon: '👘', category: 'casual' },
  { name: 'Evening Dress', key: 'eveningDress', price: 3.0, icon: '👗', category: 'casual' },
  { name: 'Wedding Dress', key: 'weddingDress', price: 15.0, icon: '👰', category: 'special' },
  { name: 'Large Blouse', key: 'largeBlouse', price: 1.25, icon: '👚', category: 'casual' },
  { name: 'Skirt', key: 'skirt', price: 1.0, icon: '👗', category: 'casual' },
  { name: 'Small Skirt', key: 'smallSkirt', price: 0.75, icon: '👗', category: 'casual' },
  // Row 4
  { name: 'Abaya', key: 'abaya', price: 2.0, icon: '🧕', category: 'traditional' },
  { name: 'Hegab', key: 'hegab', price: 0.5, icon: '🧕', category: 'traditional' },
  { name: 'Bluse', key: 'bluse', price: 1.0, icon: '👚', category: 'casual' },
  { name: 'OVERALL', key: 'overall', price: 2.0, icon: '🥋', category: 'casual' },
  { name: 'Curtain', key: 'curtain', price: 3.0, icon: '🪟', category: 'household' },
  { name: 'Sheet', key: 'sheet', price: 1.5, icon: '🛏️', category: 'household' },
  { name: 'Plaid', key: 'plaid', price: 2.5, icon: '🛏️', category: 'household' },
  { name: 'Single quilt', key: 'singleQuilt', price: 3.0, icon: '🛏️', category: 'household' },
  { name: 'Double quilt', key: 'doubleQuilt', price: 4.5, icon: '🛏️', category: 'household' },
];

const getCategoryColor = (category) => {
  switch (category) {
    case 'traditional': return '#8b5cf6'; // Purple
    case 'casual': return '#3b82f6';      // Blue
    case 'outerwear': return '#f59e0b';   // Amber
    case 'household': return '#10b981';   // Emerald
    case 'special': return '#ec4899';     // Pink
    default: return '#6b7280';            // Gray
  }
};

const INITIAL_CATALOG = GARMENT_CATALOG.map(item => ({
  ...item,
  color: item.color || getCategoryColor(item.category)
}));

export const AdminStateContext = createContext();

export const AdminStateProvider = ({ children }) => {
  // Local lists states populated from the APIs
  const [rawCustomers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const customers = useMemo(() => {
    const sortedChronologically = [...rawCustomers].sort((a, b) => {
      const idA = a.id || a._id || '';
      const idB = b.id || b._id || '';
      return String(idA).localeCompare(String(idB), undefined, { numeric: true, sensitivity: 'base' });
    });
    const idMap = new Map();
    sortedChronologically.forEach((c, index) => {
      idMap.set(c.id || c._id, index + 1);
    });

    const orderCountMap = {};
    orders.forEach(o => {
      const cId = o.customerId || o.customer;
      if (cId) {
        orderCountMap[cId] = (orderCountMap[cId] || 0) + 1;
      }
    });

    return rawCustomers.map(c => {
      const cId = c.id || c._id;
      return {
        ...c,
        displayId: idMap.get(cId) || 1,
        totalOrders: orderCountMap[cId] || 0
      };
    });
  }, [rawCustomers, orders]);

  useEffect(() => {
    window.__cachedCustomers = customers;
  }, [customers]);
  const [services, setServices] = useState(() => {
    try {
      const saved = localStorage.getItem('services_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          window.__cachedServices = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (services && services.length > 0) {
      window.__cachedServices = services;
      localStorage.setItem('services_list', JSON.stringify(services));
    }
  }, [services]);
  const [staff, setStaff] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [areas, setAreas] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  const [completedJobs, setCompletedJobs] = useState([]);
  const [roles] = useState(mockRoles);
  const [catalog, setCatalog] = useState(INITIAL_CATALOG);

  const [selectedBranch, setSelectedBranch] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role !== 'Super Admin' && parsed.branchId && parsed.branchId !== 'null' && parsed.branchId !== 'undefined') {
          return parsed.branchId;
        }
      }
    } catch (e) {}

    const saved = localStorage.getItem('selected_branch');
    if (saved === 'All') return 'All';
    if (saved !== null && saved !== 'null' && saved !== 'undefined') return saved;
    return 'All';
  });

  const [liveUpdateFilter, setLiveUpdateFilter] = useState('All Orders');

  // Trigger branch selection cache changes
  useEffect(() => {
    localStorage.setItem('selected_branch', selectedBranch);
  }, [selectedBranch]);

  // Force selectedBranch to 'All' if the user is a Super Admin
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role === 'Super Admin' && selectedBranch !== 'All') {
          setSelectedBranch('All');
        }
      }
    } catch (e) {}
  }, [selectedBranch]);

  // Synchronous sync loader method
  const customersRef = useRef(rawCustomers);
  const ordersRef = useRef(orders);

  useEffect(() => {
    customersRef.current = rawCustomers;
    ordersRef.current = orders;
  }, [rawCustomers, orders]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let hasStaffPermission = false;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'Super Admin' || user.role === 'Admin') {
          hasStaffPermission = true;
        }
      }
    } catch (e) {}

    const fetchResource = async (path, setter, defaultValue = []) => {
      try {
        const res = await api.get(path);
        if (res.data) {
          setter(res.data);
          return res.data;
        }
      } catch (e) {
        console.error(`Failed to fetch ${path}:`, e);
      }
      setter(defaultValue);
      return defaultValue;
    };

    // Run parallel fetches and update states progressively as they resolve
    fetchResource('/customers', setCustomers);
    fetchResource('/orders', setOrders);
    fetchResource('/services', (data) => {
      setServices(data || []);
      if (Array.isArray(data) && data.length > 0) {
        window.__cachedServices = data;
        localStorage.setItem('services_list', JSON.stringify(data));
      }
    });
    
    if (hasStaffPermission) {
      fetchResource('/staff', setStaff);
    } else {
      setStaff([]);
    }

    fetchResource('/payments', setPayments);
    const pPickups = fetchResource('/pickups', setPickups);
    const pDeliveries = fetchResource('/deliveries', setDeliveries);
    fetchResource('/drivers', setDrivers);
    
    fetchResource('/branches', (data) => {
      setBranches(data);
      if (Array.isArray(data)) {
        window.__cachedBranches = data;
        localStorage.setItem('branches_list', JSON.stringify(data));
      }
    });
    
    fetchResource('/notifications', setNotifications);
    fetchResource('/catalog', (data) => {
      if (data && data.length > 0) {
        setCatalog(data);
        window.__cachedCatalog = data;
        localStorage.setItem('catalog_list', JSON.stringify(data));
      }
    });
    
    fetchResource('/areas', (data) => {
      setAreas(data.map(a => a.name));
    });
    fetchResource('/expenses', setExpenses);

    // Handle completed jobs progressive derivation
    Promise.all([pPickups, pDeliveries]).then(([pickupsData, deliveriesData]) => {
      const compJobs = [
        ...pickupsData.filter(p => p.status === 'Completed').map(p => ({
          id: `p-${p.id}`,
          type: 'Pickup',
          jobId: p.pickupId,
          customer: p.customer,
          driver: p.assignedStaff,
          date: p.pickupDate,
          status: 'Completed',
          amount: 0.0
        })),
        ...deliveriesData.filter(d => d.status === 'Delivered').map(d => ({
          id: `d-${d.id}`,
          type: 'Delivery',
          jobId: d.deliveryId,
          customer: d.customer,
          driver: d.assignedStaff,
          date: d.deliveryDate,
          status: 'Completed',
          amount: 0.0
        }))
      ];
      setCompletedJobs(compJobs);
    });
  };

  // Run fetches on mount and poll for auth credentials shifts
  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && customersRef.current.length === 0 && ordersRef.current.length === 0) {
        fetchData();
      }
    }, 2000);

    const notifTimer = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/notifications');
          setNotifications(res.data);
        } catch (e) {
          // ignore polling errors
        }
      }
    }, 15000); // Poll notifications every 15 seconds

    return () => {
      clearInterval(timer);
      clearInterval(notifTimer);
    };
  }, []);

  const addCatalogItem = async (item) => {
    try {
      const res = await api.post('/catalog', item);
      setCatalog(prev => {
        const next = [...prev, res.data];
        window.__cachedCatalog = next;
        localStorage.setItem('catalog_list', JSON.stringify(next));
        return next;
      });
      return res.data;
    } catch (e) {
      console.error(e);
      setCatalog(prev => {
        const next = [...prev, item];
        window.__cachedCatalog = next;
        localStorage.setItem('catalog_list', JSON.stringify(next));
        return next;
      });
      toast.error(e.response?.data?.message || 'Failed to add catalog item (using local fallback)');
      return item;
    }
  };

  const updateCatalogItem = async (key, updatedItem) => {
    try {
      const res = await api.put(`/catalog/${key}`, updatedItem);
      setCatalog(prev => {
        const next = prev.map(c => c.key === key ? res.data : c);
        window.__cachedCatalog = next;
        localStorage.setItem('catalog_list', JSON.stringify(next));
        return next;
      });
      return res.data;
    } catch (e) {
      console.error(e);
      setCatalog(prev => {
        const next = prev.map(c => c.key === key ? updatedItem : c);
        window.__cachedCatalog = next;
        localStorage.setItem('catalog_list', JSON.stringify(next));
        return next;
      });
      toast.error(e.response?.data?.message || 'Failed to update catalog item (using local fallback)');
      return updatedItem;
    }
  };

  const deleteCatalogItem = async (key) => {
    try {
      await api.delete(`/catalog/${key}`);
      setCatalog(prev => {
        const next = prev.filter(c => c.key !== key);
        window.__cachedCatalog = next;
        localStorage.setItem('catalog_list', JSON.stringify(next));
        return next;
      });
      return true;
    } catch (e) {
      console.error(e);
      setCatalog(prev => {
        const next = prev.filter(c => c.key !== key);
        window.__cachedCatalog = next;
        localStorage.setItem('catalog_list', JSON.stringify(next));
        return next;
      });
      toast.error(e.response?.data?.message || 'Failed to delete catalog item (using local fallback)');
      return true;
    }
  };

  // Operations CRUD mapping directly to backend REST APIs
  const addBranch = async (branch) => {
    try {
      const res = await api.post('/branches', branch);
      setBranches(prev => [res.data, ...prev]);
      toast.success('Branch added successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create branch');
    }
  };

  const updateBranch = async (id, updatedBranch) => {
    try {
      const res = await api.put(`/branches/${id}`, updatedBranch);
      setBranches(prev => prev.map(b => b.id === id ? res.data : b));
      toast.success('Branch updated successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update branch');
      return false;
    }
  };

  const deleteBranch = async (id) => {
    try {
      await api.delete(`/branches/${id}`);
      setBranches(prev => prev.filter(b => b.id !== id));
      toast.success('Branch deleted successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete branch');
      return false;
    }
  };

  const addCustomer = async (customer) => {
    try {
      const res = await api.post('/customers', customer);
      setCustomers(prev => [res.data, ...prev]);
      toast.success('Customer registered successfully');
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create customer');
      return null;
    }
  };

  const updateCustomer = async (id, updatedCustomer) => {
    try {
      const res = await api.put(`/customers/${id}`, updatedCustomer);
      setCustomers(prev => prev.map(c => (c.id === id || c._id === id) ? res.data : c));
      toast.success('Customer profile updated successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update customer');
      return false;
    }
  };

  const deleteCustomer = async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(prev => prev.filter(c => c.id !== id && c._id !== id));
      toast.success('Customer deleted successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete customer');
      return false;
    }
  };

  const addOrder = async (order) => {
    try {
      await api.post('/orders', order);
      await fetchData(); // Reload states including auto-generated deliveries
      toast.success('Order invoice created successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit order');
    }
  };

  const addPickup = async (pickup) => {
    try {
      const res = await api.post('/pickups', pickup);
      await fetchData();
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to schedule pickup');
      return null;
    }
  };

  const addDelivery = async (delivery) => {
    try {
      const res = await api.post('/deliveries', delivery);
      await fetchData();
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to schedule delivery');
      return null;
    }
  };

  const addService = async (service) => {
    try {
      const res = await api.post('/services', service);
      setServices(prev => [res.data, ...prev]);
      toast.success('Service catalog added');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create service');
    }
  };

  const updateService = async (id, updatedService) => {
    try {
      const res = await api.put(`/services/${id}`, updatedService);
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      toast.success('Service updated successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update service');
      return false;
    }
  };

  const deleteService = async (id) => {
    try {
      await api.delete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Service deleted successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete service');
      return false;
    }
  };

  const deleteOrder = async (id) => {
    try {
      await api.delete(`/orders/${id}`);
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Invoice deleted successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete invoice');
      return false;
    }
  };

  const addStaff = async (member) => {
    try {
      const res = await api.post('/staff', {
        ...member,
        roleName: member.role,
        password: member.password || 'staff123'
      });
      setStaff(prev => {
        const existingIdx = prev.findIndex(s => s.id === res.data.id || (s.email && res.data.email && s.email.toLowerCase() === res.data.email.toLowerCase()));
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = res.data;
          return updated;
        }
        return [res.data, ...prev];
      });
      toast.success('Staff profile saved successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add staff member');
    }
  };

  const updateStaff = async (id, updatedMember) => {
    try {
      const res = await api.put(`/staff/${id}`, {
        ...updatedMember,
        roleName: updatedMember.role
      });
      setStaff(prev => prev.map(s => (s.id === id || s._id === id) ? res.data : s));
      toast.success('Staff profile updated successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update staff member');
      return false;
    }
  };

  const deleteStaff = async (id) => {
    try {
      await api.delete(`/staff/${id}`);
      setStaff(prev => prev.filter(s => s.id !== id && s._id !== id));
      toast.success('Staff member deleted successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete staff member');
      return false;
    }
  };

  const lockStaff = async (id, isLocked) => {
    try {
      const res = await api.put(`/staff/${id}/lock`, { isLocked });
      setStaff(prev => prev.map(s => (s.id === id || s._id === id) ? res.data : s));
      toast.success(isLocked ? 'Staff account locked' : 'Staff account unlocked');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update account lock state');
      return false;
    }
  };

  const updateOrderStatus = async (orderId, status, holdComment, extraPayload = {}) => {
    try {
      const payload = typeof status === 'object' && status !== null 
        ? { ...status } 
        : { status, holdComment, ...extraPayload };
      const res = await api.put(`/orders/${orderId}/status`, payload);
      if (res.data) {
        setOrders((prev) => prev.map((o) => (o.id === res.data.id || o.number === res.data.number ? res.data : o)));
      }
      await fetchData(); // Synchronize all order status/delivery transitions
      if (payload.isDeliveryOnly || (!payload.status && payload.deliveryType)) {
        toast.success(`Delivery updated: ${payload.deliveryType}`);
      } else if (payload.status) {
        toast.success(`Order status updated to: ${payload.status}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update order');
    }
  };

  const bulkUpdateOrderStatus = async (orderIds, status) => {
    try {
      await api.put('/orders/bulk/status', { orderIds, status });
      await fetchData();
      toast.success(`Successfully updated ${orderIds.length} orders to: ${status}`);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to bulk update orders');
      return false;
    }
  };

  const transferOrdersToBranch = async (orderIds, targetBranchId, comment) => {
    try {
      const res = await api.put('/orders/transfer', { orderIds, targetBranchId, comment });
      await fetchData();
      toast.success(res.data?.message || `Successfully transferred ${orderIds.length} orders to branch`);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to transfer orders to branch');
      return false;
    }
  };

  const updateOrderPaymentStatus = async (orderId, paymentStatus, amountPaid) => {
    try {
      await api.put(`/orders/${orderId}/payment-status`, { paymentStatus, amountPaid });
      await fetchData();
      toast.success(`Payment status updated to: ${paymentStatus}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update payment status');
    }
  };

  const editOrder = async (orderId, editData) => {
    try {
      const res = await api.put(`/orders/${orderId}/edit`, editData);
      if (res.data) {
        setOrders((prev) => prev.map((o) => (o.id === res.data.id || o.number === res.data.number ? res.data : o)));
      }
      await fetchData();
      toast.success('Invoice updated successfully');
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to edit invoice');
      return null;
    }
  };

  const updatePickupStatus = async (pickupId, status) => {
    try {
      await api.put(`/pickups/${pickupId}/status`, { status });
      await fetchData();
      toast.success(`Pickup status progressed: ${status}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update pickup status');
    }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      await api.put(`/deliveries/${deliveryId}/status`, { status });
      await fetchData();
      toast.success(`Delivery status progressed: ${status}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update delivery status');
    }
  };

  const updateDeliveryJob = async (updatedDelivery) => {
    try {
      await api.put(`/deliveries/${updatedDelivery.id}/assign`, {
        assignedStaff: updatedDelivery.assignedStaff
      });
      const isUnassign = !updatedDelivery.assignedStaff || updatedDelivery.assignedStaff === 'Unassigned';
      const targetStatus = isUnassign ? 'Scheduled' : updatedDelivery.status;
      if (targetStatus && targetStatus !== 'Scheduled') {
        await api.put(`/deliveries/${updatedDelivery.id}/status`, {
          status: targetStatus
        });
      }
      await fetchData();
      toast.success('Delivery dispatch assignment updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update delivery job');
    }
  };

  const updatePickupJob = async (updatedPickup) => {
    try {
      await api.put(`/pickups/${updatedPickup.id}/assign`, {
        assignedStaff: updatedPickup.assignedStaff
      });
      const isUnassign = !updatedPickup.assignedStaff || updatedPickup.assignedStaff === 'Unassigned';
      const targetStatus = isUnassign ? 'Scheduled' : updatedPickup.status;
      if (targetStatus && targetStatus !== 'Scheduled') {
        await api.put(`/pickups/${updatedPickup.id}/status`, {
          status: targetStatus
        });
      }
      await fetchData();
      toast.success('Pickup dispatch assignment updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update pickup job');
    }
  };

  const addDriver = async (driver) => {
    try {
      const res = await api.post('/drivers', driver);
      setDrivers(prev => [res.data, ...prev]);
      toast.success('Driver profile added successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to register driver');
    }
  };

  const updateDriver = async (updatedDriver) => {
    try {
      const res = await api.put(`/drivers/${updatedDriver.id}`, updatedDriver);
      setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? res.data : d));
      toast.success('Driver profile updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update driver');
    }
  };

  const deleteDriver = async (id) => {
    try {
      await api.delete(`/drivers/${id}`);
      setDrivers(prev => prev.filter(d => d.id !== id));
      toast.success('Driver profile deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete driver');
    }
  };

  const settleCustomerBalance = async (customerId, paymentOptions = {}) => {
    try {
      const payload = typeof paymentOptions === 'string' ? { method: paymentOptions } : paymentOptions;
      const res = await api.post(`/customers/${customerId}/settle`, payload);
      await fetchData();
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to settle customer balance');
      return null;
    }
  };

  const addPayment = async (payment) => {
    try {
      const res = await api.post('/payments', payment);
      await fetchData();
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to record payment');
      return null;
    }
  };

  const updatePayment = async (id, updatedPayment) => {
    try {
      await api.put(`/payments/${id}`, updatedPayment);
      await fetchData();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update payment');
      return false;
    }
  };

  const addArea = async (areaName) => {
    try {
      const res = await api.post('/areas', { name: areaName });
      await fetchData();
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add area');
      return null;
    }
  };

  const deleteArea = async (areaName) => {
    try {
      await api.delete(`/areas/${encodeURIComponent(areaName)}`);
      await fetchData();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete area');
      return false;
    }
  };

  const assignDriverToJob = async (driverName, jobType) => {
    try {
      const driver = drivers.find(d => d.driverName === driverName);
      if (driver) {
        const updatedDriver = { ...driver, status: 'Assigned' };
        await updateDriver(updatedDriver);
      }
    } catch (e) {
      console.error('Error assigning driver to job:', e);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      for (const n of notifications) {
        if (!n.read) {
          await api.put(`/notifications/${n.id}/read`);
        }
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      for (const n of notifications) {
        await api.delete(`/notifications/${n.id}`);
      }
      setNotifications([]);
      toast.info('Notifications feed cleared');
    } catch (e) {
      console.error(e);
    }
  };

  const addNotification = async (notif) => {
    // Standard system notifications local logging fallback
    setNotifications(prev => [
      { id: String(Date.now()), time: new Date().toISOString(), read: false, ...notif },
      ...prev
    ]);
  };

  const addExpense = async (expenseData) => {
    try {
      const res = await api.post('/expenses', expenseData);
      await fetchData();
      toast.success('Expense recorded successfully');
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to record expense');
      return null;
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      await api.delete(`/expenses/${expenseId}`);
      await fetchData();
      toast.success('Expense deleted successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete expense');
      return false;
    }
  };

  const value = {
    expenses,
    setExpenses,
    addExpense,
    deleteExpense,
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    settleCustomerBalance,
    setCustomers,

    orders,
    addOrder,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    transferOrdersToBranch,
    updateOrderPaymentStatus,
    editOrder,
    deleteOrder,
    setOrders,

    services,
    setServices,
    addService,
    updateService,
    deleteService,

    staff,
    setStaff,
    addStaff,
    updateStaff,
    deleteStaff,
    lockStaff,

    payments,
    setPayments,
    addPayment,
    updatePayment,

    pickups,
    setPickups,
    updatePickupStatus,
    updatePickupJob,
    addPickup,

    deliveries,
    setDeliveries,
    updateDeliveryStatus,
    updateDeliveryJob,
    addDelivery,

    drivers,
    setDrivers,
    addDriver,
    updateDriver,
    deleteDriver,
    assignDriverToJob,

    completedJobs,
    setCompletedJobs,

    roles,
    catalog,
    setCatalog,
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    areas,
    addArea,
    deleteArea,

    branches,
    setBranches,
    addBranch,
    updateBranch,
    deleteBranch,

    selectedBranch: (() => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.role === 'Super Admin') {
            return 'All';
          }
        }
      } catch (e) {}
      return selectedBranch;
    })(),
    setSelectedBranch,

    liveUpdateFilter,
    setLiveUpdateFilter,

    notifications,
    setNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    addNotification,

    fetchData,
  };

  return (
    <AdminStateContext.Provider value={value}>
      {children}
    </AdminStateContext.Provider>
  );
};
