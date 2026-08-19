import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLoader, FiAlertCircle, FiCheck, FiArrowRight, FiMapPin } from 'react-icons/fi';
import api from '../utils/api';
import { AdminStateContext } from '../context/AdminStateContext';
import Modal from './Modal';

const defaultBranches = [
  { id: 1, name: 'Ragheey' },
  { id: 2, name: 'Mishrif' },
  { id: 3, name: 'Andalus' },
  { id: 4, name: 'Ardiya' },
  { id: 5, name: 'Khaitan' },
  { id: 6, name: 'Qurain' },
  { id: 7, name: 'Jahra' },
  { id: 8, name: 'Rigai' },
];

const LoginForm = () => {
  const navigate = useNavigate();
  const adminState = useContext(AdminStateContext);
  const fetchData = adminState?.fetchData;

  // Load branches
  const [branchesList, setBranchesList] = useState(() => {
    const savedBranchesStr = localStorage.getItem('branches_list');
    if (savedBranchesStr) {
      try {
        const parsed = JSON.parse(savedBranchesStr);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return defaultBranches;
  });

  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (branchesList && branchesList.length > 0) {
      return branchesList[0].id || branchesList[0]._id || '';
    }
    return 1;
  });

  // Fetch branches dynamically on load
  useEffect(() => {
    api.get('/branches/public')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setBranchesList(res.data);
          // Set initial branch selection if the current selection is not valid in the new list
          setSelectedBranchId((prevId) => {
            const hasCurrentSelected = res.data.some(b => String(b.id || b._id) === String(prevId));
            return hasCurrentSelected ? prevId : (res.data[0].id || res.data[0]._id);
          });
          // Cache the branches in localStorage
          localStorage.setItem('branches_list', JSON.stringify(res.data));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch public branches:', err);
      });
  }, []);

  // Validation errors
  const [errors, setErrors] = useState({});

  // Helper autofills for testing
  const testingAccounts = [
    { label: 'Super Admin', email: 'superadmin@tuhama.com', pass: 'admin123' },
    { label: 'Admin', email: 'patricia@tuhama.com', pass: 'admin123' },
    { label: 'Counter Staff', email: 'kevin@tuhama.com', pass: 'staff123' },
    { label: 'Delivery Staff', email: 'robert@tuhama.com', pass: 'rider123' }
  ];

  const handleAutofill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrors({});

    if (acc.email === 'patricia@tuhama.com') {
      const match = branchesList.find(b => b.name === 'Andalus');
      if (match) setSelectedBranchId(match.id || match._id);
    } else if (acc.email === 'kevin@tuhama.com' || acc.email === 'robert@tuhama.com') {
      const match = branchesList.find(b => b.name === 'Mishrif');
      if (match) setSelectedBranchId(match.id || match._id);
    }

    toast.info(`Autofilled credentials for ${acc.label}`, {
      position: "top-right",
      autoClose: 1500,
      theme: "dark"
    });
  };

  // Field validation
  const validateForm = () => {
    const tempErrors = {};

    // Email check
    if (!email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Please enter a valid email address';
    }

    // Password check
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form', {
        position: 'top-right',
        theme: 'dark'
      });
      return;
    }

    setIsLoading(true);

    api.post('/auth/login', {
      email,
      password,
      branchId: selectedBranchId
    })
    .then((response) => {
      setIsLoading(false);
      const { token, refreshToken, user } = response.data;

      const activeLoggedInBranch = user.branchId || selectedBranchId || 'All';

      // Save credentials to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('selected_branch', activeLoggedInBranch);

      if (adminState && typeof adminState.setSelectedBranch === 'function') {
        adminState.setSelectedBranch(activeLoggedInBranch);
      }

      if (fetchData) {
        fetchData();
      }

      toast.success(`Welcome back, ${user.name}!`, {
        position: "top-right",
        theme: "dark"
      });

      // Role based routing redirection
      if (user.role === 'Super Admin') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'Admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'Counter Staff') {
        navigate('/counter/dashboard');
      } else if (user.role === 'Delivery Staff') {
        navigate('/delivery/dashboard');
      } else {
        navigate('/admin/dashboard'); // Fallback
      }
    })
    .catch((err) => {
      setIsLoading(false);
      const errMsg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      toast.error(errMsg, {
        position: 'top-right',
        theme: 'dark'
      });
    });
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowForgotModal(true);
  };

  return (
    <div className="login-card-content">
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        {/* Email Address Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="email-input">Email Address</label>
          <div className="input-wrapper">
            <input
              id="email-input"
              type="email"
              className={`form-input ${errors.email ? 'border-red-500' : ''}`}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              disabled={isLoading}
              required
            />
            <FiMail className="input-icon-prefix" />
          </div>
          {errors.email && (
            <span className="error-text">
              <FiAlertCircle className="inline" /> {errors.email}
            </span>
          )}
        </div>

        {/* Password Input */}
        <div className="form-group">
          <div className="label-container">
            <label className="form-label" htmlFor="password-input">Password</label>
          </div>
          <div className="input-wrapper">
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              className={`form-input ${errors.password ? 'border-red-500' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              disabled={isLoading}
              required
            />
            <FiLock className="input-icon-prefix" />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <span className="error-text">
              <FiAlertCircle className="inline" /> {errors.password}
            </span>
          )}
        </div>

        {/* Branch Selector Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="branch-input">Branch</label>
          <div className="input-wrapper">
            <select
              id="branch-input"
              className="form-input appearance-none"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={isLoading}
              style={{ background: 'rgba(15, 23, 42, 0.45)', color: '#fff', cursor: 'pointer', WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              {branchesList.map((b) => {
                const bId = b.id || b._id;
                return (
                  <option key={bId} value={bId} style={{ background: '#0f172a', color: '#fff' }}>
                    {b.name}
                  </option>
                );
              })}
            </select>
            <FiMapPin className="input-icon-prefix" />
          </div>
        </div>

        {/* Action controls (Remember Me & Forgot Password) */}
        <div className="form-actions">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <div className="custom-checkbox"></div>
            <span className="checkbox-label">Remember me</span>
          </label>
          <a
            href="#forgot-password"
            onClick={handleForgotPassword}
            className="forgot-password-link"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FiLoader className="spinner" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <FiArrowRight />
            </>
          )}
        </button>
      </form>

      {/* Quick Autofill testing suite */}
      <div className="testing-helper-card">
        <h4 className="helper-title">Quick Test Accounts</h4>
        <div className="helper-pills">
          {testingAccounts.map((acc, index) => {
            const isActive = email === acc.email && password === acc.pass;
            return (
              <button
                key={index}
                type="button"
                className={`helper-pill ${isActive ? 'helper-pill-active' : ''}`}
                onClick={() => handleAutofill(acc)}
                disabled={isLoading}
              >
                {isActive && <FiCheck className="w-3.5 h-3.5 text-cyan-400" />}
                {acc.label}
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Contact Administrator"
        size="sm"
      >
        <div className="text-center py-4 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <FiLock size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-primary">Contact Administrator</h3>
            <p className="text-sm text-secondary leading-relaxed max-w-xs mx-auto">
              This is a secure enterprise portal. Please contact your Branch Manager or Super Admin to reset your password.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForgotModal(false)}
            className="w-full rounded-2xl bg-blue-500/15 border border-blue-500/30 py-3 font-semibold text-blue-600 transition hover:bg-blue-500/20"
          >
            Okay, Understood
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default LoginForm;
