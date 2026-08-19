// src/components/Navbar.jsx
import React, { useEffect, useRef, useState, useContext } from 'react';
import { FiBell, FiChevronDown, FiLogOut, FiMaximize2, FiMinimize2, FiMapPin, FiShoppingBag, FiMonitor, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { AdminStateContext } from '../context/AdminStateContext';
import { translateNotification } from '../utils/notificationTranslator';

const Navbar = () => {
  const { focusMode, toggleFocusMode } = useTheme();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef(null);
  const [liveUpdateOpen, setLiveUpdateOpen] = useState(false);
  const liveUpdateRef = useRef(null);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  const adminState = useContext(AdminStateContext);
  const branches = adminState?.branches || [];
  const selectedBranch = adminState?.selectedBranch || 'All';
  // const setSelectedBranch = adminState?.setSelectedBranch || (() => {});


  const notifications = adminState?.notifications || [];
  const markNotificationRead = adminState?.markNotificationRead || (() => {});
  const markAllNotificationsRead = adminState?.markAllNotificationsRead || (() => {});
  const clearAllNotifications = adminState?.clearAllNotifications || (() => {});
  const unreadCount = notifications.filter(n => !n.read).length;

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = storedUser?.name || 'John Doe';
  const userRole = storedUser?.role || 'Admin';
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success(t('nav.logoutSuccess') || 'Logged out successfully');
    navigate('/');
  };

  const getTranslatedRole = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'operations lead':
        return t('nav.operationsLead');
      case 'counter':
      case 'counter staff':
        return t('nav.counterStaff');
      case 'delivery':
      case 'delivery staff':
      case 'rider':
        return t('nav.deliveryStaff');
      default:
        return role;
    }
  };

  const getNotificationRedirectPath = (notif) => {
    const role = String(userRole || '').toLowerCase();
    const type = String(notif.type || '').toLowerCase();
    const text = String(notif.text || '').toLowerCase();
    const title = String(notif.title || '').toLowerCase();

    // Super Admin redirect rules
    if (role.includes('super')) {
      if (type === 'order') return '/superadmin/dashboard';
      if (type === 'delivery') return '/superadmin/branches';
      return '/superadmin/dashboard';
    }

    // Admin (Operations Lead) redirect rules
    if (role.includes('admin') || role.includes('operations')) {
      if (type === 'order') return '/admin/orders';
      if (type === 'delivery' || title.includes('pickup') || text.includes('pickup') || title.includes('delivery') || text.includes('delivery')) {
        return '/admin/pickups';
      }
      if (type === 'system' || title.includes('payment') || text.includes('payment') || title.includes('balance') || text.includes('balance')) {
        return '/admin/payments';
      }
      return '/admin/dashboard';
    }

    // Counter Staff redirect rules
    if (role.includes('counter')) {
      if (type === 'order') return '/counter/orders';
      if (type === 'system' || title.includes('payment') || text.includes('payment') || title.includes('balance') || text.includes('balance')) {
        return '/counter/payments';
      }
      return '/counter/dashboard';
    }

    // Delivery Staff / Rider redirect rules
    if (role.includes('delivery') || role.includes('rider')) {
      if (title.includes('pickup') || text.includes('pickup')) {
        return '/delivery/pickups';
      }
      if (title.includes('delivery') || text.includes('delivery')) {
        return '/delivery/deliveries';
      }
      return '/delivery/dashboard';
    }

    return '/';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setBranchDropdownOpen(false);
      }
      if (liveUpdateRef.current && !liveUpdateRef.current.contains(event.target)) {
        setLiveUpdateOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    if (profileOpen || branchDropdownOpen || liveUpdateOpen || notificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, branchDropdownOpen, liveUpdateOpen, notificationOpen]);

  return (
    <header className="glass-nav sticky top-0 z-30 border-b border-border shadow-sm">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-1.5">
        <div className="flex flex-1 items-center gap-3 min-w-max shrink-0 max-lg:ml-10">
          <div className="hidden md:block whitespace-nowrap shrink-0 rounded-2xl border border-border bg-surface-alt px-4 py-2 text-sm font-semibold text-primary shadow-sm">
            Tuhama laundry co.
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* BRANCH SELECTOR */}
          {userRole === 'Super Admin' && (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary shadow-sm">
              <FiMapPin size={16} className="text-blue-500" />
              <span className="hidden lg:inline">
                All Branches
              </span>
            </div>
          )}

          {/* Commented out Super Admin dropdown selector to easily restore later if needed
          {userRole === 'Super Admin' && branches.length > 0 && (
            <div className="relative" ref={branchDropdownRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary shadow-sm hover:bg-surface-hover hover:text-primary transition-all duration-200"
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              >
                <FiMapPin size={16} />
                <span className="hidden lg:inline">
                  {selectedBranch === 'All' ? 'All Branches' : branches.find(b => b.id === selectedBranch)?.name || 'Select Branch'}
                </span>
                <FiChevronDown size={14} className={`transition-transform duration-200 ${branchDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {branchDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 rounded-2xl border border-border bg-surface py-2 shadow-lg z-50">
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm ${selectedBranch === 'All' ? 'bg-blue-50/50 text-blue-600 font-semibold' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}
                    onClick={() => { setSelectedBranch('All'); setBranchDropdownOpen(false); }}
                  >
                    All Branches
                  </button>
                  {branches.map(branch => (
                    <button
                      key={branch.id}
                      className={`block w-full text-left px-4 py-2 text-sm ${selectedBranch === branch.id ? 'bg-blue-50/50 text-blue-600 font-semibold' : 'text-secondary hover:bg-surface-hover hover:text-primary'}`}
                      onClick={() => { setSelectedBranch(branch.id); setBranchDropdownOpen(false); }}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          */}

          {userRole !== 'Super Admin' && (userRole === 'Admin' || userRole === 'Counter Staff' || userRole === 'Counter' || userRole === 'Delivery Staff' || userRole === 'Delivery') && branches.length > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary shadow-sm">
              <FiMapPin size={16} className="text-blue-500" />
              <span className="hidden sm:inline">
                {branches.find(b => b.id === selectedBranch)?.name || 'Ragheey'}
              </span>
            </div>
          )}



          {/* LCD DISPLAY LINK (Shifted from Sidebar) */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary shadow-sm hover:bg-surface-hover hover:text-primary transition-all duration-200"
            onClick={() => {
              const role = String(userRole || '').toLowerCase();
              if (role.includes('admin')) navigate('/admin/lcd-display');
              else if (role.includes('delivery')) navigate('/delivery/lcd-display');
              else navigate('/counter/lcd-display');
            }}
          >
            <FiMonitor size={16} />
            <span className="font-bold tracking-wider hidden sm:inline">LCD</span>
          </button>

          <button
            type="button"
            className={`hidden lg:flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary shadow-sm hover:bg-surface-hover hover:text-primary transition-all duration-200 ${focusMode ? 'text-blue-500 bg-blue-500/10 border-blue-500/30' : ''
              }`}
            onClick={toggleFocusMode}
            title={focusMode ? t('nav.exitFocusMode') || 'Exit Focus Mode' : t('nav.enterFocusMode') || 'Enter Focus Mode'}
            aria-label={focusMode ? t('nav.exitFocusMode') || 'Exit Focus Mode' : t('nav.enterFocusMode') || 'Enter Focus Mode'}
          >
            {focusMode ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            <span className="hidden 2xl:inline">
              {focusMode ? t('nav.exitFocusMode') || 'Exit Focus Mode' : t('nav.enterFocusMode') || 'Enter Focus Mode'}
            </span>
          </button>

          <ThemeToggle />

          <LanguageSwitcher />

          {/* NOTIFICATIONS */}
          <div className="relative" ref={notificationRef}>
            <button
              className="icon-button relative"
              aria-label={t('nav.notifications') || 'Notifications'}
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-rose-500 ring-2 ring-surface"></span>
              )}
            </button>

            {notificationOpen && (
              <div className={`absolute top-full mt-2 w-[320px] rounded-3xl border border-border bg-surface py-3 shadow-xl z-50 ${language === 'ar' ? 'left-0 sm:-left-2' : 'right-0 sm:-right-2'}`}>
                <div className="flex items-center justify-between px-4 pb-3 border-b border-border/50">
                  <h3 className="text-sm font-extrabold text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllNotificationsRead} 
                      className="text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-600"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                
                <div className="max-h-[350px] overflow-y-auto px-2 py-2 flex flex-col gap-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-secondary flex flex-col items-center">
                      <FiBell className="text-3xl mb-2 opacity-20" />
                      <p className="text-sm font-semibold">No notifications</p>
                      <p className="text-xs">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`flex gap-3 p-3 rounded-2xl transition-all cursor-pointer ${notif.read ? 'opacity-70 hover:bg-surface-hover' : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                        onClick={() => {
                          if (!notif.read) {
                            markNotificationRead(notif.id);
                          }
                          const path = getNotificationRedirectPath(notif);
                          if (path) {
                            navigate(path);
                            setNotificationOpen(false);
                          }
                        }}
                      >
                        <div className={`mt-0.5 flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${notif.read ? 'bg-surface-alt' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                          {notif.type === 'order' ? <FiShoppingBag size={14} /> : notif.type === 'delivery' ? <FiMapPin size={14} /> : <FiBell size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const { title, text } = translateNotification(notif.title, notif.text, language);
                            return (
                              <>
                                <p className={`text-sm truncate ${notif.read ? 'text-secondary font-medium' : 'text-primary font-bold'}`}>{title || 'Notification'}</p>
                                <p className="text-xs text-secondary mt-0.5 line-clamp-2">{text}</p>
                              </>
                            );
                          })()}
                          <p className="text-[10px] text-muted mt-1.5 font-medium">{new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {!notif.read && <div className="h-2 w-2 mt-3 rounded-full bg-blue-500 flex-shrink-0"></div>}
                      </div>
                    ))
                  )}
                </div>
                
                {notifications.length > 0 && (
                  <div className="px-4 pt-3 mt-1 border-t border-border/50 text-center">
                    <button onClick={clearAllNotifications} className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors">
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="profile-dropdown-container" ref={profileRef}>
            <button
              type="button"
              className="profile-dropdown-button"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <div className="profile-avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.75rem' }}>{initials}</div>
              <div className="hidden 2xl:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold text-primary">{userName}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-secondary">{getTranslatedRole(userRole)}</span>
                  <FiChevronDown className={`text-secondary transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </button>
            <div className={`profile-dropdown-menu ${profileOpen ? 'open' : ''}`}>
              <div className="profile-dropdown-meta">
                <span className="text-sm font-semibold text-primary">{userName}</span>
                <span className="text-xs uppercase tracking-[0.22em] text-secondary">{getTranslatedRole(userRole)}</span>
              </div>
              <button
                type="button"
                className="profile-dropdown-item"
                onClick={() => {
                  const role = String(userRole || '').toLowerCase();
                  if (role.includes('super')) navigate('/superadmin/settings', { state: { section: 'account' } });
                  else if (role.includes('admin')) navigate('/admin/settings', { state: { section: 'account' } });
                  else if (role.includes('counter')) navigate('/counter/settings', { state: { section: 'account' } });
                  else if (role.includes('delivery') || role.includes('rider')) navigate('/delivery/settings', { state: { section: 'account' } });
                  else navigate('/counter/settings', { state: { section: 'account' } });
                  setProfileOpen(false);
                }}
              >
                <FiUser size={16} />
                My Profile
              </button>

              <button type="button" className="profile-dropdown-item text-rose-500 hover:bg-rose-50" onClick={handleLogout}>
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
