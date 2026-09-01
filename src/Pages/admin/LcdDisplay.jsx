import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminStateContext } from '../../context/AdminStateContext';
import { ORDER_STATUSES, ORDER_STATUS_AR, normalizeOrderStatus } from '../../constants/statusStyles';
import { FiTv, FiMaximize2, FiMinimize2, FiGrid, FiList, FiRefreshCw, FiArrowLeft, FiClock, FiSun, FiMoon, FiTruck } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';

const LcdDisplay = () => {
  const { orders, deliveries, pickups, selectedBranch, branches, services } = useContext(AdminStateContext);
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Local storage polling/listening state
  const [localOrders, setLocalOrders] = useState(orders);
  const [viewMode, setViewMode] = useState('board'); // 'board', 'table', 'express', 'delivery'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync state with Context orders or LocalStorage
  const loadLatestOrders = () => {
    setIsRefreshing(true);
    const saved = localStorage.getItem('orders_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalOrders(parsed);
        } else {
          setLocalOrders(orders);
        }
      } catch (e) {
        setLocalOrders(orders);
      }
    } else {
      setLocalOrders(orders);
    }
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Auto refresh interval (every 5 seconds)
  useEffect(() => {
    loadLatestOrders();
    const interval = setInterval(() => {
      loadLatestOrders();
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for storage events (instant sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'orders_list' && e.newValue) {
        try {
          setLocalOrders(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Live Clock Effect
  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Full Screen Handler
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error enabling fullscreen", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Full Screen Change Listener (e.g. Esc key)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Format date and time
  const formattedTime = time.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = time.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Combine context orders, localOrders, deliveries, and pickups so data is 100% comprehensive and dynamic
  const allAvailableOrders = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Add context orders
    (orders || []).forEach(o => {
      if (o && (o.id || o._id || o.number)) {
        const key = (o.id || o._id || o.number).toString();
        seen.add(key);
        if (o.number) seen.add(o.number.toString());
        list.push(o);
      }
    });

    // 2. Add localOrders
    (localOrders || []).forEach(o => {
      if (o && (o.id || o._id || o.number)) {
        const key = (o.id || o._id || o.number).toString();
        if (!seen.has(key)) {
          seen.add(key);
          if (o.number) seen.add(o.number.toString());
          list.push(o);
        }
      }
    });

    // 3. Add Home Service deliveries list
    (deliveries || []).forEach(d => {
      if (d) {
        const id = (d.id || d._id || d.deliveryId || '').toString();
        const num = (d.deliveryId || d.orderNumber || d.number || '').toString();
        if ((id && !seen.has(id)) || (num && !seen.has(num))) {
          if (id) seen.add(id);
          if (num) seen.add(num);
          list.push({
            id: id || `del-${Math.random()}`,
            number: num || 'DEL-ORD',
            customerName: d.customer || d.customerName || 'Customer',
            phone: d.contactNumber || d.phone || '',
            serviceType: d.serviceType || 'Home Delivery',
            status: d.status || 'Pending',
            deliveryMode: 'home',
            isHomeDelivery: true,
            address: d.address || '',
            areaName: d.areaName || '',
            street: d.street || '',
            houseNo: d.houseNo || '',
            driverName: d.assignedStaff || d.driverName || '',
            expectedDeliveryTime: d.deliveryDate || d.expectedDeliveryTime || '',
            branch: d.branch || 'Home Service',
            branchId: d.branchId || '',
            createdFromInvoice: true,
          });
        }
      }
    });

    // 4. Add Home Service pickups list
    (pickups || []).forEach(p => {
      if (p) {
        const id = (p.id || p._id || p.pickupId || '').toString();
        const num = (p.pickupId || p.requestId || p.number || '').toString();
        if ((id && !seen.has(id)) || (num && !seen.has(num))) {
          if (id) seen.add(id);
          if (num) seen.add(num);
          list.push({
            id: id || `pick-${Math.random()}`,
            number: num || 'PICK-ORD',
            customerName: p.customer || p.customerName || 'Customer',
            phone: p.contactNumber || p.phone || '',
            serviceType: p.serviceType || 'Home Pickup',
            status: p.status || 'Pending',
            deliveryMode: 'home',
            isHomeDelivery: true,
            address: p.address || '',
            areaName: p.areaName || '',
            street: p.street || '',
            houseNo: p.houseNo || '',
            driverName: p.assignedStaff || p.driverName || '',
            expectedDeliveryTime: p.pickupDate || p.expectedDeliveryTime || '',
            branch: p.branch || 'Home Service',
            branchId: p.branchId || '',
            createdFromInvoice: true,
          });
        }
      }
    });

    return list;
  }, [orders, localOrders, deliveries, pickups]);

  // Keep localOrders synced with context orders
  useEffect(() => {
    if (Array.isArray(orders) && orders.length > 0) {
      setLocalOrders(orders);
    }
  }, [orders]);

  const isOrderFinishedOrReady = (order) => {
    if (!order) return true;
    const normStatus = normalizeOrderStatus(order.status || 'Waiting');
    const statusLower = String(order.status || '').toLowerCase().trim();
    return (
      normStatus === 'Ready' ||
      normStatus === 'Ready for delivery' ||
      normStatus === 'Ready for shop' ||
      normStatus === 'Delivered' ||
      normStatus === 'Store' ||
      normStatus === 'Return' ||
      statusLower === 'ready' ||
      statusLower === 'ready for delivery' ||
      statusLower === 'ready for shop' ||
      statusLower === 'delivered' ||
      statusLower === 'completed' ||
      statusLower === 'store' ||
      statusLower === 'return' ||
      statusLower === 'cancelled'
    );
  };

  const filteredLocalOrders = useMemo(() => {
    return allAvailableOrders.filter(order => {
      if (!order) return false;
      // Client rule: When ready or complete, remove from LCD screen
      if (isOrderFinishedOrReady(order)) return false;

      if (selectedBranch && selectedBranch !== 'All') {
        const branchObj = branches?.find(b => (b.id || b._id)?.toString() === selectedBranch.toString());
        const branchName = branchObj ? branchObj.name : selectedBranch;

        // Check direct branch match
        const matchesBranchId = (order.branchId || '').toString() === selectedBranch.toString();
        const matchesBranchName = String(order.branch || '').toLowerCase() === String(branchName || '').toLowerCase();

        // Check Home Service branch match
        const isHomeServiceSelected = String(branchName || '').toLowerCase().includes('home service') || String(selectedBranch || '').toLowerCase().includes('home');

        if (isHomeServiceSelected) {
          // ONLY FOR HOME SERVICE BRANCH: Include ALL home delivery orders across ALL branches
          const isHomeDeliveryOrder =
            order.deliveryMode === 'home' ||
            order.isHomeDelivery === true ||
            String(order.deliveryType || '').toLowerCase() === 'home' ||
            String(order.branch || '').toLowerCase().includes('home') ||
            matchesBranchId ||
            matchesBranchName ||
            order.createdFromInvoice === true ||
            Boolean(order.isDelivery) ||
            order.deliveryMode !== 'branch';

          return isHomeDeliveryOrder;
        }

        // FOR ALL OTHER BRANCHES: Show orders belonging to or transferred to that branch
        const matchesSharedBranch =
          (order.transferredTo && order.transferredTo.toString() === selectedBranch.toString()) ||
          (order.transferredBranchName && String(order.transferredBranchName).toLowerCase() === String(branchName || '').toLowerCase()) ||
          (Array.isArray(order.sharedBranches) && order.sharedBranches.some(b => b.toString() === selectedBranch.toString()));

        return matchesBranchId || matchesBranchName || matchesSharedBranch;
      }
      return true;
    });
  }, [allAvailableOrders, selectedBranch, branches]);

  // Pending delivery orders for Home Service / Delivery view
  const pendingDeliveryOrders = useMemo(() => {
    return filteredLocalOrders.filter(order => {
      const normStatus = normalizeOrderStatus(order.status || 'Waiting');
      const statusLower = String(order.status || '').toLowerCase();
      return normStatus !== 'Delivered' && normStatus !== 'Store' && statusLower !== 'delivered' && statusLower !== 'completed';
    });
  }, [filteredLocalOrders]);

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const groups = {};
    ORDER_STATUSES.forEach(status => {
      groups[status] = [];
    });
    
    filteredLocalOrders.forEach(order => {
      const status = normalizeOrderStatus(order.status || 'Waiting');
      if (groups[status]) {
        groups[status].push(order);
      } else {
        groups['Waiting'].push(order);
      }
    });
    return groups;
  }, [filteredLocalOrders]);

  // Translate statuses dynamically
  const translateStatus = (status) => {
    const key = normalizeOrderStatus(status);
    return language === 'ar' ? ORDER_STATUS_AR[key] || status : key;
  };

  // Translate service mode / express label
  const isExpress = (order) => {
    const type = (order?.serviceType || order?.service || '').toLowerCase();
    return type.includes('express') || type.includes('urgent');
  };

  // Dynamic remaining countdown calculation based on invoice/order expected time & matched service
  const getOrderTargetTime = (order) => {
    if (!order) return null;
    const isExp = isExpress(order);

    // Look up service duration from Services Management (Admin / Backend)
    const serviceList = (services && services.length > 0) 
      ? services 
      : (window.__cachedServices || JSON.parse(localStorage.getItem('services_list') || '[]'));
      
    const orderServiceName = String(order.serviceType || order.service || '').toLowerCase().trim();
    const matchedService = serviceList.find(s => {
      const sName = String(s.name || s.serviceName || '').toLowerCase().trim();
      return sName === orderServiceName || orderServiceName.includes(sName) || sName.includes(orderServiceName);
    });

    const rawExpected = String(order.expectedDeliveryTime || order.deliveryTime || matchedService?.estimatedTime || '').trim();

    // 1. Determine base creation timestamp
    let baseMs = null;
    if (order.createdAt) {
      const parsed = new Date(order.createdAt).getTime();
      if (!isNaN(parsed)) baseMs = parsed;
    }
    if (!baseMs && (order.date || order.pickupDate)) {
      const dateStr = order.date || order.pickupDate;
      const timeStr = order.time || order.orderTime || order.createdTime;
      if (timeStr) {
        const parsed = new Date(`${dateStr} ${timeStr}`).getTime();
        if (!isNaN(parsed)) baseMs = parsed;
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr === todayStr) {
          baseMs = Date.now();
        } else {
          const parsedDateOnly = new Date(dateStr).getTime();
          if (!isNaN(parsedDateOnly)) baseMs = parsedDateOnly;
        }
      }
    }
    if (!baseMs) {
      baseMs = Date.now();
    }

    // 2. Check if rawExpected is a clock format like "14:30" or "02:30 PM"
    const clockMatch = rawExpected.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?:\s*(AM|PM|am|pm))?$/i);
    if (clockMatch) {
      let hours = parseInt(clockMatch[1], 10);
      const minutes = parseInt(clockMatch[2], 10);
      const period = clockMatch[3] ? clockMatch[3].toUpperCase() : null;
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const target = new Date(order.deliveryDate || order.expectedDeliveryDate || order.date || new Date());
      target.setHours(hours, minutes, 0, 0);
      return target.getTime();
    }

    // 3. Check if rawExpected specifies hours/days like "1 hour", "1 hours", "2 hours", "3 hours", "After 1 Hour"
    const numMatch = rawExpected.match(/(\d+(?:\.\d+)?)/);
    if (rawExpected.toLowerCase().includes('day') || rawExpected.includes('يوم')) {
      const days = numMatch ? parseFloat(numMatch[1]) : 1;
      return baseMs + days * 24 * 60 * 60 * 1000;
    }

    if (numMatch || rawExpected.toLowerCase().includes('hour') || rawExpected.includes('ساعة')) {
      const hours = numMatch ? parseFloat(numMatch[1]) : (isExp ? 1 : 24);
      return baseMs + hours * 60 * 60 * 1000;
    }

    // 4. Default fallback: Express orders default to 1 hour (as configured in Laundry Services)
    if (isExp) {
      return baseMs + 1 * 60 * 60 * 1000;
    }

    return null;
  };

  const getRemainingTime = (order) => {
    const normStatus = normalizeOrderStatus(order.status || 'Waiting');
    const isFinished = normStatus === 'Delivered' || normStatus === 'Ready' || normStatus === 'Ready for delivery' || normStatus === 'Ready for shop';

    const targetMs = getOrderTargetTime(order);
    if (!targetMs) {
      return { 
        hasTimer: false, 
        text: order.expectedDeliveryTime || order.deliveryTime || (language === 'ar' ? 'عادي' : 'Standard'),
        isFlashing: false 
      };
    }

    const diffMs = targetMs - time.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);

    if (diffMs <= 0) {
      return {
        hasTimer: true,
        text: isFinished ? (language === 'ar' ? 'مكتمل' : 'Completed') : (language === 'ar' ? 'انتهى الوقت (00:00)' : 'Time Up (00:00)'),
        isFlashing: false,
        isOverdue: true,
        isFinished,
        totalSeconds: 0
      };
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let text = '';
    if (hours > 0) {
      text = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else {
      text = `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    // Client Requirement: Flash in green only when timer is active and <= 3 minutes (180s)
    const isFlashing = !isFinished && totalSeconds <= 180 && totalSeconds > 0;

    return {
      hasTimer: true,
      text,
      isFlashing,
      isOverdue: false,
      isFinished,
      totalSeconds
    };
  };

  return (
    <div className={`lcd-display-container min-h-screen font-sans flex flex-col antialiased transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100 selection:bg-blue-600' : 'bg-slate-100 text-slate-900 selection:bg-blue-500'}`}>
      <style>{`
        .lcd-display-container table tbody tr:hover,
        .lcd-display-container table tbody tr.lcd-row:hover,
        .lcd-display-container tr:hover,
        .lcd-row:hover {
          background: inherit !important;
          background-color: transparent !important;
          color: inherit !important;
        }
        @keyframes greenFlashAnimation {
          0%, 100% {
            opacity: 1;
            background-color: rgba(16, 185, 129, 0.35);
            border-color: #10b981;
            color: #6ee7b7;
            box-shadow: 0 0 18px rgba(16, 185, 129, 0.7);
            transform: scale(1.02);
          }
          50% {
            opacity: 0.35;
            background-color: rgba(16, 185, 129, 0.08);
            border-color: rgba(16, 185, 129, 0.25);
            color: #34d399;
            box-shadow: none;
            transform: scale(1);
          }
        }
        .lcd-green-flash {
          animation: greenFlashAnimation 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      {/* Top Banner Control Panel */}
      <header className={`border-b px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-2xl transition-colors duration-300 ${isDark ? 'border-slate-800 bg-slate-900/80 backdrop-blur-md' : 'border-slate-200 bg-white/90 backdrop-blur-md'}`}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200 border border-slate-700/50 shadow-inner flex items-center justify-center active:scale-95"
            title="Back to Admin"
          >
            <FiArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400 animate-pulse shadow-lg shadow-blue-500/5">
              <FiTv size={24} />
            </div>
            <div>
              <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {language === 'ar' ? 'لوحة عرض الحالات الرقمية' : `LCD Status Display Board - ${selectedBranch === 'All' ? 'All Branches' : (branches?.find(b => b.id === selectedBranch)?.name || '')}`}
                <span className="text-xs uppercase bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/30 tracking-widest font-extrabold font-mono">LIVE</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar' ? 'عرض فوري ومنظم لحالة الطلبات داخل المغسلة' : 'Real-time order status view inside the shop'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Live Clock */}
        <div className={`flex flex-col items-center md:items-end px-4 py-1.5 rounded-2xl border shadow-inner min-w-[220px] ${isDark ? 'bg-slate-950/65 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-lg font-mono font-bold text-blue-400 tracking-wider flex items-center gap-2">
            <FiClock size={16} className="text-blue-400 animate-spin-slow" />
            {formattedTime}
          </div>
          <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">{formattedDate}</div>
        </div>

        {/* View Controls & Action buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-center md:justify-end">
          {/* Refresh button */}
          <button
            onClick={loadLatestOrders}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition font-semibold text-sm disabled:opacity-50 border ${
              isDark 
                ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white' 
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-sm'
            }`}
            title="Refresh Board Data"
          >
            <FiRefreshCw size={16} className={`${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>

          {/* View Mode Switches */}
          <div className={`p-1 rounded-2xl shadow-inner flex items-center border ${
            isDark 
              ? 'bg-slate-950 border-slate-800/60' 
              : 'bg-slate-200/50 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === 'board'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <FiGrid size={16} />
              <span className="hidden sm:inline">{language === 'ar' ? 'لوحة المتابعة' : 'Board'}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <FiList size={16} />
              <span className="hidden sm:inline">{language === 'ar' ? 'جدول العرض' : 'Table'}</span>
            </button>
            <button
              onClick={() => setViewMode('express')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === 'express'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${viewMode === 'express' ? 'bg-white' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${viewMode === 'express' ? 'bg-white' : 'bg-rose-500'}`}></span>
              </span>
              <span className="hidden sm:inline">{language === 'ar' ? 'مستعجل' : 'Express'}</span>
            </button>
            <button
              onClick={() => setViewMode('delivery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === 'delivery'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <FiTruck size={16} />
              <span className="hidden sm:inline">{language === 'ar' ? 'التوصيل المعلق' : 'Pending Delivery'}</span>
              <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
                {pendingDeliveryOrders.length}
              </span>
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-xl transition-all duration-200 border flex items-center justify-center active:scale-95 shadow-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200'}`}
            title={isDark ? 'Switch to Bright Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          {/* Full Screen Button */}
          <button
            onClick={toggleFullScreen}
            className={`p-3 rounded-xl transition-all duration-200 border flex items-center justify-center active:scale-95 shadow-lg ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700' 
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200'
            }`}
            title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {viewMode === 'delivery' ? (
          /* DEDICATED PENDING DELIVERY LCD MONITOR */
          <div className={`border rounded-3xl p-6 shadow-2xl overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 mb-4 border-b border-slate-800/60 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
                  <FiTruck size={24} />
                </div>
                <div>
                  <h2 className={`text-lg font-extrabold tracking-wide uppercase ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    {language === 'ar' ? 'شاشة التوصيل المعلق' : 'Pending Delivery Board'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {language === 'ar' ? 'عرض فوري للطلبات المعلقة للتوصيل فقط' : 'Live status view for active pending delivery orders'}
                  </p>
                </div>
              </div>
              <span className="px-4 py-1.5 rounded-full text-xs font-mono font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
                {pendingDeliveryOrders.length} {language === 'ar' ? 'طلب معلق' : 'Pending Orders'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b-2 text-xs font-extrabold uppercase tracking-wider ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="pb-4 pt-2 px-4 font-mono">{language === 'ar' ? 'رقم الطلب' : 'Order No'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'العميل والهاتف' : 'Customer & Phone'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'وقت التسليم' : 'Expected Delivery'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'السائق' : 'Driver'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {pendingDeliveryOrders.map(order => {
                    const status = normalizeOrderStatus(order.status || 'Waiting');
                    let statusLabelClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    if (status === 'Ready for delivery' || status === 'Ready') {
                      statusLabelClass = 'bg-teal-500/15 text-teal-400 border-teal-500/30 font-extrabold animate-pulse';
                    } else if (status === 'With Driver') {
                      statusLabelClass = 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-extrabold';
                    }

                    const addressParts = [
                      order.areaName || order.area,
                      order.street ? `Street: ${order.street}` : '',
                      order.houseNo ? `House: ${order.houseNo}` : '',
                      order.partNo ? `Block: ${order.partNo}` : ''
                    ].filter(Boolean);
                    const addressText = addressParts.length > 0 ? addressParts.join(', ') : (order.address || 'N/A');

                    return (
                      <tr key={order.id} className={`lcd-row font-medium ${isExpress(order) ? (isDark ? 'bg-rose-950/15' : 'bg-rose-50/50') : ''}`}>
                        <td className={`py-4 px-4 font-mono font-extrabold text-base tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          <div className="flex items-center gap-2">
                            <span>{order.number}</span>
                            {isExpress(order) && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                                {language === 'ar' ? 'مستعجل' : 'EXPRESS'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-4 px-4 text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          <div>{order.customerName || order.customer}</div>
                          <div className="text-xs font-mono text-slate-400 font-normal">{order.phone || order.customerPhone || ''}</div>
                        </td>
                        <td className={`py-4 px-4 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} max-w-[240px] truncate`} title={addressText}>
                          📍 {addressText}
                        </td>
                        <td className={`py-4 px-4 text-xs font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                          🕒 {order.expectedDeliveryTime || order.deliveryTime || 'Standard'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border ${statusLabelClass}`}>
                            {translateStatus(status)}
                          </span>
                        </td>
                        <td className={`py-4 px-4 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          👤 {order.driverName || order.driver || (language === 'ar' ? 'غير معين' : 'Unassigned')}
                        </td>
                      </tr>
                    );
                  })}
                  {pendingDeliveryOrders.length === 0 && (
                    <tr>
                      <td colSpan="6" className={`p-12 text-center text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'ar' ? 'لا توجد طلبات توصيل معلقة.' : 'No pending delivery orders found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'board' ? (
          /* GRID BOARD VIEW (Grouped columns layout) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ORDER_STATUSES.map(status => {
              const statusOrders = ordersByStatus[status] || [];
              const hasOrders = statusOrders.length > 0;
              
              // Status Styling based on status type
              let accentColor = isDark ? 'border-slate-800 bg-slate-900/30 text-slate-400' : 'border-slate-200 bg-white text-slate-600';
              let badgeColor = isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600';
              
              if (hasOrders) {
                switch (status) {
                  case 'Waiting':
                    accentColor = isDark 
                      ? 'border-sky-500/30 bg-sky-950/10 text-sky-400 shadow-sky-500/5' 
                      : 'border-sky-200 bg-sky-50/60 text-sky-800 shadow-sky-100/50';
                    badgeColor = isDark 
                      ? 'bg-sky-500/25 text-sky-300 border border-sky-500/30' 
                      : 'bg-sky-100 text-sky-700 border border-sky-200';
                    break;
                  case 'Preparing in shop':
                    accentColor = isDark 
                      ? 'border-violet-500/30 bg-violet-950/10 text-violet-400 shadow-violet-500/5' 
                      : 'border-violet-200 bg-violet-50/60 text-violet-800 shadow-violet-100/50';
                    badgeColor = isDark 
                      ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30' 
                      : 'bg-violet-100 text-violet-700 border border-violet-200';
                    break;
                  case 'Preparing in workshop':
                    accentColor = isDark 
                      ? 'border-indigo-500/30 bg-indigo-950/10 text-indigo-400 shadow-indigo-500/5' 
                      : 'border-indigo-200 bg-indigo-50/60 text-indigo-800 shadow-indigo-100/50';
                    badgeColor = isDark 
                      ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/30' 
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-200';
                    break;
                  case 'Hold':
                    accentColor = isDark 
                      ? 'border-amber-500/30 bg-amber-950/10 text-amber-400 shadow-amber-500/5' 
                      : 'border-amber-200 bg-amber-50/60 text-amber-800 shadow-amber-100/50';
                    badgeColor = isDark 
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200';
                    break;
                  case 'Ready':
                    accentColor = isDark 
                      ? 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400 shadow-emerald-500/5' 
                      : 'border-emerald-200 bg-emerald-50/60 text-emerald-800 shadow-emerald-100/50';
                    badgeColor = isDark 
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200';
                    break;
                  case 'Ready for delivery':
                    accentColor = isDark 
                      ? 'border-teal-500/30 bg-teal-950/10 text-teal-400 shadow-teal-500/5' 
                      : 'border-teal-200 bg-teal-50/60 text-teal-800 shadow-teal-100/50';
                    badgeColor = isDark 
                      ? 'bg-teal-500/25 text-teal-300 border border-teal-500/30' 
                      : 'bg-teal-100 text-teal-700 border border-teal-200';
                    break;
                  case 'Ready for shop':
                    accentColor = isDark 
                      ? 'border-lime-500/30 bg-lime-950/10 text-lime-400 shadow-lime-500/5' 
                      : 'border-lime-200 bg-lime-50/60 text-lime-800 shadow-lime-100/50';
                    badgeColor = isDark 
                      ? 'bg-lime-500/25 text-lime-300 border border-lime-500/30' 
                      : 'bg-lime-100 text-lime-700 border border-lime-200';
                    break;
                  case 'With Driver':
                    accentColor = isDark 
                      ? 'border-blue-500/30 bg-blue-950/10 text-blue-400 shadow-blue-500/5' 
                      : 'border-blue-200 bg-blue-50/60 text-blue-800 shadow-blue-100/50';
                    badgeColor = isDark 
                      ? 'bg-blue-500/25 text-blue-300 border border-blue-500/30' 
                      : 'bg-blue-100 text-blue-700 border border-blue-200';
                    break;
                  case 'Delivered':
                    accentColor = isDark 
                      ? 'border-emerald-700/30 bg-emerald-950/5 text-emerald-500' 
                      : 'border-emerald-200 bg-emerald-50/40 text-emerald-800';
                    badgeColor = isDark 
                      ? 'bg-emerald-700/25 text-emerald-300' 
                      : 'bg-emerald-100 text-emerald-700';
                    break;
                  case 'Return':
                    accentColor = isDark 
                      ? 'border-orange-500/30 bg-orange-950/10 text-orange-400 shadow-orange-500/5' 
                      : 'border-orange-200 bg-orange-50/60 text-orange-800 shadow-orange-100/50';
                    badgeColor = isDark 
                      ? 'bg-orange-500/25 text-orange-300 border border-orange-500/30' 
                      : 'bg-orange-100 text-orange-700 border border-orange-200';
                    break;
                  case 'Store':
                    accentColor = isDark 
                      ? 'border-slate-500/30 bg-slate-950/10 text-slate-400 shadow-slate-500/5' 
                      : 'border-slate-200 bg-slate-50/60 text-slate-800 shadow-slate-100/50';
                    badgeColor = isDark 
                      ? 'bg-slate-500/25 text-slate-300 border border-slate-500/30' 
                      : 'bg-slate-100 text-slate-700 border border-slate-200';
                    break;
                  default:
                    accentColor = isDark 
                      ? 'border-slate-800 bg-slate-900/20 text-slate-300' 
                      : 'border-slate-200 bg-slate-50 text-slate-700';
                    badgeColor = isDark 
                      ? 'bg-slate-800 text-slate-300' 
                      : 'bg-slate-100 text-slate-600';
                }
              }

              return (
                <div 
                  key={status}
                  className={`rounded-3xl border p-5 flex flex-col gap-4 transition-all duration-300 min-h-[200px] shadow-lg ${accentColor}`}
                >
                  {/* Status header */}
                  <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                    <h2 className={`font-extrabold text-lg tracking-wide uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {translateStatus(status)}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold shadow-inner ${badgeColor}`}>
                      {statusOrders.length}
                    </span>
                  </div>

                  {/* Orders List in Status column */}
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[480px] custom-scrollbar pr-1">
                    {statusOrders.map(order => (
                      <div 
                        key={order.id} 
                        className={`flex flex-col gap-1 p-3.5 rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-xl ${isDark ? 'bg-slate-900/90 hover:border-slate-700/80' : 'bg-white hover:border-slate-300'} ${
                          isExpress(order) 
                            ? (isDark ? 'border-rose-500/35 bg-gradient-to-br from-slate-900 to-rose-950/10 shadow-rose-950/5' : 'border-rose-300 bg-gradient-to-br from-white to-rose-50 shadow-rose-100')
                            : (isDark ? 'border-slate-800' : 'border-slate-200')
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-mono font-extrabold text-base tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {order.number}
                          </span>
                          {isExpress(order) && (
                            <span className={`inline-flex items-center text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse shadow-md ${
                              isDark 
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-rose-950/10' 
                                : 'bg-rose-100 text-rose-700 border border-rose-200 shadow-rose-100'
                            }`}>
                              {language === 'ar' ? 'مستعجل' : 'EXPRESS'}
                            </span>
                          )}
                        </div>

                        {/* Customer Name & Express Timer */}
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-sm font-bold truncate max-w-[150px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {order.customerName}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                            isDark 
                              ? 'text-slate-400 bg-slate-800/40 border-slate-800/60' 
                              : 'text-slate-600 bg-slate-100 border-slate-200'
                          }`}>
                            {order.serviceType || order.service || (language === 'ar' ? 'عادي' : 'Normal')}
                          </span>
                        </div>

                        {/* Express Live Countdown Timer Badge */}
                        {isExpress(order) && (() => {
                          const rem = getRemainingTime(order);
                          return (
                            <div className="mt-1 pt-1.5 border-t border-slate-800/40 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {language === 'ar' ? 'الوقت المتبقي' : 'Remaining'}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-lg transition-all duration-300 ${
                                rem.isOverdue
                                  ? (isDark ? 'bg-rose-500/25 text-rose-400 border border-rose-500/40 font-black shadow-md shadow-rose-500/15 animate-pulse' : 'bg-rose-100 text-rose-700 border border-rose-300 font-black')
                                  : rem.isFlashing 
                                    ? 'lcd-green-flash text-emerald-300 font-black' 
                                    : (isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                              }`}>
                                <FiClock size={11} className={rem.isFlashing ? 'animate-spin' : ''} />
                                <span>{rem.text}</span>
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                    {!hasOrders && (
                      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-xs font-medium border border-dashed rounded-2xl ${
                        isDark 
                          ? 'text-slate-500 border-slate-800/40 bg-slate-950/10' 
                          : 'text-slate-400 border-slate-200 bg-slate-50/50'
                      }`}>
                        {language === 'ar' ? 'لا توجد طلبات' : 'No orders'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* HIGH CONTRAST DEPARTURES TABLE VIEW */
          <div className={`border rounded-3xl p-6 shadow-2xl overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-900/50 border-slate-800/60' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b-2 text-base font-extrabold uppercase tracking-wider ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="pb-4 pt-2 px-4 font-mono font-bold">{language === 'ar' ? 'رقم الطلب' : 'Order No'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'نوع الخدمة' : 'Service Type'}</th>
                    <th className="pb-4 pt-2 px-4 font-mono">{language === 'ar' ? 'الوقت المتبقي' : 'Remaining Time'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="pb-4 pt-2 px-4">{language === 'ar' ? 'الفرع' : 'Branch'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {(viewMode === 'express' ? filteredLocalOrders.filter(isExpress) : filteredLocalOrders).map(order => {
                    let statusLabelClass = isDark 
                      ? 'bg-slate-800/60 text-slate-300 border-slate-700/50' 
                      : 'bg-slate-100 text-slate-600 border-slate-200';
                    const status = normalizeOrderStatus(order.status || 'Waiting');

                    switch (status) {
                      case 'Waiting':
                        statusLabelClass = isDark 
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                          : 'bg-sky-50 text-sky-700 border-sky-200';
                        break;
                      case 'Preparing in shop':
                        statusLabelClass = isDark 
                          ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                          : 'bg-violet-50 text-violet-700 border-violet-200';
                        break;
                      case 'Preparing in workshop':
                        statusLabelClass = isDark 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200';
                        break;
                      case 'Hold':
                        statusLabelClass = isDark 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : 'bg-amber-50 text-amber-700 border-amber-200';
                        break;
                      case 'Ready':
                        statusLabelClass = isDark 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        break;
                      case 'Ready for delivery':
                        statusLabelClass = isDark 
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                          : 'bg-teal-50 text-teal-700 border-teal-200';
                        break;
                      case 'Ready for shop':
                        statusLabelClass = isDark 
                          ? 'bg-lime-500/10 text-lime-400 border-lime-500/20' 
                          : 'bg-lime-50 text-lime-700 border-lime-200';
                        break;
                      case 'With Driver':
                        statusLabelClass = isDark 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                          : 'bg-blue-50 text-blue-700 border-blue-200';
                        break;
                      case 'Delivered':
                        statusLabelClass = isDark 
                          ? 'bg-emerald-700/10 text-emerald-400 border-emerald-700/20' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        break;
                      case 'Return':
                        statusLabelClass = isDark 
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                          : 'bg-orange-50 text-orange-700 border-orange-200';
                        break;
                      case 'Store':
                        statusLabelClass = isDark 
                          ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' 
                          : 'bg-slate-50 text-slate-700 border-slate-200';
                        break;
                      default:
                        break;
                    }

                    return (
                      <tr 
                        key={order.id} 
                        className={`lcd-row transition-colors font-medium ${
                          isExpress(order) ? (isDark ? 'bg-rose-950/5' : 'bg-rose-50/50') : ''
                        }`}
                      >
                        <td className={`py-4.5 px-4 font-mono font-extrabold text-base tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          <div className="flex items-center gap-3">
                            <span>{order.number}</span>
                            {isExpress(order) && (
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full animate-pulse tracking-wider ${
                                isDark 
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                                  : 'bg-rose-100 text-rose-700 border border-rose-200'
                              }`}>
                                {language === 'ar' ? 'مستعجل' : 'EXPRESS'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-4.5 px-4 text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {order.customerName}
                        </td>
                        <td className={`py-4.5 px-4 text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {order.serviceType || order.service || (language === 'ar' ? 'عادي' : 'Normal')}
                        </td>
                        <td className="py-4.5 px-4">
                          {(() => {
                            const rem = getRemainingTime(order);
                            if (!rem.hasTimer && !isExpress(order)) {
                              return (
                                <span className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {rem.text || '—'}
                                </span>
                              );
                            }

                            return (
                              <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono font-extrabold text-sm tracking-wider transition-all duration-300 ${
                                rem.isOverdue
                                  ? (isDark ? 'bg-rose-500/25 text-rose-400 border border-rose-500/50 font-black shadow-md shadow-rose-500/15 animate-pulse' : 'bg-rose-100 text-rose-700 border border-rose-300 font-black')
                                  : rem.isFlashing
                                    ? 'lcd-green-flash text-emerald-300 font-black'
                                    : (isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                              }`}>
                                <FiClock className={rem.isFlashing ? 'animate-spin' : ''} size={14} />
                                <span>{rem.text}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4.5 px-4">
                          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-extrabold border ${statusLabelClass}`}>
                            {translateStatus(status)}
                          </span>
                        </td>
                        <td className={`py-4.5 px-4 text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {(() => {
                            const branchObj = branches?.find(b => (b.id || b._id)?.toString() === (order.branchId || '').toString());
                            const branchName = branchObj ? branchObj.name : (order.branch || 'N/A');
                            if (language === 'ar') {
                              if (branchObj && (branchObj.nameAr || branchObj.arabicName)) {
                                return branchObj.nameAr || branchObj.arabicName;
                              }
                              const nameLower = branchName.toLowerCase();
                              if (nameLower.includes('ragheey') || nameLower.includes('rigai')) return 'الرقعي';
                              if (nameLower.includes('mishrif')) return 'مشرف';
                              if (nameLower.includes('andalus')) return 'الأندلس';
                              if (nameLower.includes('ardiya')) return 'العارضية';
                              if (nameLower.includes('khaitan')) return 'خيطان';
                              if (nameLower.includes('qurain') || nameLower.includes('quirain')) return 'القرين';
                              if (nameLower.includes('jahra')) return 'الجهراء';
                              if (nameLower.includes('home')) return 'خدمة المنازل';
                              if (nameLower.includes('workshop')) return 'الورشة';
                              if (nameLower.includes('carpet')) return 'قسم السجاد';
                              if (nameLower.includes('shoe')) return 'قسم الأحذية';
                            }
                            return branchName;
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                  {(viewMode === 'express' ? filteredLocalOrders.filter(isExpress) : filteredLocalOrders).length === 0 && (
                    <tr>
                      <td colSpan="6" className={`p-12 text-center text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'ar' ? 'لم يتم العثور على طلبات.' : 'No orders found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LcdDisplay;
