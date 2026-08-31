import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  FiBriefcase,
  FiSun,
  FiUser,
  FiSave,
  FiRotateCcw,
  FiLogOut,
  FiLock,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiDatabase,
  FiTrash2,
  FiDownload,
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSettings, DEFAULT_SETTINGS } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { AdminStateContext } from '../../context/AdminStateContext';
import ThemeToggle from '../../Components/ThemeToggle';
import Modal from '../../Components/Modal';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/exportUtils';
import api from '../../utils/api';

const SECTIONS = [
  { id: 'business', label: 'Business Profile', icon: FiBriefcase },
  { id: 'theme', label: 'Theme Settings', icon: FiSun },
  { id: 'account', label: 'Account Settings', icon: FiUser },
  { id: 'retention', label: 'Data Retention (2-Yr Invoices)', icon: FiDatabase },
];

const inputClass =
  'mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40';
const labelClass = 'block text-sm font-medium text-primary';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, updateSection, resetSection, changePassword, logout } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState(location.state?.section || 'business');

  const [hasInitialized, setHasInitialized] = useState(false);
  const [businessForm, setBusinessForm] = useState({ ...settings.business });

  React.useEffect(() => {
    if (settings && settings.business && settings.isLoaded && !hasInitialized) {
      setBusinessForm({ ...settings.business });
      setHasInitialized(true);
    }
  }, [settings, hasInitialized]);


  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [accountForm, setAccountForm] = useState({
    name: storedUser.name || 'Dana Lee',
    email: storedUser.email || 'admin@tuhama.com',
    role: storedUser.role || 'Admin',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  // Data Retention / 2-Year Invoices Purge State
  const { orders, setOrders } = useContext(AdminStateContext) || {};
  const [retentionYears, setRetentionYears] = useState(2);
  const [purgePreview, setPurgePreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');

  const loadPurgePreview = useCallback(async (years = retentionYears) => {
    setIsLoadingPreview(true);
    try {
      const res = await api.get(`/orders/purge-preview?years=${years}`);
      if (res && res.data) {
        setPurgePreview(res.data);
      }
    } catch (err) {
      // Fallback calculation using local orders
      const cutoff = new Date(Date.now() - years * 365.25 * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const eligible = (orders || []).filter(o => {
        const orderDate = new Date(o.createdAt || o.date);
        return orderDate <= cutoff;
      });
      const totalAmount = eligible.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
      setPurgePreview({
        cutoffDate: cutoffStr,
        years,
        eligibleCount: eligible.length,
        totalAmount,
        orders: eligible
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [retentionYears, orders]);

  useEffect(() => {
    if (activeSection === 'retention') {
      loadPurgePreview(retentionYears);
    }
  }, [activeSection, retentionYears, loadPurgePreview]);

  const handleExportOldInvoices = () => {
    if (!purgePreview || !purgePreview.orders || purgePreview.orders.length === 0) {
      toast.info('No old invoices found to export.');
      return;
    }
    const headers = [
      { header: 'Invoice #', accessor: 'number' },
      { header: 'Customer', accessor: 'customerName' },
      { header: 'Date', accessor: 'date' },
      { header: 'Service', accessor: 'serviceType' },
      { header: 'Total (KWD)', accessor: 'totalAmount' },
      { header: 'Status', accessor: 'status' },
      { header: 'Payment', accessor: 'paymentStatus' },
    ];
    exportToCSV(purgePreview.orders, headers, `invoices_backup_older_than_${retentionYears}years_${purgePreview.cutoffDate}`);
    toast.success('Backup CSV exported successfully');
  };

  const handleExecutePurge = async () => {
    if (purgeConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setIsPurging(true);
    try {
      const res = await api.post('/orders/purge-old-invoices', { years: retentionYears });
      const count = res?.data?.deletedCount ?? purgePreview?.eligibleCount ?? 0;
      toast.success(`Successfully deleted ${count} invoices older than ${retentionYears} years.`);
      
      // Update local state if orders context is available
      if (setOrders && purgePreview?.cutoffDate) {
        const cutoff = new Date(purgePreview.cutoffDate);
        setOrders(prev => prev.filter(o => new Date(o.createdAt || o.date) > cutoff));
      }

      setShowPurgeModal(false);
      setPurgeConfirmText('');
      loadPurgePreview(retentionYears);
    } catch (err) {
      toast.error('Failed to purge old invoices');
    } finally {
      setIsPurging(false);
    }
  };

  const handleSaveBusiness = () => {
    updateSection('business', businessForm);
    toast.success('Business profile saved');
  };

  const handleResetBusiness = () => {
    resetSection('business');
    setBusinessForm({ ...DEFAULT_SETTINGS.business });
    setHasInitialized(false);
    toast.info('Business profile reset');
  };


  const handleSaveProfile = () => {
    const updatedUser = { ...storedUser, ...accountForm };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    toast.success('Profile updated');
    setShowProfileModal(false);
    window.location.reload();
  };

  const handleChangePassword = async () => {
    if (!passwordForm.next || passwordForm.next.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    const success = await changePassword(passwordForm.current, passwordForm.next);
    if (success) {
      setShowPasswordModal(false);
      setPasswordForm({ current: '', next: '', confirm: '' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'business':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Business Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Business Name</label>
                <input className={inputClass} value={businessForm.businessName} onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Owner Name</label>
                <input className={inputClass} value={businessForm.ownerName} onChange={(e) => setBusinessForm({ ...businessForm, ownerName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={businessForm.email} onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input className={inputClass} value={businessForm.phone} onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={businessForm.address} onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>GST Number</label>
                <input className={inputClass} value={businessForm.gstNumber} onChange={(e) => setBusinessForm({ ...businessForm, gstNumber: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input className={inputClass} value={businessForm.website} onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })} />
              </div>

            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSaveBusiness} className="dashboard-hero-pill flex items-center gap-2 hover:bg-blue-500/10">
                <FiSave size={18} />
                <span className="font-semibold">Save Changes</span>
              </button>
              <button type="button" onClick={handleResetBusiness} className="action-button flex items-center gap-2">
                <FiRotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>
        );


      case 'theme':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Theme Settings</h2>
            <p className="text-sm text-secondary">Switch between light and dark mode for the entire dashboard.</p>
            <div className="flex items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6">
              <ThemeToggle />
              <div>
                <p className="font-semibold text-primary">Current theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="mt-1 text-sm text-secondary">Preference is saved automatically.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div 
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-blue-400/50'}`}
                onClick={() => { if (theme !== 'light') toggleTheme() }}
              >
                <p className="font-semibold text-primary">Light Mode</p>
                <p className="mt-2 text-sm text-secondary">Bright surfaces for daytime use.</p>
              </div>
              <div 
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-blue-400/50'}`}
                onClick={() => { if (theme !== 'dark') toggleTheme() }}
              >
                <p className="font-semibold text-primary">Dark Mode</p>
                <p className="mt-2 text-sm text-secondary">Reduced glare for evening operations.</p>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Account Settings</h2>
            <div className="rounded-2xl border border-border bg-surface-alt p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-xl font-bold text-blue-600">
                  {(accountForm.name || 'A').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-primary">{accountForm.name}</p>
                  <p className="text-sm text-secondary">{accountForm.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600">
                    {accountForm.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setShowProfileModal(true)} className="dashboard-hero-pill flex items-center gap-2 hover:bg-blue-500/10">
                <FiEdit2 size={18} />
                <span className="font-semibold">Edit Profile</span>
              </button>
              <button type="button" onClick={() => setShowPasswordModal(true)} className="action-button flex items-center gap-2">
                <FiLock size={16} />
                Change Password
              </button>
              <button type="button" onClick={handleLogout} className="action-button flex items-center gap-2 text-rose-600">
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        );

      case 'retention':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🗄️</span>
                <h2 className="text-xl font-bold text-primary">Data Retention &amp; Invoices Cleanup (مسح الفواتير القديمة)</h2>
              </div>
              <p className="mt-1 text-sm text-secondary">
                Purge invoices and records older than 2 years to optimize system performance and reduce storage.
              </p>
            </div>

            {/* Retention Parameter Selector */}
            <div className="p-4 rounded-2xl bg-surface-alt border border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider">
                    Retention Period
                  </label>
                  <p className="text-xs text-secondary mt-0.5">
                    Target records older than selected duration:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setRetentionYears(yr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        retentionYears === yr
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-surface text-secondary hover:text-primary border border-border'
                      }`}
                    >
                      {yr} {yr === 1 ? 'Year' : 'Years'} {yr === 2 && '⭐ (Recommended)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
                <div className="p-3.5 rounded-xl bg-surface border border-border">
                  <p className="text-[10px] font-bold uppercase text-secondary tracking-wider">Cutoff Date</p>
                  <p className="text-base font-extrabold font-mono text-primary mt-1">
                    {purgePreview?.cutoffDate ? formatDate(purgePreview.cutoffDate) : 'Calculating...'}
                  </p>
                  <p className="text-[10px] text-secondary mt-0.5">Invoices before this date</p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border">
                  <p className="text-[10px] font-bold uppercase text-secondary tracking-wider">Eligible Invoices</p>
                  <p className="text-xl font-extrabold text-rose-500 mt-1">
                    {isLoadingPreview ? '...' : `${purgePreview?.eligibleCount || 0} invoices`}
                  </p>
                  <p className="text-[10px] text-secondary mt-0.5">Ready for safe deletion</p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border">
                  <p className="text-[10px] font-bold uppercase text-secondary tracking-wider">Total Value</p>
                  <p className="text-lg font-extrabold font-mono text-primary mt-1">
                    {isLoadingPreview ? '...' : formatCurrency(purgePreview?.totalAmount || 0)}
                  </p>
                  <p className="text-[10px] text-secondary mt-0.5">Historical sales volume</p>
                </div>
              </div>
            </div>

            {/* Warning & Action Zone */}
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl select-none">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    Safe Data Deletion Notice
                  </h4>
                  <p className="text-xs text-primary mt-1">
                    Deleting invoices older than {retentionYears} years permanently removes old completed orders and associated payment logs created before <b>{purgePreview?.cutoffDate || '2 years ago'}</b>. Recent customer balances, active customers, catalog garments, and new invoices are preserved safely.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={handleExportOldInvoices}
                  disabled={!purgePreview || purgePreview.eligibleCount === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-alt text-primary border border-border font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FiDownload size={15} />
                  <span>Download Backup (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPurgeModal(true)}
                  disabled={!purgePreview || purgePreview.eligibleCount === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FiTrash2 size={15} />
                  <span>Delete Invoices Older Than {retentionYears} Years</span>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Admin Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Settings</h1>
          <p className="mt-2 text-sm text-secondary">Manage business and application settings.</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-4">
        <nav className="surface-card h-fit space-y-1 rounded-2xl border border-border p-3 shadow-xl lg:col-span-1">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Settings</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${activeSection === id
                  ? 'settings-nav-active bg-blue-500/10 text-blue-600 font-semibold shadow-sm'
                  : 'text-secondary hover:bg-surface-alt hover:text-primary'
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="surface-card rounded-2xl border border-border p-6 shadow-xl lg:col-span-3">
          {renderContent()}
        </div>
      </div>

      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Edit Profile">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Admin Name</label>
            <input className={inputClass} value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <input className={inputClass} value={accountForm.role} disabled />
          </div>
          <button type="button" onClick={handleSaveProfile} className="w-full rounded-xl bg-blue-500/10 py-2 font-semibold text-blue-600">
            Save Profile
          </button>
        </div>
      </Modal>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} className={inputClass} value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary" onClick={() => setShowCurrent(!showCurrent)}>
                 {showCurrent ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <input type={showNext ? "text" : "password"} className={inputClass} value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary" onClick={() => setShowNext(!showNext)}>
                 {showNext ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} className={inputClass} value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary" onClick={() => setShowConfirm(!showConfirm)}>
                 {showConfirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <button type="button" onClick={handleChangePassword} className="w-full rounded-xl bg-blue-500/10 py-2 font-semibold text-blue-600">
            Update Password
          </button>
        </div>
      </Modal>

      {/* ===== PURGE OLD INVOICES CONFIRMATION MODAL ===== */}
      <Modal
        isOpen={showPurgeModal}
        onClose={() => {
          setShowPurgeModal(false);
          setPurgeConfirmText('');
        }}
        title="Confirm Deletion of 2-Year Old Invoices"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
            <span className="text-4xl">🛑</span>
            <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
              Permanently Delete {purgePreview?.eligibleCount || 0} Old Invoices?
            </h4>
            <p className="text-xs text-secondary">
              All invoices created before <b>{purgePreview?.cutoffDate}</b> ({retentionYears} years ago) will be permanently deleted.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-secondary uppercase">
              Type <span className="text-rose-500 font-mono font-black">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              placeholder="Type DELETE"
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              className="w-full rounded-xl border border-rose-500/40 bg-surface px-3 py-2 text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleExecutePurge}
              disabled={purgeConfirmText.trim().toUpperCase() !== 'DELETE' || isPurging}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isPurging ? 'Deleting...' : 'Confirm Permanent Deletion'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPurgeModal(false);
                setPurgeConfirmText('');
              }}
              className="px-4 py-2.5 rounded-xl border border-border bg-surface text-secondary hover:text-primary font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
