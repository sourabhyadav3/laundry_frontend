import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import { FiTrash2, FiSearch, FiCheck, FiX } from 'react-icons/fi';
import { formatCurrency, generateInvoicePDF, getNextBranchOrderNo } from '../../utils/exportUtils';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getBilingualGarmentNames } from '../../utils/garmentTranslations';
import { getGarmentPriceForService } from '../../utils/garmentPricing';

const SERVICE_MODES = [
  { id: 'Normal', label: 'Normal / Wash & Iron', key: 'normalService', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { id: 'Iron Only', label: 'Iron Only', key: 'ironOnlyService', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { id: 'Dry Cleaning', label: 'Dry Cleaning Only', key: 'dryCleanService', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
  { id: 'Urgent', label: 'Express', key: 'urgentService', color: 'bg-rose-600 hover:bg-rose-700 text-white' },
];

// Light mode: vibrant fills that pop on the sky-blue background
const CARD_COLORS_LIGHT = [
  'bg-blue-200 border-blue-400 text-blue-900 shadow-blue-100',
  'bg-emerald-200 border-emerald-400 text-emerald-900 shadow-emerald-100',
  'bg-amber-200 border-amber-400 text-amber-900 shadow-amber-100',
  'bg-violet-200 border-violet-400 text-violet-900 shadow-violet-100',
  'bg-rose-200 border-rose-400 text-rose-900 shadow-rose-100',
  'bg-teal-200 border-teal-400 text-teal-900 shadow-teal-100',
];

// Dark mode: deep translucent fills — unchanged from before
const CARD_COLORS_DARK = [
  'bg-blue-950/40 border-blue-900/40 text-blue-200',
  'bg-emerald-950/40 border-emerald-900/40 text-emerald-200',
  'bg-amber-950/40 border-amber-900/40 text-amber-200',
  'bg-purple-950/40 border-purple-900/40 text-purple-200',
  'bg-cyan-950/40 border-cyan-900/40 text-cyan-200',
];

const DEFAULT_AREAS = [
  'Salmiya', 'Hawally', 'Mishrif', 'Kuwait City', 'Rumaithiya', 'Jabriya',
  'Fahaheel', 'Farwaniya', 'Mahboula', 'Egaila', 'Ahmadi', 'Jahra', 'Khaitan', 'Bneid Al-Gar'
];

const MakeInvoice = () => {
  const { customers, orders, addOrder, setCustomers, updateCustomer, catalog, setCatalog, selectedBranch, payments, setPayments, services, addCustomer } = useContext(AdminStateContext);
  const navigate = useNavigate();
  const { language, t, tr } = useLanguage();
  const { theme } = useTheme();

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isDeliveryRole = storedUser.role === 'Delivery Staff' || storedUser.role === 'Driver';
  const draftFormKey = isDeliveryRole ? 'delivery_draft_invoice_form' : 'counter_draft_invoice_form';
  const draftItemsKey = isDeliveryRole ? 'delivery_draft_invoice_items' : 'counter_draft_invoice_items';

  // Pick card color set based on active theme
  const CARD_COLORS = theme === 'light' ? CARD_COLORS_LIGHT : CARD_COLORS_DARK;

  const getGarmentDisplayName = (catalogItemOrName) => {
    const name = typeof catalogItemOrName === 'string' ? catalogItemOrName : catalogItemOrName?.name;
    if (language === 'ar') {
      return getBilingualGarmentNames(name, catalog).ar;
    }
    return name;
  };

  const getTranslatedItemName = (name) => getGarmentDisplayName(name);

  const getTranslatedServiceMode = (mode) => {
    if (language !== 'ar') return mode;
    if (mode === 'Express Iron & Wash') return 'غسيل وكوي مستعجل';
    if (mode === 'Iron & Wash') return 'غسيل وكوي عادي';
    if (mode === 'Express Iron') return 'كوي مستعجل';
    if (mode === 'Iron Only') return 'كوي عادي';
    if (mode === 'Dry Cleaning') return t('counter.makeInvoice.dryCleanService');
    const foundMode = SERVICE_MODES.find((m) => m.id === mode);
    if (foundMode) {
      return t(`counter.makeInvoice.${foundMode.key}`) || mode;
    }
    return tr(mode) || mode;
  };

  // Basic Page State
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(draftFormKey);
    const defaults = {
      customerId: '',
      phoneSearch: '',
      expectedDeliveryDate: '',
      expectedDeliveryTime: '',
      notes: '',
      paperInvNo: '',
      discountChecked: false,
      discountPercent: 0,
      discountValue: 0,
      useFreeBalance: false,
      deliveryMode: 'branch',
    };
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return {
      ...defaults,
      ...parsed,
      deliveryMode: 'branch',
    };
  });

  const getInitialQuickCustomerForm = (query = '') => {
    const trimmed = String(query || '').trim();
    const isDigits = /^\d+$/.test(trimmed);
    return {
      customerNo: 'Auto-generated',
      englishName: isDigits ? '' : trimmed,
      arabicName: '',
      phone: isDigits ? trimmed : '',
      phones: [isDigits ? trimmed : '', '', '', ''],
      areaName: '',
      partNo: '',
      street: '',
      jadda: '',
      houseNo: '',
      flatNo: '',
      levelNo: '',
      paciNo: '',
      addressNotes: '',
      insuranceAmount: '0.000',
      isSubscriber: false,
      customDiscountRate: '',
      date: new Date().toISOString().split('T')[0],
      invoicesCount: 0,
      lastInvoiceDate: '',
      freeBalance: 0,
      freeTotal: 0,
      email: '',
      status: 'Active',
      notes: '',
    };
  };

  // Quick Add Customer Modal state
  const [showQuickAddCustomerModal, setShowQuickAddCustomerModal] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState(() => getInitialQuickCustomerForm(''));
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);

  // Inactive Customer Alert Modal state
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveCustomerData, setInactiveCustomerData] = useState(null);

  const handleReactivateCustomer = async () => {
    if (!inactiveCustomerData) return;
    try {
      const updated = {
        ...inactiveCustomerData,
        status: 'Active',
        inactiveReason: ''
      };
      const ok = await updateCustomer(inactiveCustomerData.id, updated);
      if (ok) {
        setShowInactiveModal(false);
        setForm((prev) => ({
          ...prev,
          customerId: updated.id,
          phoneSearch: updated.phone,
        }));
        setCustomerSearchQuery('');
        setShowSearchResults(false);
        toast.success(language === 'ar' ? 'تم تفعيل حساب العميل بنجاح' : 'Customer account reactivated successfully');
      }
    } catch (e) {
      toast.error('Failed to reactivate customer');
    }
  };

  const handleOpenQuickAddCustomer = (query = '') => {
    setQuickCustomerForm(getInitialQuickCustomerForm(query));
    setShowSearchResults(false);
    setShowQuickAddCustomerModal(true);
  };

  const handleSaveQuickCustomer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const mainName = (quickCustomerForm.englishName || quickCustomerForm.name || '').trim();
    const mainPhone = (quickCustomerForm.phones?.[0] || quickCustomerForm.phone || '').trim();

    if (!mainName || !mainPhone) {
      toast.error(language === 'ar' ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Customer Name and Phone Number are required.');
      return;
    }
    setIsSavingQuickCustomer(true);
    try {
      const payload = {
        ...quickCustomerForm,
        name: mainName,
        englishName: mainName,
        phone: mainPhone,
        phones: (quickCustomerForm.phones || [mainPhone]).map(p => String(p).trim()).filter(Boolean),
        branchId: selectedBranch?._id || selectedBranch?.id || '',
      };
      const created = await addCustomer(payload);
      if (created) {
        handleSelectCustomer(created);
        setShowQuickAddCustomerModal(false);
      }
    } catch (err) {
      toast.error('Failed to create customer');
    } finally {
      setIsSavingQuickCustomer(false);
    }
  };

  const [activeGarmentIdx, setActiveGarmentIdx] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = draggedIdx;
    setDraggedIdx(null);
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    setCatalog(prev => {
      const newList = [...prev];
      const [draggedItem] = newList.splice(sourceIndex, 1);
      newList.splice(targetIndex, 0, draggedItem);
      
      const orderKeys = newList.map(g => g.key || g.name);
      localStorage.setItem('spinclean_catalog_order', JSON.stringify(orderKeys));
      
      return newList;
    });
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  useEffect(() => {
    const savedOrder = localStorage.getItem('spinclean_catalog_order');
    if (savedOrder && catalog.length > 0) {
      try {
        const orderKeys = JSON.parse(savedOrder);
        const currentOrder = catalog.map(g => g.key || g.name);
        if (JSON.stringify(currentOrder) !== savedOrder) {
          setCatalog(prev => {
            const sorted = [...prev].sort((a, b) => {
              const indexA = orderKeys.indexOf(a.key || a.name);
              const indexB = orderKeys.indexOf(b.key || b.name);
              if (indexA === -1 && indexB === -1) return 0;
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            });
            return sorted;
          });
        }
      } catch (e) {
        console.error("Failed to parse catalog order", e);
      }
    }
  }, [catalog, setCatalog]);
  const [quickServiceMode, setQuickServiceMode] = useState('Iron & Wash'); // Default service mode
  const [mismatchError, setMismatchError] = useState(null);

  // Size Selection Modal
  const [selectedGarmentForSize, setSelectedGarmentForSize] = useState(null);
  // Carpet Size Modal
  const [selectedGarmentForCarpet, setSelectedGarmentForCarpet] = useState(null);
  const [carpetHeightM, setCarpetHeightM] = useState('');
  const [carpetWidthM, setCarpetWidthM] = useState('');

  const [orderItems, setOrderItems] = useState(() => {
    const saved = localStorage.getItem(draftItemsKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [editingLineTotalIdx, setEditingLineTotalIdx] = useState(null);
  const [editingLineTotalValue, setEditingLineTotalValue] = useState('');
  const [editingSubtotal, setEditingSubtotal] = useState(false);
  const [editingSubtotalValue, setEditingSubtotalValue] = useState('');
  const [paymentMode, setPaymentMode] = useState('full'); // 'full' | 'partial'
  const [amountReceived, setAmountReceived] = useState('');
  const [isPrintFlow, setIsPrintFlow] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const customerDropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(draftFormKey, JSON.stringify(form));
  }, [form, draftFormKey]);

  useEffect(() => {
    localStorage.setItem(draftItemsKey, JSON.stringify(orderItems));
  }, [orderItems, draftItemsKey]);

  const clearDraftInvoice = () => {
    localStorage.removeItem(draftFormKey);
    localStorage.removeItem(draftItemsKey);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Current Date/Time for display
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lock parent scroll on desktop only for this POS page
  useEffect(() => {
    const adminContent = document.querySelector('.admin-content');
    const isDesktop = window.innerWidth >= 1024;
    if (adminContent && isDesktop) {
      adminContent.style.overflow = 'hidden';
    }
    return () => {
      if (adminContent) {
        adminContent.style.overflow = '';
      }
    };
  }, []);

  // Set default delivery date to 3 days from now if not already set
  useEffect(() => {
    if (!form.expectedDeliveryDate) {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      const dateString = date.toISOString().split('T')[0];
      setForm((prev) => ({ ...prev, expectedDeliveryDate: dateString }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered Customers based on Query
  const filteredCustomersList = useMemo(() => {
    if (!customerSearchQuery) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery)
    );
  }, [customers, customerSearchQuery]);

  // Selected Customer Details
  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => String(c.id) === String(form.customerId)) || null;
  }, [customers, form.customerId]);

  const customerInputDisplay =
    customerSearchQuery !== '' || showSearchResults
      ? customerSearchQuery
      : selectedCustomerObj
        ? `${selectedCustomerObj.name} (${selectedCustomerObj.phone})`
        : '';

  // Billing Calculations
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [orderItems]);

  const discountAmount = useMemo(() => {
    if (!form.discountChecked) return 0;
    let amt = 0;
    if (form.discountPercent > 0) {
      amt += subtotal * (form.discountPercent / 100);
    }
    if (form.discountValue > 0) {
      amt += Number(form.discountValue);
    }
    return Math.min(amt, subtotal);
  }, [subtotal, form.discountChecked, form.discountPercent, form.discountValue]);

  const tax = 0; // Tax removed
  const taxRate = 0;

  const customerFreeBalance = Number(selectedCustomerObj?.freeBalance || 0);

  const freeBalanceDeduction = useMemo(() => {
    if (!form.useFreeBalance || customerFreeBalance <= 0) return 0;
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    return Math.min(customerFreeBalance, afterDiscount);
  }, [form.useFreeBalance, customerFreeBalance, subtotal, discountAmount]);

  const totalAmount = useMemo(() => {
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const finalVal = Math.max(0, afterDiscount - freeBalanceDeduction);
    return Math.round(finalVal * 1000) / 1000;
  }, [subtotal, discountAmount, freeBalanceDeduction]);

  // Handlers
  const handlePhoneSearch = () => {
    if (!form.phoneSearch) {
      toast.info('Please enter a phone number to search');
      return;
    }
    const match = customers.find((c) => c.phone.includes(form.phoneSearch) || (c.phones && c.phones.some(p => p.includes(form.phoneSearch))));
    if (match) {
      if (match.status === 'Inactive') {
        setInactiveCustomerData(match);
        setShowInactiveModal(true);
        return;
      }
      const isCustomDiscount = match.customerLevel === 'Custom Discount';
      const discountVal = isCustomDiscount ? Number(match.customDiscountRate || 0) : Number(match.customerLevel || 0);
      const hasDiscount = discountVal > 0;
      setForm((prev) => ({
        ...prev,
        customerId: match.id,
        phoneSearch: match.phone,
        discountChecked: hasDiscount ? true : false,
        discountPercent: hasDiscount ? discountVal : 0,
        discountValue: 0
      }));
      setCustomerSearchQuery('');
      toast.success(`Selected customer: ${match.name}`);
    } else {
      toast.error('Customer not found with that phone number');
    }
  };

  const handleSelectCustomer = (cust) => {
    if (!cust) return;
    if (cust.status === 'Inactive') {
      setInactiveCustomerData(cust);
      setShowInactiveModal(true);
      return;
    }
    const isCustomDiscount = cust.customerLevel === 'Custom Discount';
    const discountVal = isCustomDiscount ? Number(cust.customDiscountRate || 0) : Number(cust.customerLevel || 0);
    const hasDiscount = discountVal > 0;
    setForm((prev) => ({
      ...prev,
      customerId: cust.id,
      phoneSearch: cust.phone,
      discountChecked: hasDiscount ? true : false,
      discountPercent: hasDiscount ? discountVal : 0,
      discountValue: 0
    }));
    setCustomerSearchQuery('');
    setShowSearchResults(false);
  };

  const addGarment = (g, service, modifierNotes = '') => {
    if (orderItems.length > 0) {
      const hasExpress = orderItems.some(item => item.service.toLowerCase().includes('express'));
      const isNewItemExpress = service.toLowerCase().includes('express');
      
      if (hasExpress && !isNewItemExpress) {
        setMismatchError(language === 'ar' ? 'لا يمكنك إضافة خدمة عادية مع خدمة مستعجلة في نفس الفاتورة. يرجى إنشاء فاتورة منفصلة.' : 'You cannot add a normal item when there are express items. Please create a separate invoice.');
        return;
      }
      if (!hasExpress && isNewItemExpress) {
        setMismatchError(language === 'ar' ? 'لا يمكنك إضافة خدمة مستعجلة مع خدمة عادية في نفس الفاتورة. يرجى إنشاء فاتورة منفصلة.' : 'You cannot add an express item when there are normal items. Please create a separate invoice.');
        return;
      }
    }

    setOrderItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: g.name,
        nameAr: g.nameAr || '',
        service: service,
        quantity: 1,
        unitPrice: g.customPrice !== undefined ? g.customPrice : getGarmentPriceForService(g, service),
        color: g.color || '#3b82f6',
        notes: modifierNotes,
      },
    ]);
  };

  const updateQuantity = (idx, amount) => {
    setOrderItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], quantity: Math.max(1, copy[idx].quantity + amount) };
      return copy;
    });
  };

  const updateItemNotes = (idx, val) => {
    setOrderItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], notes: val };
      return copy;
    });
  };

  const startEditLineTotal = (idx) => {
    const item = orderItems[idx];
    if (!item) return;
    const currentTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    setEditingLineTotalIdx(idx);
    setEditingLineTotalValue(String(currentTotal.toFixed(3)));
  };

  const saveEditedLineTotal = (idx) => {
    const parsedTotal = Number(editingLineTotalValue);
    if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال قيمة صحيحة' : 'Please enter a valid total');
      return;
    }

    setOrderItems((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      if (!item) return prev;
      const qty = Number(item.quantity) || 1;
      const unitPrice = Math.round((parsedTotal / qty) * 1000) / 1000;
      copy[idx] = { ...item, unitPrice };
      return copy;
    });

    setEditingLineTotalIdx(null);
    setEditingLineTotalValue('');
  };

  const startEditSubtotal = () => {
    if (orderItems.length === 0) return;
    setEditingSubtotal(true);
    setEditingSubtotalValue(String(subtotal.toFixed(3)));
  };

  const saveEditedSubtotal = () => {
    const parsedSubtotal = Number(editingSubtotalValue);
    if (!Number.isFinite(parsedSubtotal) || parsedSubtotal < 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال قيمة صحيحة' : 'Please enter a valid subtotal');
      return;
    }
    if (orderItems.length === 0) return;

    const currentSubtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    if (currentSubtotal === 0) return;

    setOrderItems((prev) => {
      const copy = prev.map(item => ({ ...item }));
      let runningSum = 0;

      for (let i = 0; i < copy.length - 1; i++) {
        const item = copy[i];
        const ratio = parsedSubtotal / currentSubtotal;
        const newUnitPrice = Math.round((item.unitPrice * ratio) * 1000) / 1000;
        item.unitPrice = newUnitPrice;
        runningSum += item.quantity * newUnitPrice;
      }

      const lastIndex = copy.length - 1;
      const lastItem = copy[lastIndex];
      const remainingAmount = parsedSubtotal - runningSum;
      const lastQty = lastItem.quantity || 1;
      lastItem.unitPrice = Math.max(0, Math.round((remainingAmount / lastQty) * 1000) / 1000);

      return copy;
    });

    setEditingSubtotal(false);
    setEditingSubtotalValue('');
  };

  const removeItem = (idx) => {
    setOrderItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setForm((f) => ({ ...f, deliveryMode: 'branch', expectedDeliveryDate: '', expectedDeliveryTime: '' }));
      }
      return next;
    });
  };

  const handleReset = () => {
    setForm({
      customerId: '',
      phoneSearch: '',
      expectedDeliveryDate: '',
      expectedDeliveryTime: '',
      notes: '',
      paperInvNo: '',
      discountChecked: false,
      discountPercent: 0,
      discountValue: 0,
      useFreeBalance: false,
      deliveryMode: 'branch',
    });
    setOrderItems([]);
    setCustomerSearchQuery('');
    setActiveGarmentIdx(null);
    setEditingLineTotalIdx(null);
    setEditingLineTotalValue('');
    setEditingSubtotal(false);
    setEditingSubtotalValue('');
    clearDraftInvoice();
    toast.info('Invoice template reset');
  };

  // ── Settle & Pay ────────────────────────────────────────────────
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'card' | 'link' | 'wamt'

  useEffect(() => {
    if (showSettleModal) {
      setPaymentMode('full');
      setAmountReceived(String(totalAmount.toFixed(3)));
    }
  }, [showSettleModal, totalAmount]);
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [linkForm, setLinkForm] = useState({ email: '' });
  const [wamtForm, setWamtForm] = useState({ mobile: '' });

  // Modifiers State
  const [selectedGarmentForModifier, setSelectedGarmentForModifier] = useState(null);
  const [modifierForm, setModifierForm] = useState({
      neel: false,
      colorChoice: '',
      fold: 'Normal',
      starch: 'Without',
  });

  const validateInvoice = () => {
    if (!form.customerId) { toast.error(language === 'ar' ? 'يرجى اختيار العميل' : 'Please select a customer'); return false; }
    const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
    if (customerObj && customerObj.status === 'Inactive') {
      setInactiveCustomerData(customerObj);
      setShowInactiveModal(true);
      toast.error(language === 'ar' ? `حساب العميل موقوف: ${customerObj.inactiveReason || ''}` : `Customer account is inactive: ${customerObj.inactiveReason || ''}`);
      return false;
    }
    if (orderItems.length === 0) { toast.error(language === 'ar' ? 'يرجى إضافة قطعة واحدة على الأقل' : 'Add at least one garment'); return false; }
    return true;
  };

  const handleSettleAndPay = (method) => {
    const received = paymentMode === 'full' ? totalAmount : Number(amountReceived);
    if (isNaN(received) || received < 0 || received > totalAmount) {
      toast.error('Please enter a valid amount');
      return;
    }

    const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
    const orderId = Date.now();
    const branchId = (selectedBranch && selectedBranch !== 'All') ? selectedBranch : (storedUser.assignedBranch || storedUser.branchId || storedUser.branch || null);
    const orderNo = getNextBranchOrderNo(orders, branchId, 'INV');

    const remaining = totalAmount - received;
    let finalPaymentStatus = 'Paid';
    if (remaining > 0) {
      finalPaymentStatus = received === 0 ? 'Pending' : 'Partial';
    }

    const primaryServiceType = (orderItems.length > 0 && orderItems[0].service) ? orderItems[0].service : quickServiceMode;

    const newOrder = {
      id: orderId,
      number: orderNo,
      customerId: customerObj.id,
      customerName: customerObj.name,
      isSubscriber: customerObj.isSubscriber || Number(customerObj.insuranceAmount || 0) >= 20,
      serviceType: primaryServiceType,
      status: 'Waiting',
      deliveryStatus: 'Waiting',
      isHomeDelivery: form.deliveryMode === 'home',
      deliveryType: form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup',
      paymentStatus: finalPaymentStatus,
      paymentMethod: method,
      amount: subtotal,
      tax,
      taxRate,
      discount: discountAmount,
      freeBalanceUsed: freeBalanceDeduction,
      totalAmount,
      amountPaid: received,
      date: new Date().toISOString().split('T')[0],
      pickupDate: new Date().toISOString().split('T')[0],
      deliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryTime: form.expectedDeliveryTime || '',
      paperInvoiceNo: form.paperInvNo,
      itemDetails: orderItems.map((it) => ({
        name: it.name,
        nameAr: it.nameAr || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        service: it.service,
        color: it.color || (catalog?.find(c => c.name?.toLowerCase() === it.name?.toLowerCase() || it.name?.toLowerCase().startsWith(c.name?.toLowerCase()))?.color) || '#3b82f6',
        notes: it.notes,
      })),
      notes: form.notes,
      createdBy: storedUser.name || 'Counter Staff',
      staffName: storedUser.name || 'Counter Staff',
      branchId: branchId,
    };

    addOrder(newOrder);

    // Add payment record
    if (received > 0) {
      const nextPaymentId = payments && payments.length
        ? Math.max(...payments.map((p) => Number(p.id) || 0)) + 1
        : 1;
      const newPayment = {
        id: nextPaymentId,
        orderId: orderId,
        orderNumber: orderNo,
        customer: customerObj.name,
        amount: received,
        method: method,
        status: 'Paid',
        date: new Date().toISOString().split('T')[0],
      };
      if (setPayments) setPayments((prev) => [newPayment, ...prev]);
    }

    // Update customer order count, balance, and freeBalance in state
    setCustomers(
      customers.map((c) =>
        c.id === customerObj.id
          ? {
              ...c,
              totalOrders: (c.totalOrders || 0) + 1,
              balance: (c.balance || 0) + remaining,
              freeBalance: Math.max(0, Number(c.freeBalance || 0) - freeBalanceDeduction),
            }
          : c
      )
    );

    if (method === 'Cash' || isPrintFlow) {
      generateInvoicePDF(newOrder);
    }

    setShowSettleModal(false);
    setPaymentStep('select');
    clearDraftInvoice();
    toast.success(`✅ Invoice ${orderNo} settled via ${method}`);
    const redirectUrl = window.location.pathname.startsWith('/delivery') ? '/delivery/invoices' : '/counter/invoices';
    navigate(redirectUrl);
  };

  const handlePrintDirectUnpaid = () => {
    const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
    const orderId = Date.now();
    const branchId = (selectedBranch && selectedBranch !== 'All') ? selectedBranch : (storedUser.assignedBranch || storedUser.branchId || storedUser.branch || null);
    const orderNo = getNextBranchOrderNo(orders, branchId, 'INV');

    const primaryServiceType = (orderItems.length > 0 && orderItems[0].service) ? orderItems[0].service : quickServiceMode;

    const newOrder = {
      id: orderId,
      number: orderNo,
      customerId: customerObj.id,
      customerName: customerObj.name,
      isSubscriber: customerObj.isSubscriber || Number(customerObj.insuranceAmount || 0) >= 20,
      serviceType: primaryServiceType,
      status: 'Waiting',
      deliveryStatus: 'Waiting',
      isHomeDelivery: form.deliveryMode === 'home',
      deliveryType: form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup',
      paymentStatus: 'Pending',
      paymentMethod: 'Unpaid',
      amount: subtotal,
      tax,
      taxRate,
      discount: discountAmount,
      freeBalanceUsed: freeBalanceDeduction,
      totalAmount,
      amountPaid: 0,
      date: new Date().toISOString().split('T')[0],
      pickupDate: new Date().toISOString().split('T')[0],
      deliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryTime: form.expectedDeliveryTime || '',
      paperInvoiceNo: form.paperInvNo,
      itemDetails: orderItems.map((it) => ({
        name: it.name,
        nameAr: it.nameAr || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        service: it.service,
        notes: it.notes,
      })),
      notes: form.notes,
      createdBy: storedUser.name || 'Counter Staff',
      staffName: storedUser.name || 'Counter Staff',
      branchId: branchId,
    };

    addOrder(newOrder);

    // Update customer order count, balance, and freeBalance in state
    setCustomers(
      customers.map((c) =>
        c.id === customerObj.id
          ? {
              ...c,
              totalOrders: (c.totalOrders || 0) + 1,
              balance: (c.balance || 0) + totalAmount,
              freeBalance: Math.max(0, Number(c.freeBalance || 0) - freeBalanceDeduction),
            }
          : c
      )
    );

    generateInvoicePDF(newOrder);

    clearDraftInvoice();
    toast.success(`✅ Invoice ${orderNo} created (Unpaid) and printed`);
    const redirectUrl = window.location.pathname.startsWith('/delivery') ? '/delivery/invoices' : '/counter/invoices';
    navigate(redirectUrl);
  };

  const handleSettleAndPayDirectUnpaidWithoutPrint = () => {
    const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
    const orderId = Date.now();
    const branchId = (selectedBranch && selectedBranch !== 'All') ? selectedBranch : (storedUser.assignedBranch || storedUser.branchId || storedUser.branch || null);
    const orderNo = getNextBranchOrderNo(orders, branchId, 'INV');

    const primaryServiceType = (orderItems.length > 0 && orderItems[0].service) ? orderItems[0].service : quickServiceMode;

    const newOrder = {
      id: orderId,
      number: orderNo,
      customerId: customerObj.id,
      customerName: customerObj.name,
      isSubscriber: customerObj.isSubscriber || Number(customerObj.insuranceAmount || 0) >= 20,
      serviceType: primaryServiceType,
      status: 'Waiting',
      deliveryStatus: 'Waiting',
      isHomeDelivery: form.deliveryMode === 'home',
      deliveryType: form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup',
      paymentStatus: 'Pending',
      paymentMethod: 'Unpaid',
      amount: subtotal,
      tax,
      taxRate,
      discount: discountAmount,
      freeBalanceUsed: freeBalanceDeduction,
      totalAmount,
      amountPaid: 0,
      date: new Date().toISOString().split('T')[0],
      pickupDate: new Date().toISOString().split('T')[0],
      deliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryTime: form.expectedDeliveryTime || '',
      paperInvoiceNo: form.paperInvNo,
      itemDetails: orderItems.map((it) => ({
        name: it.name,
        nameAr: it.nameAr || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        service: it.service,
        notes: it.notes,
      })),
      notes: form.notes,
      createdBy: storedUser.name || 'Counter Staff',
      staffName: storedUser.name || 'Counter Staff',
      branchId: branchId,
    };

    addOrder(newOrder);

    // Update customer order count, balance, and freeBalance in state
    setCustomers(
      customers.map((c) =>
        c.id === customerObj.id
          ? {
              ...c,
              totalOrders: (c.totalOrders || 0) + 1,
              balance: (c.balance || 0) + totalAmount,
              freeBalance: Math.max(0, Number(c.freeBalance || 0) - freeBalanceDeduction),
            }
          : c
      )
    );

    setShowSettleModal(false);
    setPaymentStep('select');
    clearDraftInvoice();
    toast.success(`✅ Invoice ${orderNo} created as Unpaid`);
    const redirectUrl = window.location.pathname.startsWith('/delivery') ? '/delivery/invoices' : '/counter/invoices';
    navigate(redirectUrl);
  };



  const handleSendToWhatsApp = (phoneNumber, invoiceMessage) => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    if (!cleanPhone) {
      toast.error("Phone number is missing or invalid");
      return;
    }

    const encodedMessage = encodeURIComponent(invoiceMessage);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  };

  const handleSaveAndWhatsApp = () => {
    if (!form.customerId) {
      toast.error('Please select or add a customer');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Add at least one garment to create invoice');
      return;
    }

    const customerObj = customers.find((c) => String(c.id) === String(form.customerId));
    const orderId = Date.now();
    const branchId = (selectedBranch && selectedBranch !== 'All') ? selectedBranch : (storedUser.assignedBranch || storedUser.branchId || storedUser.branch || null);
    const orderNo = getNextBranchOrderNo(orders, branchId, 'INV');

    const primaryServiceType = (orderItems.length > 0 && orderItems[0].service) ? orderItems[0].service : quickServiceMode;

    addOrder({
      id: orderId,
      number: orderNo,
      customerId: customerObj.id,
      customerName: customerObj.name,
      isSubscriber: customerObj.isSubscriber || Number(customerObj.insuranceAmount || 0) >= 20,
      serviceType: primaryServiceType,
      status: 'Waiting',
      deliveryStatus: 'Waiting',
      isHomeDelivery: form.deliveryMode === 'home',
      deliveryType: form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup',
      paymentStatus: 'Pending',
      amount: subtotal,
      tax,
      taxRate,
      discount: discountAmount,
      freeBalanceUsed: freeBalanceDeduction,
      totalAmount,
      date: new Date().toISOString().split('T')[0],
      pickupDate: new Date().toISOString().split('T')[0],
      deliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryDate: form.deliveryMode === 'home' ? (form.expectedDeliveryDate || '') : '',
      expectedDeliveryTime: form.expectedDeliveryTime || '',
      paperInvoiceNo: form.paperInvNo,
      itemDetails: orderItems.map((it) => ({
        name: it.name,
        nameAr: it.nameAr || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        service: it.service,
        notes: it.notes,
      })),
      notes: form.notes,
      createdBy: storedUser.name || 'Counter Staff',
      staffName: storedUser.name || 'Counter Staff',
      branchId: branchId,
    });

    // Update customer order count, balance, and freeBalance
    setCustomers(
      customers.map((c) =>
        c.id === customerObj.id
          ? {
              ...c,
              totalOrders: (c.totalOrders || 0) + 1,
              freeBalance: Math.max(0, Number(c.freeBalance || 0) - freeBalanceDeduction),
            }
          : c
      )
    );

    toast.success(`Invoice ${orderNo} saved successfully`);
    const itemsText = orderItems.map(it => `${it.name} (${it.quantity})`).join(', ');
    const deliveryTypeText = form.deliveryMode === 'home' ? 'Home Delivery' : 'Branch Pickup';
    const dateLine = form.deliveryMode === 'home' && form.expectedDeliveryDate ? `\nExpected Delivery Date: ${form.expectedDeliveryDate}` : '';
    const timeLine = form.expectedDeliveryTime ? `\nReady In / Delivery Time: ${form.expectedDeliveryTime}` : '';
    const waText = `Dear ${customerObj.name},\n\nInvoice Number: ${orderNo}\nOrder Items: ${itemsText}\nTotal Price: ${formatCurrency(totalAmount)}\nDelivery Type: ${deliveryTypeText}\nDelivery Status: Waiting${dateLine}${timeLine}`;

    handleSendToWhatsApp(customerObj.phone, waText);
    clearDraftInvoice();
    const redirectUrl = window.location.pathname.startsWith('/delivery') ? '/delivery/invoices' : '/counter/invoices';
    navigate(redirectUrl);
  };

  const locale = language === 'ar' ? 'ar-KW' : 'en-GB';
  const formattedTime = currentTime.toLocaleTimeString(locale, {
    timeZone: 'Asia/Kuwait',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString(locale, {
    timeZone: 'Asia/Kuwait',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  // The selected garment for the modal
  const selectedGarment = activeGarmentIdx !== null ? catalog[activeGarmentIdx] : null;

  return (
    <div 
        className="flex flex-col lg:h-full lg:overflow-hidden space-y-2 relative text-primary pb-6 lg:pb-0"
        onClickCapture={(e) => {
            if (selectedBranch === 'All') {
                e.stopPropagation();
                e.preventDefault();
                toast.warning(language === 'ar' ? "الرجاء تحديد فرع أولاً" : "Please select a branch first to perform actions");
            }
        }}
        onKeyDownCapture={(e) => {
            if (selectedBranch === 'All' && (e.key === 'Enter' || e.key === ' ')) {
                e.stopPropagation();
                e.preventDefault();
                toast.warning(language === 'ar' ? "الرجاء تحديد فرع أولاً" : "Please select a branch first to perform actions");
            }
        }}
    >

      {/* ===== SERVICE SELECTION MODAL ===== */}
      {selectedGarment && (() => {
        const isLight = theme === 'light';
        return (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(8px)',
              backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)'
            }}
            onClick={() => setActiveGarmentIdx(null)}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
              style={{
                background: isLight
                  ? 'linear-gradient(145deg, #fdfaf6 0%, #fffbf0 100%)'
                  : 'linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
                border: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isLight
                  ? '0 30px 80px -10px rgba(120,80,20,0.18), 0 0 0 1px rgba(232,213,176,0.6)'
                  : '0 30px 80px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent bar — same in both modes */}
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6)' }} />

              {/* Garment Info Header */}
              <div
                className="px-6 pt-6 pb-4 text-center"
                style={{ borderBottom: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)' }}
              >
                {selectedGarment.image ? (
                  <div className="flex justify-center mb-3">
                    <img src={selectedGarment.image} alt={selectedGarment.name} className="w-16 h-16 object-cover rounded-2xl shadow-md border border-black/10" />
                  </div>
                ) : (
                  <div className="text-5xl mb-3" role="img" aria-label={selectedGarment.name}>
                    {selectedGarment.icon}
                  </div>
                )}
                <h2 className={`text-lg font-extrabold tracking-tight ${isLight ? 'text-stone-800' : 'text-white'}`}>
                  {getGarmentDisplayName(selectedGarment)}
                </h2>
                <p className={`text-sm mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                  {t('counter.makeInvoice.garmentBasePrice') || 'Base price'}:{' '}
                  <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-cyan-400'}`}>
                    {formatCurrency(selectedGarment.price)}
                  </span>
                </p>
                <p className={`text-xs mt-2 font-medium ${isLight ? 'text-stone-400' : 'text-slate-500'}`}>
                  {t('counter.makeInvoice.selectServicePrompt') || 'Select a service type to add this item'}
                </p>
              </div>

              {/* Service Buttons */}
              <div className="p-5 flex flex-col gap-3">
                {/* Normal / Wash & Iron */}
                <button
                  type="button"
                  onClick={() => { addGarment(selectedGarment, 'Normal'); setActiveGarmentIdx(null); }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={isLight
                    ? { background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)', border: '1px solid #1d4ed8', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }
                    : { background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(29,78,216,0.25) 100%)', border: '1px solid rgba(59,130,246,0.35)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: isLight ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.2)' }}>🫧</div>
                  <div className="text-left flex-1">
                    <div className={`text-sm font-bold ${isLight ? 'text-white' : 'text-blue-300'}`}>
                      {t('counter.makeInvoice.normalService') || 'Normal / Wash & Iron'}
                    </div>
                    <div className={`text-xs mt-0.5 ${isLight ? 'text-blue-100' : 'text-blue-400/60'}`}>
                      {formatCurrency(selectedGarment.price)}
                    </div>
                  </div>
                  <div className={`opacity-70 text-lg ${isLight ? 'text-white' : 'text-blue-400'}`}>›</div>
                </button>

                {/* Iron Only */}
                <button
                  type="button"
                  onClick={() => { addGarment(selectedGarment, 'Iron Only'); setActiveGarmentIdx(null); }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={isLight
                    ? { background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', border: '1px solid #b45309', boxShadow: '0 4px 14px rgba(217,119,6,0.3)' }
                    : { background: 'linear-gradient(135deg, rgba(217,119,6,0.15) 0%, rgba(180,83,9,0.25) 100%)', border: '1px solid rgba(245,158,11,0.35)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: isLight ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.2)' }}>♨️</div>
                  <div className="text-left flex-1">
                    <div className={`text-sm font-bold ${isLight ? 'text-white' : 'text-amber-300'}`}>
                      {t('counter.makeInvoice.ironOnlyService') || 'Iron Only'}
                    </div>
                    <div className={`text-xs mt-0.5 ${isLight ? 'text-amber-100' : 'text-amber-400/60'}`}>
                      {formatCurrency(selectedGarment.price)}
                    </div>
                  </div>
                  <div className={`opacity-70 text-lg ${isLight ? 'text-white' : 'text-amber-400'}`}>›</div>
                </button>

                {/* Dry Cleaning */}
                <button
                  type="button"
                  onClick={() => { addGarment(selectedGarment, 'Dry Cleaning'); setActiveGarmentIdx(null); }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={isLight
                    ? { background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', border: '1px solid #6d28d9', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }
                    : { background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(109,40,217,0.25) 100%)', border: '1px solid rgba(139,92,246,0.35)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: isLight ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.2)' }}>✨</div>
                  <div className="text-left flex-1">
                    <div className={`text-sm font-bold ${isLight ? 'text-white' : 'text-purple-300'}`}>
                      {t('counter.makeInvoice.dryCleanService') || 'Dry Cleaning Only'}
                    </div>
                    <div className={`text-xs mt-0.5 ${isLight ? 'text-purple-100' : 'text-purple-400/60'}`}>
                      {formatCurrency(selectedGarment.price)}
                    </div>
                  </div>
                </button>
              </div>

              {/* Cancel Footer */}
              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() => setActiveGarmentIdx(null)}
                  className={`w-full py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${isLight
                    ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-100'
                    : 'text-slate-400 hover:text-white'
                    }`}
                  style={isLight
                    ? { background: '#fff1f2', border: '1px solid #fca5a5' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECTION 3: Main Split Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0 lg:overflow-hidden">
        <div className="lg:col-span-7 flex flex-col gap-2 min-h-0 lg:overflow-hidden">

      {/* SECTION 1: POS Top Controls Row */}
      <div className="grid grid-cols-1 xl:grid-cols-7 gap-2 shrink-0">

        {/* LED Final Price Display */}
        <div className="xl:col-span-3 bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-inner">
          <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
            <span>{t('counter.makeInvoice.totalPriceLabel') || "TOTAL PRICE"} ({orderItems.reduce((acc, it) => acc + it.quantity, 0)} {t('counter.makeInvoice.itemsLabel') || "items"})</span>
            {editingSubtotal ? (
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-mono">{t('counter.makeInvoice.subtotalLabel') || "SUB"}:</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={editingSubtotalValue}
                  onChange={(e) => setEditingSubtotalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditedSubtotal();
                    if (e.key === 'Escape') {
                      setEditingSubtotal(false);
                      setEditingSubtotalValue('');
                    }
                  }}
                  className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-right text-[10px] font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={saveEditedSubtotal}
                  className="text-emerald-500 hover:text-emerald-400"
                >
                  <FiCheck size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditSubtotal}
                className="text-slate-500 font-mono hover:text-blue-400 underline decoration-dotted underline-offset-2"
                title={language === 'ar' ? 'اضغط للتعديل' : 'Click to edit'}
                disabled={orderItems.length === 0}
              >
                {t('counter.makeInvoice.subtotalLabel') || "SUB"}: {formatCurrency(subtotal)}
              </button>
            )}
          </div>
          <div className="mt-2 text-right">
            <span className="font-mono text-2xl lg:text-3xl font-extrabold text-green-500 tracking-wider drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Form Inputs (Customer and Service Info) */}
        <div className="xl:col-span-4 surface-card border border-border rounded-2xl p-3 grid grid-cols-2 gap-2 shadow-md">
          {/* Customer Search & Selector */}
          <div className="relative col-span-2 sm:col-span-1" ref={customerDropdownRef}>
            <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
              {t('counter.makeInvoice.selectCustomer') || "Select Customer"} *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t('counter.makeInvoice.typeNameOrPhone') || "Type Name or Phone..."}
                value={customerInputDisplay}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => {
                  setShowSearchResults(true);
                  if (selectedCustomerObj && customerSearchQuery === '') {
                    setCustomerSearchQuery('');
                  }
                }}
                className={`w-full text-xs rounded-lg border bg-surface pl-8 pr-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  selectedCustomerObj && !showSearchResults && customerSearchQuery === ''
                    ? 'border-emerald-400/60 text-primary font-medium'
                    : 'border-border'
                }`}
              />
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none" />
            </div>

            {/* Live Autocomplete Results */}
            {showSearchResults && (
              <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                  {filteredCustomersList.length > 0 ? (
                    filteredCustomersList.map((c) => {
                      const isSub = c.isSubscriber || Number(c.insuranceAmount || 0) >= 20;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors ${
                            isSub
                              ? 'bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900/90 text-amber-900 dark:text-amber-100 font-bold border-l-4 border-l-amber-500'
                              : 'hover:bg-surface-alt text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold truncate">{c.name}</span>
                            {isSub && (
                              <span className="text-amber-500 text-xs shrink-0 select-none" title="Subscriber">⭐</span>
                            )}
                          </div>
                          <span className="text-secondary font-mono text-[10px] shrink-0 ml-1">{c.phone}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-xs text-secondary">
                      {t('counter.makeInvoice.noCustomerMatch') || "No customer matches query."}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenQuickAddCustomer(customerSearchQuery)}
                  className="w-full py-1.5 px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 border-t border-border/40 transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <span className="text-xs">➕</span>
                  <span className="whitespace-nowrap">{language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer'}</span>
                  {customerSearchQuery.trim() && (
                    <span className="bg-black/25 px-1.5 py-0.5 rounded text-[10px] font-mono font-normal truncate max-w-[100px]">
                      "{customerSearchQuery.trim()}"
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Display selected details */}
            {selectedCustomerObj && (() => {
              const isSub = selectedCustomerObj.isSubscriber || Number(selectedCustomerObj.insuranceAmount || 0) >= 20;
              return (
                <div className={`mt-1.5 p-2 rounded-lg border text-[11px] font-medium flex items-center justify-between gap-2 shadow-sm ${
                  isSub
                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-md'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400/60 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{t('counter.makeInvoice.selectedLabel') || "Selected"}: <strong>{selectedCustomerObj.name}</strong> ({selectedCustomerObj.phone})</span>
                  </div>
                  {isSub && (
                    <span className="text-amber-500 text-base shrink-0 select-none" title="Subscriber">⭐</span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Quick Phone Search */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
              {t('counter.makeInvoice.lookupPhone') || "Lookup Phone No"}
            </label>
            <div className="flex gap-1.5 min-w-0">
              <input
                type="tel"
                name="phoneSearch"
                placeholder={t('counter.makeInvoice.phoneNoPlaceholder') || "Phone No..."}
                value={form.phoneSearch}
                onChange={(e) => setForm((prev) => ({ ...prev, phoneSearch: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                className="min-w-0 flex-1 text-xs rounded-lg border border-border bg-surface px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
              <button
                type="button"
                onClick={handlePhoneSearch}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition"
                title={t('counter.makeInvoice.searchPhoneTooltip') || "Search Phone Number"}
              >
                &gt;&gt;
              </button>
            </div>
          </div>
        </div>



      </div>




        {/* Left Column: Garments Grid Catalog */}
        <div className="bg-surface border border-border rounded-2xl p-3 flex flex-col min-h-0 shadow-lg lg:overflow-hidden">
          <div className="flex flex-wrap xl:flex-nowrap justify-between items-start xl:items-center mb-2 pb-2 border-b border-border/50 shrink-0 gap-2">
            <div className="flex items-center gap-2 max-w-full min-w-0 flex-1">
              {/* Dynamic Status Logo */}
              {quickServiceMode?.includes('Express') ? (
                  <div className="flex items-center justify-center gap-1.5 bg-gradient-to-br from-red-500 to-rose-600 text-white px-3 py-2 rounded-lg shadow-md border border-red-400 w-auto h-11 shrink-0 animate-pulse">
                      <span className="text-[14px]">⚡</span>
                      <span className="text-[12px] font-bold tracking-wider text-white uppercase">{t('counter.makeInvoice.expressLabel')}</span>
                  </div>
              ) : (
                  <div className="flex items-center justify-center gap-1.5 bg-gradient-to-br from-blue-600 to-cyan-500 text-white px-3 py-2 rounded-lg shadow-md border border-blue-400 w-auto h-11 shrink-0">
                      <span className="text-[14px]">🫧</span>
                      <span className="text-[12px] font-bold tracking-wider text-white uppercase">{t('counter.makeInvoice.normalLabel')}</span>
                  </div>
              )}

              {/* Service Buttons Row */}
              <div className="flex flex-nowrap items-center gap-1.5 bg-surface-alt/75 border border-border/60 p-1 rounded-lg overflow-x-auto overflow-y-hidden min-w-0 h-11 no-scrollbar">
                  {(() => {
                      const getOrderScore = (name) => {
                          const n = String(name || '').toLowerCase().trim();
                          if (n === 'normal ironing' || n === 'iron only' || n === 'ironing') return 1;
                          if (n === 'wash & iron' || n === 'wash and iron' || n === 'normal wash & iron') return 2;
                          if (n === 'express ironing' || n === 'express iron') return 3;
                          if (n === 'express wash & iron' || n === 'express wash and iron') return 4;
                          if (!n.includes('express') && !n.includes('urgent')) return 2.5;
                          return 5;
                      };
                      const activeServices = (services || []).filter(s => s.status === 'Active');
                      const sorted = [...activeServices].sort((a, b) => getOrderScore(a.name) - getOrderScore(b.name));
                      return sorted.map((service) => (
                          <button
                              key={service.id}
                              type="button"
                              onClick={() => setQuickServiceMode(service.name)}
                              className={`text-[12px] font-black px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
                                  quickServiceMode === service.name
                                      ? 'bg-purple-600 border-purple-700 text-white shadow-sm scale-105'
                                      : 'bg-white border-slate-300 text-black hover:bg-purple-50 hover:border-purple-300 dark:bg-slate-100 dark:border-slate-300 dark:text-black dark:hover:bg-purple-100'
                              }`}
                          >
                              {getTranslatedServiceMode(service.name)}
                          </button>
                      ));
                  })()}
              </div>
            </div>
          </div>

          {/* Scrolling Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-5 gap-3 p-0.5">
              {catalog.map((g, idx) => {
                const styleCard = CARD_COLORS[idx % CARD_COLORS.length];
                return (
                  <button
                    key={`${g.name}-${idx}`}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      const key = String(g.key || '').toLowerCase();
                      const name = String(g.name || '').toLowerCase();
                      const needsModifier =
                        key === 'ghotraa' ||
                        name === 'ghotraa' ||
                        key === 'shmage' ||
                        name === 'shmage' ||
                        key === 'shmagespecial' ||
                        name === 'shmage (special)';

                      if (key === 'carpet' || name === 'carpet') {
                        setSelectedGarmentForCarpet(g);
                        setCarpetHeightM('');
                        setCarpetWidthM('');
                      } else if (needsModifier) {
                        setSelectedGarmentForModifier(g);
                        setModifierForm({ neel: false, colorChoice: '', fold: 'Normal', starch: 'Without' });
                      } else if (g.hasSizes && g.sizes && g.sizes.length > 0) {
                        setSelectedGarmentForSize(g);
                      } else {
                        addGarment(g, quickServiceMode);
                      }
                    }}
                    className={`relative w-full h-auto min-h-[125px] flex flex-col items-center justify-between p-2.5 pb-2 border rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${styleCard} ${draggedIdx === idx ? 'opacity-30 border-dashed border-slate-400 scale-95' : ''}`}
                  >
                    {/* Color dot indicator */}
                    <span
                      className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full border border-white/85 shadow-sm"
                      style={{ backgroundColor: g.color || '#3b82f6' }}
                    />
                    {g.image ? (
                      <img src={g.image} alt={g.name} className="w-16 h-16 object-cover rounded-xl mb-2 mt-1 shadow-sm border border-black/10" />
                    ) : (
                      <span className="text-[52px] mb-2 mt-1 leading-none" role="img" aria-label={g.name}>
                        {g.icon}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-center leading-tight tracking-wide truncate w-full mb-1 mt-auto pt-1">
                      {getGarmentDisplayName(g)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        {/* Right Column: Invoice items table + Discount/Totals */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-3 flex flex-col min-h-0 shadow-lg justify-between lg:overflow-hidden">

          {/* Top Panel: Selected Items Title */}
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-border/50 shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-secondary">
              {t('counter.makeInvoice.invoiceItems') || "Invoice Items"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setOrderItems([]);
                setForm((prev) => ({ ...prev, deliveryMode: 'branch', expectedDeliveryDate: '', expectedDeliveryTime: '' }));
                clearDraftInvoice();
              }}
              className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold uppercase tracking-wider"
            >
              {t('counter.makeInvoice.clearAll') || "Clear All"}
            </button>
          </div>

          {/* Delivery Method & Time Clock Card — shown after item selection */}
          {orderItems.length > 0 && (
            <div className="mb-3 p-2.5 bg-surface-alt/10 border border-border/50 rounded-xl flex flex-col gap-2 shrink-0 shadow-sm">
              {/* Delivery Mode Tabs */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                  {t('counter.makeInvoice.deliveryType') || "Delivery Type"}
                </label>
                <div className="flex bg-surface-alt p-0.5 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, deliveryMode: 'branch' }))}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      form.deliveryMode === 'branch'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    🏪 {t('counter.makeInvoice.branchPickup') || "Branch Pickup"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, deliveryMode: 'home' }))}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      form.deliveryMode === 'home'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    🏠 {t('counter.makeInvoice.homeDelivery') || "Home Delivery"}
                  </button>
                </div>
              </div>

              {/* Date & Time Edit Controls */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/35">
                <div className={`grid ${form.deliveryMode === 'home' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                  {form.deliveryMode === 'home' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                        📅 {language === 'ar' ? 'تاريخ التجهيز المتوقع' : 'Expected Ready Date'}
                      </label>
                      <input
                        type="date"
                        value={form.expectedDeliveryDate || ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 h-8"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                      ⏰ {language === 'ar' ? 'وقت التجهيز / المدة' : 'Ready In / Delivery Time'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'مثال: 1 Hour' : 'e.g. 1 Hour, 2 Hours'}
                      value={form.expectedDeliveryTime || ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryTime: e.target.value }))}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 h-8 text-center"
                    />
                  </div>
                </div>

                {/* Preset Quick Time Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5 no-scrollbar" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  <span className="text-[9px] font-bold text-secondary uppercase shrink-0">
                    ⚡ {language === 'ar' ? 'وقت سريع:' : 'Quick Time:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, expectedDeliveryTime: '' }))}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all ${
                      !form.expectedDeliveryTime
                        ? 'bg-blue-500/15 border-blue-500 text-blue-600 font-bold'
                        : 'bg-surface border-border text-secondary hover:text-primary'
                    }`}
                  >
                    {language === 'ar' ? 'افتراضي' : 'Default'}
                  </button>
                  {[
                    { label: language === 'ar' ? 'بعد 1 ساعة' : 'After 1 Hour', value: language === 'ar' ? 'بعد 1 ساعة' : 'After 1 Hour' },
                    { label: language === 'ar' ? 'بعد 2 ساعة' : 'After 2 Hours', value: language === 'ar' ? 'بعد 2 ساعة' : 'After 2 Hours' },
                    { label: language === 'ar' ? 'بعد 3 ساعات' : 'After 3 Hours', value: language === 'ar' ? 'بعد 3 ساعات' : 'After 3 Hours' },
                    { label: language === 'ar' ? 'بعد 4 ساعات' : 'After 4 Hours', value: language === 'ar' ? 'بعد 4 ساعات' : 'After 4 Hours' },
                    { label: language === 'ar' ? 'بعد 6 ساعات' : 'After 6 Hours', value: language === 'ar' ? 'بعد 6 ساعات' : 'After 6 Hours' },
                    { label: language === 'ar' ? 'بعد 12 ساعة' : 'After 12 Hours', value: language === 'ar' ? 'بعد 12 ساعة' : 'After 12 Hours' },
                    { label: language === 'ar' ? 'بعد 24 ساعة' : 'After 24 Hours', value: language === 'ar' ? 'بعد 24 ساعة' : 'After 24 Hours' },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, expectedDeliveryTime: preset.value }))}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md border shrink-0 transition-all ${
                        form.expectedDeliveryTime === preset.value || form.expectedDeliveryTime === preset.value.replace(/^After\s+/, '')
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                          : 'bg-surface border-border text-secondary hover:text-primary hover:border-blue-500 hover:text-blue-500'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Table Container - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-3 border border-border/40 rounded-xl bg-surface-alt/20">
            {orderItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <span className="text-3xl mb-2">🧺</span>
                <p className="text-xs text-secondary font-medium">{t('counter.makeInvoice.emptyInvoiceText') || "Invoice is empty."}</p>
                <p className="text-[10px] text-slate-500 mt-1">{t('counter.makeInvoice.emptyInvoiceSubtext') || "Click items in the catalog to add them."}</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-alt/75 text-secondary border-b border-border/80 font-bold">
                    <th className="p-2 w-5/12">{t('counter.makeInvoice.itemServiceHeader') || "Item / Service"}</th>
                    <th className="p-2 w-3/12 text-center">{t('counter.makeInvoice.qtyHeader') || "Qty"}</th>
                    <th className="p-2 w-3/12 text-right">{t('counter.makeInvoice.totalHeader') || "Total"}</th>
                    <th className="p-2 w-1/12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, idx) => (
                    <tr key={item.id || `${item.name}-${idx}`} className="border-b border-border/30 hover:bg-surface-alt/30 transition-colors">
                      <td className="p-2">
                        <div className="font-semibold text-primary truncate max-w-[150px]">{getTranslatedItemName(item.name)}</div>
                        <div className="text-[9px] text-secondary font-semibold italic">{getTranslatedServiceMode(item.service)}</div>
                        <input
                          type="text"
                          placeholder={t('counter.makeInvoice.addNotesPlaceholder') || "Add notes..."}
                          value={item.notes}
                          onChange={(e) => updateItemNotes(idx, e.target.value)}
                          className="w-full mt-1 bg-surface border border-border/50 rounded px-1.5 py-0.5 text-[9px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <div className="inline-flex items-center justify-center bg-surface border border-border/60 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, -1)}
                            className="px-2 py-1 hover:bg-surface-alt font-extrabold text-secondary"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono font-bold text-primary">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, 1)}
                            className="px-2 py-1 hover:bg-surface-alt font-extrabold text-secondary"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-primary">
                        {editingLineTotalIdx === idx ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={editingLineTotalValue}
                              onChange={(e) => setEditingLineTotalValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedLineTotal(idx);
                                if (e.key === 'Escape') {
                                  setEditingLineTotalIdx(null);
                                  setEditingLineTotalValue('');
                                }
                              }}
                              className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-right text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveEditedLineTotal(idx)}
                              className="text-emerald-600 hover:text-emerald-700"
                              title={language === 'ar' ? 'حفظ' : 'Save'}
                            >
                              <FiCheck size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditLineTotal(idx)}
                            className="font-mono font-bold text-primary hover:text-blue-600 underline decoration-dotted underline-offset-4"
                            title={language === 'ar' ? 'اضغط للتعديل' : 'Click to edit'}
                          >
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </button>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-rose-500 hover:text-rose-600 transition"
                          title={t('counter.makeInvoice.removeItemTooltip') || "Remove item"}
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Panel: Calculation Summary & Save Bar (Shrinkable) */}
          <div className="border-t border-border/50 pt-2 shrink-0 space-y-2">

            {/* Discount Widget Section */}
            <div className="bg-surface-alt/40 border border-border/60 rounded-xl p-2.5 grid grid-cols-12 gap-2 items-center text-xs">
              <div className="col-span-3 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="discountChecked"
                  checked={form.discountChecked}
                  onChange={(e) => setForm((prev) => ({ ...prev, discountChecked: e.target.checked }))}
                  className="rounded border-border text-blue-500 focus:ring-blue-400/40 h-3.5 w-3.5"
                />
                <label htmlFor="discountChecked" className="font-semibold text-secondary select-none">
                  {t('counter.makeInvoice.discountLabel') || "Discount"}
                </label>
              </div>

              {form.discountChecked ? (
                <>
                  <div className="col-span-4 flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">%</span>
                    <input
                      type="number"
                      placeholder={t('counter.makeInvoice.percentLabel') || "Percent"}
                      min="0"
                      max="100"
                      value={form.discountPercent || ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: Math.max(0, Number(e.target.value)) }))}
                      className="w-full text-xs rounded border border-border/65 bg-surface px-1.5 py-1 text-center font-mono"
                    />
                  </div>
                  <div className="col-span-5 flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">{language === 'ar' ? 'د.ك' : 'KWD'}</span>
                    <input
                      type="number"
                      placeholder={t('counter.makeInvoice.valueLabel') || "Value"}
                      min="0"
                      step="0.05"
                      value={form.discountValue || ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, discountValue: Math.max(0, Number(e.target.value)) }))}
                      className="w-full text-xs rounded border border-border/65 bg-surface px-1.5 py-1 text-center font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-9 text-[10px] text-slate-500 text-right font-medium">
                  {t('counter.makeInvoice.discountHint') || "Enable checkbox to apply discount"}
                </div>
              )}
            </div>

            {/* Free Balance Deduction Toggle (If customer has free balance) */}
            {customerFreeBalance > 0 && (
              <div className="p-2.5 rounded-xl border border-blue-400/40 bg-blue-500/10 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base select-none">🎁</span>
                  <div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">
                      {language === 'ar' ? 'رصيد مجاني متاح' : 'Available Free Balance'}: <span className="font-mono font-black">{formatCurrency(customerFreeBalance)}</span>
                    </div>
                    <div className="text-[10px] text-secondary">
                      {language === 'ar' ? 'خصم من هذه الفاتورة' : 'Deduct from this invoice'}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useFreeBalance}
                    onChange={(e) => setForm(prev => ({ ...prev, useFreeBalance: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            )}

            {/* Subtotal, Discount & Tax lines */}
            <div className="grid grid-cols-2 gap-y-1 text-xs px-1 font-medium">
              <div className="text-secondary">{t('counter.makeInvoice.subtotalLabel') || "Subtotal"}:</div>
              <div className="text-right font-mono text-primary">
                {editingSubtotal ? (
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={editingSubtotalValue}
                      onChange={(e) => setEditingSubtotalValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditedSubtotal();
                        if (e.key === 'Escape') {
                          setEditingSubtotal(false);
                          setEditingSubtotalValue('');
                        }
                      }}
                      className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-right text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveEditedSubtotal}
                      className="text-emerald-600 hover:text-emerald-700"
                      title={language === 'ar' ? 'حفظ' : 'Save'}
                    >
                      <FiCheck size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditSubtotal}
                    className="font-mono font-bold text-primary hover:text-blue-600 underline decoration-dotted underline-offset-4"
                    title={language === 'ar' ? 'اضغط للتعديل' : 'Click to edit'}
                    disabled={orderItems.length === 0}
                  >
                    {formatCurrency(subtotal)}
                  </button>
                )}
              </div>
              {form.discountChecked && (
                <>
                  <div className="text-rose-500 font-semibold">{t('counter.makeInvoice.discountLabel') || "Discount"}:</div>
                  <div className="text-right font-mono text-rose-500 font-semibold">
                    -{formatCurrency(discountAmount)}
                  </div>
                </>
              )}
              {form.useFreeBalance && freeBalanceDeduction > 0 && (
                <>
                  <div className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                    <span>🎁</span>
                    <span>{language === 'ar' ? 'رصيد مجاني مستخدم' : 'Free Balance Used'}:</span>
                  </div>
                  <div className="text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                    -{formatCurrency(freeBalanceDeduction)}
                  </div>
                </>
              )}
            </div>



            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 min-w-[80px] bg-surface border border-border hover:bg-surface-alt text-primary font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-all duration-200"
              >
                {t('counter.makeInvoice.resetButton') || "Reset"}
              </button>
              <button
                type="button"
                onClick={() => { if (validateInvoice()) { setIsPrintFlow(false); setShowSettleModal(true); } }}
                className="flex-1 col-span-1 min-w-[110px] font-bold py-2 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 text-white"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
              >
                💳 {t('counter.makeInvoice.settleAndPay')}
              </button>
              <button
                type="button"
                onClick={() => { if (validateInvoice()) { handlePrintDirectUnpaid(); } }}
                className="flex-1 min-w-[110px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200"
              >
                {t('counter.makeInvoice.printButton') || "Print Invoice"}
              </button>
              <button
                type="button"
                onClick={handleSaveAndWhatsApp}
                className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200"
              >
                {t('counter.makeInvoice.sendToWhatsApp')}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* SECTION 4: POS System State Info Footer */}
      <div className="bg-surface-alt/70 border border-border rounded-xl px-4 py-2 shrink-0 flex justify-between items-center text-[10px] text-secondary font-mono tracking-wider shadow-inner">
        <div className="flex items-center gap-4">
          <span>{t('counter.makeInvoice.userNoLabel') || "USER NO"}: <b className="text-primary font-semibold">247</b></span>
          <span>{t('counter.makeInvoice.userNameLabel') || "USER NAME"}: <b className="text-primary font-semibold">{storedUser.name || 'Evan Wu'}</b></span>
          <span>{t('counter.makeInvoice.branchLabel') || "BRANCH"}: <b className="text-primary font-semibold">RG</b></span>
          <span>{t('counter.makeInvoice.yearLabel') || "YEAR"}: <b className="text-primary font-semibold">2026</b></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest text-[9px]">
            {t('counter.makeInvoice.receiptSystemLabel') || "Receipt System (نظام الإستلام)"}
          </span>
          <span className="text-primary font-semibold">
            {formattedTime} - {formattedDate}
          </span>
        </div>
      </div>

      {/* ── Settle & Pay Modal ── */}
      {showSettleModal && (
        <div
          className="fixed -inset-4 z-[2000] flex items-center justify-center p-4 sm:p-6 outline-none"
          style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.45)' }}
        >
          <div
            className="w-full sm:max-w-sm rounded-3xl p-6 shadow-2xl border border-border bg-surface text-primary"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-extrabold tracking-tight">
                {paymentStep === 'select' && `💳 ${t('counter.makeInvoice.settleAndPay')}`}
                {paymentStep === 'card'   && `💳 ${t('counter.makeInvoice.cardPayment')}`}
                {paymentStep === 'link'   && `🔗 ${t('counter.makeInvoice.linkPayment')}`}
                {paymentStep === 'wamt'   && `💰 ${t('counter.makeInvoice.creditPayment')}`}
              </h2>
              <button
                onClick={() => { setShowSettleModal(false); setPaymentStep('select'); }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none"
              >✕</button>
            </div>
            <p className="text-xs mb-5 text-slate-500">
              Total: <span className="font-mono font-bold text-emerald-500">{formatCurrency(totalAmount)}</span>
              {paymentStep !== 'select' && (
                <button onClick={() => setPaymentStep('select')} className="ml-3 text-blue-500 hover:underline text-[11px]">← {t('counter.makeInvoice.back')}</button>
              )}
            </p>

            {/* ── STEP: SELECT ── */}
            {paymentStep === 'select' && (
              <div className="space-y-4">
                {/* Payment Type Selector */}
                <div className="bg-surface-alt/50 border border-border p-1 rounded-2xl flex gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('full');
                      setAmountReceived(String(totalAmount.toFixed(3)));
                    }}
                    className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${paymentMode === 'full' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                  >
                    {language === 'ar' ? 'دفع كامل' : 'Full Payment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('partial')}
                    className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${paymentMode === 'partial' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                  >
                    {language === 'ar' ? 'دفع جزئي' : 'Partial'}
                  </button>
                </div>

                {/* Amount Received Input */}
                {paymentMode === 'partial' && (
                  <div className="bg-surface-alt/30 border border-border/80 rounded-2xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs font-medium text-secondary">
                      <span>{language === 'ar' ? 'المبلغ المستلم' : 'Amount Received'}:</span>
                      <span className="font-mono">{language === 'ar' ? 'د.ك' : 'KWD'}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max={totalAmount}
                        step="0.001"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="flex-1 text-sm rounded-xl border border-border bg-surface px-3 py-2 text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        placeholder="0.000"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.target.blur();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const activeEl = document.activeElement;
                          if (activeEl && activeEl.tagName === 'INPUT') {
                            activeEl.blur();
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
                      >
                        {language === 'ar' ? 'إدخال' : 'Enter'}
                      </button>
                    </div>
                    {(() => {
                      const received = Number(amountReceived) || 0;
                      const remaining = Math.max(0, totalAmount - received);
                      return (
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <div className="flex justify-between items-center text-xs font-bold text-emerald-500">
                            <span>{language === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount'}:</span>
                            <span className="font-mono">{formatCurrency(received)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold text-rose-500">
                            <span>{language === 'ar' ? 'المتبقي في الحساب' : 'Balance Remaining'}:</span>
                            <span className="font-mono">{formatCurrency(remaining)}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-center text-blue-400 pt-1 border-t border-border/20">
                            {language === 'ar' 
                              ? 'الآن اختر طريقة دفع المبلغ الجزئي' 
                              : 'Now you select the partial amount pay option'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { method: t('counter.makeInvoice.paymentCash') || 'CASH', icon: '💵', bg: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,0.4)', payMethod: 'Cash' },
                    { method: t('counter.makeInvoice.paymentBukey') || 'BUKEY', icon: '🎟️', bg: 'linear-gradient(135deg,#3b82f6,#4f46e5)', shadow: 'rgba(59,130,246,0.4)', payMethod: 'Bukey' },
                    { method: t('counter.makeInvoice.paymentKnet') || 'K-NET', icon: '💳', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,0.4)', payMethod: 'K-Net' },
                    { method: t('counter.makeInvoice.paymentCredit') || 'CREDIT', icon: '💰', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', shadow: 'rgba(139,92,246,0.4)', payMethod: 'Credit' },
                  ].map(({ method, icon, bg, shadow, payMethod }) => (
                    <button
                      key={payMethod}
                      type="button"
                      onClick={() => handleSettleAndPay(payMethod)}
                      className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl text-white font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95"
                      style={{ background: bg, boxShadow: `0 6px 18px ${shadow}` }}
                    >
                      <span className="text-3xl">{icon}</span>
                      <span className="text-xs tracking-widest uppercase">{method}</span>
                    </button>
                  ))}
                </div>
              <button
                  type="button"
                  onClick={() => handleSettleAndPayDirectUnpaidWithoutPrint()}
                  className="w-full relative flex items-center justify-center gap-2 p-3 mt-3 rounded-2xl text-white transition-all hover:-translate-y-1 active:scale-95 group overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#64748b,#475569)', boxShadow: '0 8px 20px -5px rgba(100,116,139,0.4)' }}
                >
                  <span className="text-xl">📝</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest">
                    {language === 'ar' ? 'غير مدفوع بالكامل' : 'Full Unpaid'}
                  </span>
                </button>
            </div>
            )}

            {/* ── STEP: CARD ── */}
            {paymentStep === 'card' && (
              <div className="space-y-3">
                <div className="relative rounded-2xl p-5 text-white overflow-hidden mb-4" style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', minHeight: '130px' }}>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold tracking-widest opacity-70">CREDIT / DEBIT</span>
                    <span className="text-2xl">💳</span>
                  </div>
                  <p className="mt-3 text-lg font-mono tracking-[0.2em] font-bold">
                    {cardForm.number ? cardForm.number.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                  </p>
                  <div className="flex justify-between mt-3">
                    <p className="text-xs font-semibold tracking-wider">{cardForm.name || 'CARD HOLDER'}</p>
                    <p className="text-xs font-semibold tracking-wider">{cardForm.expiry || 'MM/YY'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Name on Card</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    placeholder="e.g. John Doe"
                    value={cardForm.name}
                    onChange={(e) => setCardForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Card Number</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    value={cardForm.number}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setCardForm(f => ({ ...f, number: raw }));
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Expiry</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardForm.expiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                        if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
                        setCardForm(f => ({ ...f, expiry: v }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">CVV</label>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                      placeholder="•••"
                      maxLength={4}
                      value={cardForm.cvv}
                      onChange={(e) => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!cardForm.name.trim()) { toast.error('Enter name on card'); return; }
                    if (cardForm.number.length < 16) { toast.error('Enter valid 16-digit card number'); return; }
                    if (cardForm.expiry.length < 5) { toast.error('Enter valid expiry MM/YY'); return; }
                    if (cardForm.cvv.length < 3) { toast.error('Enter valid CVV'); return; }
                    handleSettleAndPay('Card');
                  }}
                  className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', boxShadow: '0 6px 18px rgba(59,130,246,0.4)' }}
                >
                  💳 Pay {formatCurrency(paymentMode === 'full' ? totalAmount : (Number(amountReceived) || 0))}
                </button>
              </div>
            )}

            {/* ── STEP: LINK ── */}
            {paymentStep === 'link' && (
              <div className="space-y-4 mt-2">
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <span className="text-4xl mb-2">🔗</span>
                  <p className="text-sm font-semibold text-primary">Pay with Link</p>
                  <p className="text-xs text-secondary text-center mt-1">Fast, secure, 1-click checkout by Stripe.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Link Account Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    placeholder="e.g. user@example.com"
                    value={linkForm.email}
                    onChange={(e) => setLinkForm({ email: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!linkForm.email.includes('@')) { toast.error('Enter a valid email'); return; }
                    handleSettleAndPay('Link');
                  }}
                  className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.4)' }}
                >
                  🔗 Pay {formatCurrency(paymentMode === 'full' ? totalAmount : (Number(amountReceived) || 0))}
                </button>
              </div>
            )}

            {/* ── STEP: CREDIT ── */}
            {paymentStep === 'wamt' && (
              <div className="space-y-4 mt-2">
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                  <span className="text-4xl mb-2">💰</span>
                  <p className="text-sm font-semibold text-primary">Credit Payment</p>
                  <p className="text-xs text-secondary text-center mt-1">Directly charge customer's mobile wallet.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Wallet Mobile Number</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                    placeholder="e.g. 965 xxxx xxxx"
                    value={wamtForm.mobile}
                    onChange={(e) => setWamtForm({ mobile: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (wamtForm.mobile.length < 5) { toast.error('Enter a valid mobile number'); return; }
                    handleSettleAndPay('Credit');
                  }}
                  className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', boxShadow: '0 6px 18px rgba(139,92,246,0.4)' }}
                >
                  💰 Pay {formatCurrency(paymentMode === 'full' ? totalAmount : (Number(amountReceived) || 0))}
                </button>
              </div>
            )}

            <p className="text-center text-[10px] mt-4 text-slate-400">
              Secured payment • Invoice saved on completion
            </p>
          </div>
        </div>
      )}

      {/* ===== SIZE SELECTION MODAL ===== */}
      {selectedGarmentForSize && (() => {
        return (
          <div className="fixed -inset-4 z-[3000] flex items-center justify-center p-8" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.45)' }}>
            <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border bg-surface text-primary`}>
              <button onClick={() => setSelectedGarmentForSize(null)} className="absolute top-4 right-4 text-secondary hover:text-rose-500 transition-colors">
                <FiX size={20} />
              </button>
              <div className="text-center mb-6 mt-2">
                {selectedGarmentForSize.image ? (
                  <img src={selectedGarmentForSize.image} alt={selectedGarmentForSize.name} className="w-16 h-16 object-cover rounded-2xl mx-auto shadow-md mb-3" />
                ) : (
                  <span className="text-5xl mb-3 block drop-shadow-md">{selectedGarmentForSize.icon}</span>
                )}
                <h2 className="text-xl font-extrabold tracking-tight">Select Size for {selectedGarmentForSize.name}</h2>
                <p className="text-xs text-secondary mt-1">Choose a size to add to invoice</p>
              </div>
              <div className="space-y-3">
                {selectedGarmentForSize.sizes.map((size, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      addGarment({
                        ...selectedGarmentForSize,
                        name: `${selectedGarmentForSize.name} - ${size.label}`,
                        price: size.price
                      }, quickServiceMode);
                      setSelectedGarmentForSize(null);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-surface-alt border-border hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20`}
                  >
                    <span className="font-bold text-lg">{size.label}</span>
                    <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(size.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== CARPET SIZE MODAL ===== */}
      {selectedGarmentForCarpet && (() => {
        const ratePerSqm = Number(selectedGarmentForCarpet.price || 0);
        const parseDim = (val) => {
          const n = Number(String(val).replace(',', '.'));
          return Number.isFinite(n) && n > 0 ? n : 0;
        };
        const height = parseDim(carpetHeightM);
        const width = parseDim(carpetWidthM);
        const areaSqm = height > 0 && width > 0 ? Math.round(height * width * 1000) / 1000 : 0;
        const totalPrice = Math.round(ratePerSqm * areaSqm * 1000) / 1000;

        return (
          <div className="fixed -inset-4 z-[3000] flex items-center justify-center p-8" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.45)' }}>
            <div className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border bg-surface text-primary">
              <button onClick={() => setSelectedGarmentForCarpet(null)} className="absolute top-4 right-4 text-secondary hover:text-rose-500 transition-colors">
                <FiX size={20} />
              </button>

              <div className="text-center mb-5 mt-2">
                {selectedGarmentForCarpet.image ? (
                  <img src={selectedGarmentForCarpet.image} alt={selectedGarmentForCarpet.name} className="w-16 h-16 object-cover rounded-2xl mx-auto shadow-md mb-3" />
                ) : (
                  <span className="text-5xl mb-3 block drop-shadow-md">{selectedGarmentForCarpet.icon}</span>
                )}
                <h2 className="text-xl font-extrabold tracking-tight">Carpet Size</h2>
                <p className="text-xs text-secondary mt-1">
                  Rate: <span className="font-mono font-bold text-primary">{formatCurrency(ratePerSqm)}</span> / sq meter
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                      Height (m)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 2"
                      value={carpetHeightM}
                      onChange={(e) => setCarpetHeightM(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                      Width (m)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 4"
                      value={carpetWidthM}
                      onChange={(e) => setCarpetWidthM(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                  </div>
                </div>

                {areaSqm > 0 && (
                  <div className="text-center text-xs font-mono text-secondary">
                    {height} × {width} = <span className="font-bold text-primary">{areaSqm} sqm</span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-alt/40 px-3 py-2 text-sm">
                  <span className="text-secondary font-semibold">Total</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {areaSqm > 0 ? formatCurrency(totalPrice) : '—'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={areaSqm <= 0}
                  onClick={() => {
                    const note = `Size: ${height} × ${width} m (${areaSqm} sqm)`;
                    addGarment(
                      {
                        ...selectedGarmentForCarpet,
                        name: `${selectedGarmentForCarpet.name} - ${height}×${width}m`,
                        price: totalPrice,
                        customPrice: totalPrice,
                      },
                      quickServiceMode,
                      note
                    );
                    setSelectedGarmentForCarpet(null);
                  }}
                  className={`w-full mt-2 py-3 rounded-2xl font-black text-white text-sm tracking-wide transition-all active:scale-95 ${
                    areaSqm > 0 ? 'hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}
                >
                  ✅ Confirm & Add
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== MODIFIER SELECTION MODAL ===== */}
      {selectedGarmentForModifier && (() => {
          const isLight = theme === 'light';
          return (
              <div className="fixed -inset-4 z-[3000] flex items-center justify-center p-8 outline-none" style={{ backdropFilter: 'blur(8px)', backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)' }}>
                  <div className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border bg-surface text-primary outline-none`} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedGarmentForModifier(null)} className="absolute top-4 right-4 text-secondary hover:text-rose-500 transition-colors">
                          <FiX size={20} />
                      </button>
                      <div className="text-center mb-6 mt-2">
                          {selectedGarmentForModifier.image ? (
                              <img src={selectedGarmentForModifier.image} alt={selectedGarmentForModifier.name} className="w-16 h-16 object-cover rounded-2xl mx-auto shadow-md mb-3" />
                          ) : (
                              <span className="text-5xl mb-3 block drop-shadow-md">{selectedGarmentForModifier.icon}</span>
                          )}
                          <h2 className="text-xl font-extrabold tracking-tight">Select Options for {selectedGarmentForModifier.name}</h2>
                      </div>
                      
                      <div className="space-y-6">
                          {/* Neel Toggle */}
                          <div className="flex items-center gap-3 p-3 bg-surface-alt rounded-xl border border-border cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => setModifierForm(p => ({...p, neel: !p.neel}))}>
                              <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${modifierForm.neel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                  {modifierForm.neel && <FiCheck size={16} />}
                              </div>
                              <span className="font-bold text-lg text-primary">Neel (نيل)</span>
                          </div>

                          {/* Required Color Choice */}
                          <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Color Choice</label>
                              <div className="grid grid-cols-2 gap-2">
                                  {[
                                      {
                                          label: 'Red',
                                          value: 'Red',
                                          active: 'border-rose-300 bg-rose-50/60 dark:border-rose-600/40 dark:bg-rose-900/20',
                                          idle: 'border-border bg-surface-alt hover:border-rose-300 hover:bg-rose-50/40 dark:hover:border-rose-600/30 dark:hover:bg-rose-900/10',
                                      },
                                      {
                                          label: 'White',
                                          value: 'White',
                                          active: 'border-slate-300 bg-white/60 dark:border-slate-500/40 dark:bg-slate-800/50',
                                          idle: 'border-border bg-surface-alt hover:border-slate-300 hover:bg-white/40 dark:hover:border-slate-600/40 dark:hover:bg-slate-800/30',
                                      },
                                  ].map(opt => (
                                      <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() =>
                                              setModifierForm((p) => ({
                                                  ...p,
                                                  colorChoice: p.colorChoice === opt.value ? '' : opt.value,
                                              }))
                                          }
                                          aria-pressed={modifierForm.colorChoice === opt.value}
                                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${
                                              modifierForm.colorChoice === opt.value ? opt.active : opt.idle
                                          }`}
                                      >
                                          <div
                                              className={`w-6 h-6 rounded flex items-center justify-center border-2 ${
                                                  modifierForm.colorChoice === opt.value
                                                      ? 'bg-blue-600 border-blue-600 text-white'
                                                      : 'border-slate-300 dark:border-slate-600'
                                              }`}
                                          >
                                              {modifierForm.colorChoice === opt.value && <FiCheck size={16} />}
                                          </div>
                                          <div className="flex items-center gap-2 min-w-0">
                                              <span
                                                  className="text-sm font-extrabold"
                                                  style={{ color: isLight ? '#000000' : '#ffffff' }}
                                              >
                                                  {opt.label}
                                              </span>
                                              <span
                                                  className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10 shrink-0"
                                                  style={{ backgroundColor: opt.value === 'Red' ? '#e11d48' : '#ffffff' }}
                                              />
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Fold Options */}
                          <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Fold Style (نوع الطي)</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {['Sharshal', 'Normal', 'Strate', 'Square'].map(opt => (
                                      <button 
                                          key={opt}
                                          type="button"
                                          onClick={() => setModifierForm(p => ({...p, fold: opt}))}
                                          className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all outline-none ${modifierForm.fold === opt ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-surface-alt border-border text-secondary hover:border-slate-400 hover:text-primary'}`}
                                      >
                                          {opt}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Starch Options */}
                          <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Starch Level (مستوى النشا)</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {['High', 'Med', 'Little', 'Without'].map(opt => (
                                      <button 
                                          key={opt}
                                          type="button"
                                          onClick={() => setModifierForm(p => ({...p, starch: opt}))}
                                          className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all outline-none ${modifierForm.starch === opt ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-surface-alt border-border text-secondary hover:border-slate-400 hover:text-primary'}`}
                                      >
                                          {opt}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <button
                          type="button"
                          onClick={() => {
                              const parts = [];
                              if (modifierForm.neel) parts.push("Neel");
                                  if (modifierForm.colorChoice) parts.push(`Color: ${modifierForm.colorChoice}`);
                              if (modifierForm.fold && modifierForm.fold !== 'Normal') parts.push(`Fold: ${modifierForm.fold}`);
                              if (modifierForm.starch && modifierForm.starch !== 'Without') parts.push(`Starch: ${modifierForm.starch}`);
                              const note = parts.join(' | ');
                              
                              addGarment(selectedGarmentForModifier, quickServiceMode, note);
                              setSelectedGarmentForModifier(null);
                          }}
                          className="w-full mt-6 py-4 rounded-2xl font-black text-white text-lg tracking-wide transition-all hover:scale-[1.02] active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}
                      >
                          ✅ Confirm & Add
                      </button>
                  </div>
              </div>
          );
      })()}

      {/* ===== MISMATCH ERROR MODAL ===== */}
      {mismatchError && createPortal(
        (() => {
        const isLight = theme === 'light';
        return (
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(8px)',
              backgroundColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(0,0,0,0.65)'
            }}
            onClick={() => setMismatchError(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
              style={{
                background: isLight
                  ? 'linear-gradient(145deg, #fdfaf6 0%, #fffbf0 100%)'
                  : 'linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
                border: isLight ? '1px solid #e8d5b0' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isLight
                  ? '0 30px 80px -10px rgba(120,80,20,0.18), 0 0 0 1px rgba(232,213,176,0.6)'
                  : '0 30px 80px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border-2 border-rose-200 dark:border-rose-500/30">
                <span className="text-3xl animate-bounce" style={{ animationDuration: '1.5s' }}>⚠️</span>
              </div>
              <h2 className={`text-xl font-extrabold tracking-tight mb-2 ${isLight ? 'text-stone-800' : 'text-white'}`}>
                {language === 'ar' ? 'خطأ في نوع الخدمة' : 'Service Mismatch'}
              </h2>
              <p className={`text-sm mb-6 font-semibold ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                {mismatchError}
              </p>
              <button
                type="button"
                onClick={() => setMismatchError(null)}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-200 bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_rgba(225,29,72,0.3)] active:scale-[0.98]"
              >
                {language === 'ar' ? 'موافق' : 'OK'}
              </button>
            </div>
          </div>
        );
        })(),
        document.body
      )}

      {/* ===== FULL OFFICIAL ADD CUSTOMER MODAL ===== */}
      {showQuickAddCustomerModal && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(8px)',
            backgroundColor: theme === 'light' ? 'rgba(15,23,42,0.4)' : 'rgba(0,0,0,0.75)'
          }}
          onClick={() => setShowQuickAddCustomerModal(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden text-primary max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-surface-alt/40 shrink-0">
              <h2 className="text-lg font-extrabold tracking-tight text-primary">
                {language === 'ar' ? 'إضافة عميل جديد' : 'Add Customer'}
              </h2>
              <button
                type="button"
                onClick={() => setShowQuickAddCustomerModal(false)}
                className="text-secondary hover:text-rose-500 p-1.5 rounded-full hover:bg-surface-alt transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Section 1: Customer Identity */}
              <div className="border-b border-border/50 pb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Customer Identity</h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Discount Value (%)</label>
                    <input
                      type="number"
                      value={quickCustomerForm.customDiscountRate || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, customDiscountRate: e.target.value }))}
                      placeholder="e.g. 25"
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Customer No</label>
                    <input
                      type="text"
                      value={quickCustomerForm.customerNo || 'Auto-generated'}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-2.5 py-1.5 text-secondary cursor-not-allowed text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Arabic Name</label>
                    <input
                      type="text"
                      value={quickCustomerForm.arabicName || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, arabicName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">English Name *</label>
                    <input
                      type="text"
                      required
                      value={quickCustomerForm.englishName || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, englishName: e.target.value, name: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Phone Numbers */}
              <div className="border border-purple-500/20 bg-purple-500/5 rounded-2xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3">Phone Numbers</h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {quickCustomerForm.phones.map((phone, idx) => (
                    <div key={idx}>
                      <label className="block text-[10px] font-bold text-secondary uppercase">
                        {idx === 0 ? 'Phone No. *' : `Alternate No. ${idx}`}
                      </label>
                      <input
                        type="tel"
                        required={idx === 0}
                        value={phone}
                        onChange={(e) => {
                          const updated = [...quickCustomerForm.phones];
                          updated[idx] = e.target.value;
                          setQuickCustomerForm(prev => ({ ...prev, phones: updated, phone: updated[0] }));
                        }}
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Address & Location */}
              <div className="border-b border-border/50 pb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Address & Location</h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Area Name</label>
                    <select
                      value={quickCustomerForm.areaName || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, areaName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Area</option>
                      {DEFAULT_AREAS.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Part No (Block)</label>
                    <input
                      type="text"
                      value={quickCustomerForm.partNo || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, partNo: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Street</label>
                    <input
                      type="text"
                      value={quickCustomerForm.street || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, street: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Jadda (Avenue)</label>
                    <input
                      type="text"
                      value={quickCustomerForm.jadda || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, jadda: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">House No</label>
                    <input
                      type="text"
                      value={quickCustomerForm.houseNo || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, houseNo: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Flat No (Apartment)</label>
                    <input
                      type="text"
                      value={quickCustomerForm.flatNo || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, flatNo: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Level No (Floor)</label>
                    <input
                      type="text"
                      value={quickCustomerForm.levelNo || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, levelNo: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Paci No.</label>
                    <input
                      type="text"
                      value={quickCustomerForm.paciNo || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, paciNo: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[10px] font-bold text-secondary uppercase">Address Notes</label>
                    <textarea
                      rows="2"
                      value={quickCustomerForm.addressNotes || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, addressNotes: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Billing & Financial Details */}
              <div className="border border-border/60 bg-surface-alt/20 rounded-2xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Billing & Financial Details</h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Date</label>
                    <input
                      type="date"
                      value={quickCustomerForm.date || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, date: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Insurance Paid</label>
                    <input
                      type="number"
                      step="0.001"
                      value={quickCustomerForm.insuranceAmount || '0.000'}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, insuranceAmount: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="counterMakeInvoiceSubscriberFull"
                      checked={!!quickCustomerForm.isSubscriber}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, isSubscriber: e.target.checked }))}
                      className="w-4 h-4 text-amber-500 border-border rounded focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="counterMakeInvoiceSubscriberFull" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase cursor-pointer select-none">
                      ⭐ Old Subscriber / مشترك
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Invoices Count</label>
                    <input
                      type="number"
                      value={quickCustomerForm.invoicesCount || 0}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-2.5 py-1.5 text-secondary cursor-not-allowed text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Last Invoice Date</label>
                    <input
                      type="date"
                      value={quickCustomerForm.lastInvoiceDate || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, lastInvoiceDate: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Free Balance</label>
                    <input
                      type="number"
                      value={quickCustomerForm.freeBalance || 0}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, freeBalance: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Free Total</label>
                    <input
                      type="number"
                      value={quickCustomerForm.freeTotal || 0}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-2.5 py-1.5 text-secondary cursor-not-allowed text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Email</label>
                    <input
                      type="email"
                      value={quickCustomerForm.email || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase">Status</label>
                    <select
                      value={quickCustomerForm.status || 'Active'}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, status: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-secondary uppercase">General Notes</label>
                    <input
                      type="text"
                      value={quickCustomerForm.notes || ''}
                      onChange={(e) => setQuickCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 py-4 border-t border-border/60 bg-surface-alt/40 shrink-0">
              <button
                type="button"
                onClick={handleSaveQuickCustomer}
                disabled={isSavingQuickCustomer}
                className="flex-1 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingQuickCustomer ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ العميل' : 'Save Customer')}
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAddCustomerModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold border border-border bg-surface-alt text-secondary hover:text-primary text-xs transition-colors"
              >
                {language === 'ar' ? 'إلغاء / خروج' : 'Cancel / Exit'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Inactive Customer Warning Popup Modal */}
      {showInactiveModal && inactiveCustomerData && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md surface-card rounded-3xl border border-rose-500/40 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center text-2xl font-bold">
                🛑
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-500">
                  {language === 'ar' ? 'حساب العميل موقوف / غير نشط' : 'Customer Account is Inactive'}
                </h3>
                <p className="text-xs text-secondary">
                  {language === 'ar' ? 'لا يمكن إنشاء فواتير لحساب غير نشط' : 'Invoices cannot be created for inactive customers'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-alt border border-border space-y-2 text-sm">
              <div className="flex justify-between items-center text-xs">
                <span className="text-secondary">{language === 'ar' ? 'اسم العميل:' : 'Customer:'}</span>
                <span className="font-bold text-primary">{inactiveCustomerData.name || inactiveCustomerData.englishName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-secondary">{language === 'ar' ? 'رقم الهاتف:' : 'Phone:'}</span>
                <span className="font-mono text-primary">{inactiveCustomerData.phone}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-rose-500 block mb-1">
                  {language === 'ar' ? 'سبب إيقاف الحساب:' : 'Reason for Inactivation:'}
                </span>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  "{inactiveCustomerData.inactiveReason || (language === 'ar' ? 'لم يتم تحديد سبب' : 'No specific reason provided')}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowInactiveModal(false);
                  setInactiveCustomerData(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-xs font-bold text-secondary hover:text-primary hover:bg-surface-alt transition cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء / اختيار عميل آخر' : 'Close / Choose Another'}
              </button>
              <button
                type="button"
                onClick={handleReactivateCustomer}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                {language === 'ar' ? 'تفعيل العميل والمتابعة' : 'Reactivate & Continue'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default MakeInvoice;
