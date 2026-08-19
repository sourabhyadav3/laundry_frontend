import React, { useState } from 'react';
import {
  FiSun,
  FiUser,
  FiLock,
  FiEdit2,
  FiLogOut,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import ThemeToggle from '../../Components/ThemeToggle';
import Modal from '../../Components/Modal';

const SECTIONS = [
  { id: 'account', label: 'Account Settings', icon: FiUser },
  { id: 'theme', label: 'Theme Settings', icon: FiSun },
];

const inputClass =
  'mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40';
const labelClass = 'block text-sm font-medium text-primary';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { changePassword, logout } = useSettings();
  const [activeSection, setActiveSection] = useState('account');

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [accountForm, setAccountForm] = useState({
    name: storedUser.name || 'Counter Staff',
    email: storedUser.email || 'counter@tuhama.com',
    role: storedUser.role || 'Counter Staff',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  const handleSaveProfile = () => {
    const updatedUser = { ...storedUser, ...accountForm };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    toast.success('Profile updated successfully');
    setShowProfileModal(false);
    // Reload page to reflect name changes in Navbar/Layout
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
                  {(accountForm.name || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
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

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Counter Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Settings</h1>
          <p className="mt-2 text-sm text-secondary">Manage your profile and application preferences.</p>
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
            <label className={labelClass}>Name</label>
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
    </div>
  );
};

export default Settings;
