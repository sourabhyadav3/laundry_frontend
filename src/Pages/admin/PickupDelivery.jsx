import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiChevronDown, FiTruck, FiFileText, FiCheck } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import ReusableTable from '../../Components/ReusableTable';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency } from '../../utils/exportUtils';
import { useLanguage } from '../../context/LanguageContext';

const pickupStatuses = ['Scheduled', 'Assigned', 'Picked Up', 'Completed'];
const deliveryStatuses = ['Scheduled', 'Out for Delivery', 'Delivered', 'Failed'];

const pickupStatusColors = {
  Scheduled: 'bg-sky-500/10 text-sky-600 border-sky-500/15',
  Assigned: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/15',
  'Picked Up': 'bg-violet-500/10 text-violet-600 border-violet-500/15',
  Completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
};

const deliveryStatusColors = {
  Scheduled: 'bg-sky-500/10 text-sky-600 border-sky-500/15',
  'Out for Delivery': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
  Delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  Failed: 'bg-rose-500/10 text-rose-600 border-rose-500/15',
};

const normalizeAreaKey = (area) =>
  String(area || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const AREA_ALIASES = {
  hawally: 'hawalli',
  hawali: 'hawalli',
  salmiyah: 'salmiya',
};

const areasMatch = (driverArea, customerArea) => {
  const a = AREA_ALIASES[normalizeAreaKey(driverArea)] || normalizeAreaKey(driverArea);
  const b = AREA_ALIASES[normalizeAreaKey(customerArea)] || normalizeAreaKey(customerArea);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};

const getDriverAreas = (drv) => {
  const rawAreas = drv.areas || (drv.area ? [drv.area] : []);
  return rawAreas
    .flatMap((a) => (typeof a === 'string' ? a.split(',').map((s) => s.trim()) : a))
    .filter((a) => a && a !== '...' && a !== '…');
};

const getAssignableDrivers = (driversList, customerArea, currentlyAssigned = '') => {
  const allDrivers = driversList || [];
  const seen = new Set();
  const list = [];

  if (currentlyAssigned) {
    const assigned = allDrivers.find((d) => d.driverName === currentlyAssigned);
    if (assigned) {
      list.push(assigned);
      seen.add(assigned.driverName);
    }
  }

  allDrivers.forEach((drv) => {
    if (drv.status === 'Off Duty' || seen.has(drv.driverName)) return;
    list.push(drv);
    seen.add(drv.driverName);
  });

  const area = customerArea || '';
  const isAreaMatch = (drv) =>
    area ? getDriverAreas(drv).some((driverArea) => areasMatch(driverArea, area)) : false;

  return list.sort((a, b) => {
    const aMatch = isAreaMatch(a) ? 0 : 1;
    const bMatch = isAreaMatch(b) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    const order = { Available: 1, Assigned: 2, 'On Delivery': 3, 'Off Duty': 4 };
    return (order[a.status] || 5) - (order[b.status] || 5);
  });
};

const PickupDelivery = () => {
  const { t, language } = useLanguage();
  const { pickups, deliveries, drivers, customers, orders, assignDriverToJob, updatePickupJob, updateDeliveryJob, addPickup, addDelivery, selectedBranch, branches } = useContext(AdminStateContext);
  const isHomeServices = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return false;
      const bName = user.branchName || '';
      const bNames = Array.isArray(user.branches) ? user.branches : [];
      return bName.toLowerCase().includes('home service') || bNames.some(n => String(n).toLowerCase().includes('home service'));
    } catch (err) { return false; }
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupStatusFilter, setPickupStatusFilter] = useState('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const customerDropdownRef = useRef(null);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const [selectedPickupIds, setSelectedPickupIds] = useState([]);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkDriver, setBulkDriver] = useState('');

  // Workshop print filters state
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [workshopStartDate, setWorkshopStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  ); // default to 30 days ago to catch mock/existing orders
  const [workshopEndDate, setWorkshopEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [workshopName, setWorkshopName] = useState('ورشة السجاد الرئيسية');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomersList = useMemo(() => {
    if (!customerSearchQuery) return customers;
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(customerSearchQuery) ||
        (c.phones && c.phones.some((p) => p && String(p).includes(customerSearchQuery)))
    );
  }, [customers, customerSearchQuery]);

  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  const customerInputDisplay =
    customerSearchQuery !== '' || showCustomerResults
      ? customerSearchQuery
      : selectedCustomerObj
        ? `${selectedCustomerObj.name} (${selectedCustomerObj.phone})`
        : '';

  const handleSelectCustomer = (cust) => {
    setSelectedCustomerId(cust.id);
    setCustomerSearchQuery('');
    setShowCustomerResults(false);
    setSearchTerm('');
    setSelectedPickupIds([]);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setShowCustomerResults(false);
    setSearchTerm('');
    setSelectedPickupIds([]);
  };

  const ensureCustomerSelected = () => {
    if (!selectedCustomerObj) {
      toast.warning('Please select a customer first');
      return false;
    }
    return true;
  };

  const getCustomerDiscountLabel = (cust) => {
    if (!cust) return 'N/A';
    if (cust.customerLevel === 'Custom Discount') {
      return `Custom Discount (${cust.customDiscountRate || 0}%)`;
    }
    if (cust.customerLevel) return `${cust.customerLevel}%`;
    return 'No Discount (0%)';
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPickupIds(filteredPickups.map((p) => p.id));
    } else {
      setSelectedPickupIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedPickupIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handlePrintManifest = () => {
    if (selectedPickupIds.length === 0) {
      toast.warning('Please select at least one pickup request to print');
      return;
    }

    const selectedPickups = pickups.filter(p => selectedPickupIds.includes(p.id));
    const uniqueDrivers = [...new Set(selectedPickups.map(p => p.assignedStaff || 'Unassigned'))].filter(Boolean);
    const driverName = uniqueDrivers.join(', ') || 'Unassigned';
    const totalPickups = selectedPickups.length;

    let itemsHtml = '';
    selectedPickups.forEach((p, idx) => {
      const cust = customers.find(c => c.name === p.customer);
      itemsHtml += `
        <div class="pickup-entry" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid;">
          <div class="entry-header" style="font-size: 16px; font-weight: bold; color: #2563eb; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Pickup #${idx + 1} (${p.pickupId || p.requestId || ''})</div>
          <div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 10px;">
            <div><strong>Customer:</strong> ${p.customer || 'N/A'}</div>
            <div><strong>Phone:</strong> ${p.contactNumber || 'N/A'}</div>
            <div><strong>Pickup Date:</strong> ${p.pickupDate || 'N/A'}</div>
            <div><strong>Driver:</strong> ${p.assignedStaff || 'Unassigned'}</div>
          </div>
          <div class="address-section" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 12px;">
            <strong>Delivery Address:</strong>
            <div class="address-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 5px;">
              <span><strong>Area:</strong> ${cust?.areaName || 'N/A'}</span>
              <span><strong>Block:</strong> ${cust?.partNo || 'N/A'}</span>
              <span><strong>Street (S):</strong> ${cust?.street || 'N/A'}</span>
              <span><strong>Jadah:</strong> ${cust?.jadda || 'N/A'}</span>
              <span><strong>House:</strong> ${cust?.houseNo || 'N/A'}</span>
              <span><strong>Floor (F):</strong> ${cust?.levelNo || 'N/A'}</span>
              <span><strong>Flat:</strong> ${cust?.flatNo || 'N/A'}</span>
            </div>
          </div>
        </div>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <title>Driver Manifest</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #333;
              padding: 20px;
            }
            .header {
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #1e3a8a;
            }
            .header-meta {
              margin-top: 10px;
              font-size: 14px;
              display: flex;
              gap: 20px;
            }
            .no-print-bar {
              display: none;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Driver Manifest</h1>
            <div class="header-meta">
              <span><strong>Driver:</strong> ${driverName}</span>
              <span><strong>Total Pickups:</strong> ${totalPickups}</span>
              <span><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
          <div class="entries">
            ${itemsHtml}
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(htmlContent);
    iframe.contentWindow.document.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    };
  };

  const handlePrintWorkshopList = () => {
    if (!selectedCustomerObj) {
      toast.error('Please select a customer first');
      return;
    }

    if (!orders) {
      toast.error('Orders data is not loaded');
      return;
    }

    let filteredOrders = orders.filter((o) => {
      const matchesCustomer =
        String(o.customerId) === String(selectedCustomerObj.id) ||
        o.customerName === selectedCustomerObj.name;
      const isWorkshop = o.status === 'Preparing in workshop' || o.status === 'In Workshop';
      const orderDate = o.date;
      const inRange = (!workshopStartDate || orderDate >= workshopStartDate) &&
        (!workshopEndDate || orderDate <= workshopEndDate);

      const hasHeavyItems = o.itemDetails?.some(it =>
        /carpet|sajjad|سجاد|blanket|sheet|bedsheet|بطانية|شراشف/i.test(it.name)
      );

      return matchesCustomer && isWorkshop && inRange && hasHeavyItems;
    });

    const isAr = language === 'ar';
    const text = {
      workshop: isAr ? 'الورشة' : 'Workshop',
      statusLabel: isAr ? 'الحالة: بالورشة' : 'Status: Preparing in workshop',
      from: isAr ? 'من' : 'From',
      to: isAr ? 'إلى' : 'To',
      title: isAr ? 'قائمة السجاد و البطانيات' : 'List of Carpets & Blankets',
      sr: isAr ? 'م' : 'SR',
      autoNo: isAr ? 'الرقم الآلي للعنوان' : 'PACI Address No',
      addressDetails: isAr ? 'العنوان بالتفصيل' : 'Detailed Address',
      flat: isAr ? 'شقة' : 'Flat',
      floor: isAr ? 'طابق' : 'Floor',
      house: isAr ? 'منزل' : 'House',
      jada: isAr ? 'جادة' : 'Jada',
      street: isAr ? 'شارع' : 'Street',
      block: isAr ? 'قطعة' : 'Block',
      area: isAr ? 'المنطقة' : 'Area',
      deliveredItems: isAr ? 'القطع المسلمة للورشة' : 'Workshop Items Tally',
      carpet: isAr ? 'سجاد (C)' : 'Carpet (C)',
      blanket: isAr ? 'بطانية (SH)' : 'Blanket (SH)',
      other: isAr ? 'أخرى' : 'Other',
      status: isAr ? 'الحالة' : 'Status',
      paid: isAr ? 'المدفوع' : 'Paid',
      invoiceNo: isAr ? 'رقم الفاتورة' : 'Invoice Number',
      autoInvoice: isAr ? 'رقم آلي' : 'Auto No',
      manualInvoice: isAr ? 'رقم يدوي' : 'Manual No',
      customerNo: isAr ? 'رقم العميل' : 'Customer ID',
      totalInvoices: isAr ? 'عدد الفواتير' : 'Total Invoices',
      totalCustomers: isAr ? 'عدد العملاء' : 'Total Customers',
      totalCarpets: isAr ? 'إجمالي قطع السجاد' : 'Total Carpets',
      totalBlankets: isAr ? 'إجمالي قطع البطانيات' : 'Total Blankets',
      grandTotal: isAr ? 'المجموع الكلي' : 'Grand Total',
      printDate: isAr ? 'تاريخ الطباعة' : 'Print Date',
      paidVal: isAr ? 'مدفوع' : 'Paid',
      pendingVal: isAr ? 'معلق' : 'Pending'
    };

    // No dummy data when a specific customer is selected
    if (filteredOrders.length === 0) {
      toast.info(`No workshop orders found for ${selectedCustomerObj.name} in the selected date range`);
      setShowWorkshopModal(false);
      return;
    }


    let grandCarpetCount = 0;
    let grandBlanketCount = 0;
    let grandTotalAmount = 0;
    const uniqueCustomers = new Set();

    let tableRowsHtml = '';

    filteredOrders.forEach((o, idx) => {
      const cust = o.areaName ? o : customers.find(c => String(c.id) === String(o.customerId) || c.name === o.customerName);
      uniqueCustomers.add(o.customerId || o.customerName);

      let carpetCount = 0;
      let blanketCount = 0;
      let otherCount = 0;

      o.itemDetails?.forEach(it => {
        const name = it.name.toLowerCase();
        if (/carpet|sajjad|سجاد/i.test(name)) {
          carpetCount += it.quantity;
        } else if (/blanket|sheet|bedsheet|بطانية|شراشف/i.test(name)) {
          blanketCount += it.quantity;
        } else {
          otherCount += it.quantity;
        }
      });

      grandCarpetCount += carpetCount;
      grandBlanketCount += blanketCount;
      grandTotalAmount += Number(o.totalAmount) || 0;

      const paidAmt = o.paymentStatus === 'Paid' ? (Number(o.totalAmount) || 0) : 0;

      tableRowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td>${cust?.automaticAddressNo || '0'}</td>
          <td>${cust?.flatNo || '—'}</td>
          <td>${cust?.levelNo || '—'}</td>
          <td>${cust?.houseNo || '—'}</td>
          <td>${cust?.jadda || '—'}</td>
          <td>${cust?.street || '—'}</td>
          <td>${cust?.partNo || '—'}</td>
          <td>${cust?.areaName || '—'}</td>
          <td style="font-weight: bold; background-color: #f8fafc;">${carpetCount || '—'}</td>
          <td style="font-weight: bold; background-color: #f8fafc;">${blanketCount || '—'}</td>
          <td>${otherCount || '—'}</td>
          <td>${o.paymentStatus === 'Paid' ? text.paidVal : text.pendingVal}</td>
          <td>${paidAmt.toFixed(3)}</td>
          <td>${o.number}</td>
          <td>—</td>
          <td>${o.customerId || '—'}</td>
        </tr>
      `;
    });

    const arabicStartDate = workshopStartDate ? workshopStartDate.split('-').reverse().join('-') : '—';
    const arabicEndDate = workshopEndDate ? workshopEndDate.split('-').reverse().join('-') : '—';
    const printedDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-GB').replace(/\//g, '-');

    const htmlContent = `
      <html dir="${isAr ? 'rtl' : 'ltr'}">
        <head>
          <title>${text.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            @page {
              size: auto;
              margin: 0; /* Removes default browser headers (page title, date, URL) */
            }
            body {
              font-family: 'Cairo', Arial, sans-serif;
              color: #000;
              margin: 1.5cm 1cm;
              padding: 0;
              font-size: 11px;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .header-table td {
              border: none;
              padding: 6px;
              vertical-align: middle;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              text-align: center;
              border: 2px solid #000;
              padding: 8px 16px;
              border-radius: 6px;
              background-color: #f1f5f9;
            }
            .meta-box {
              border: 1px solid #000;
              padding: 6px 12px;
              border-radius: 6px;
              font-weight: 700;
              text-align: center;
              font-size: 12px;
              background-color: #f8fafc;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .data-table th, .data-table td {
              border: 1px solid #000;
              padding: 6px 4px;
              text-align: center;
              font-size: 11px;
            }
            .data-table th {
              background-color: #f1f5f9;
              font-weight: 700;
            }
            .summary-table {
              width: 100%;
              margin-top: 20px;
              border-collapse: collapse;
            }
            .summary-table td {
              border: 1px solid #000;
              padding: 10px;
              font-weight: 700;
              text-align: center;
              background-color: #f1f5f9;
              font-size: 12px;
            }
            .no-print-bar {
              background-color: #f1f5f9;
              padding: 12px 20px;
              display: flex;
              gap: 12px;
              border-bottom: 1px solid #cbd5e1;
              justify-content: flex-end;
              position: sticky;
              top: 0;
              z-index: 1000;
              margin: -1.5cm -1cm 1.5cm -1cm;
            }
            .print-btn {
              background-color: #2563eb;
              color: white;
              border: none;
              padding: 8px 18px;
              border-radius: 6px;
              font-weight: bold;
              cursor: pointer;
              font-family: 'Cairo', Arial, sans-serif;
              font-size: 13px;
              transition: background 0.2s;
            }
            .print-btn:hover {
              background-color: #1d4ed8;
            }
            .close-btn {
              background-color: #64748b;
              color: white;
              border: none;
              padding: 8px 18px;
              border-radius: 6px;
              font-weight: bold;
              cursor: pointer;
              font-family: 'Cairo', Arial, sans-serif;
              font-size: 13px;
              transition: background 0.2s;
            }
            .close-btn:hover {
              background-color: #475569;
            }
            @media print {
              body {
                margin: 1.2cm 0.8cm;
              }
              .title, .data-table th, .summary-table td {
                background-color: #f1f5f9 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .meta-box {
                background-color: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print-bar {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar">
            <button class="print-btn" onclick="window.print()">${isAr ? 'طباعة القائمة' : 'Print List'}</button>
            <button class="close-btn" onclick="window.close()">${isAr ? 'إغلاق' : 'Close'}</button>
          </div>
          <!-- Top Metadata Header -->
          <table class="header-table">
            <tr>
              <td style="width: 25%; font-weight: bold; font-size: 13px;">${text.workshop}: <span style="font-weight: normal;">${workshopName}</span></td>
              <td style="width: 15%;">
                <div class="meta-box">${text.statusLabel}</div>
              </td>
              <td style="width: 20%; text-align: center;">
                <div class="meta-box">${text.from}: ${arabicStartDate}</div>
              </td>
              <td style="width: 20%; text-align: center;">
                <div class="meta-box">${text.to}: ${arabicEndDate}</div>
              </td>
              <td style="width: 20%; text-align: ${isAr ? 'left' : 'right'}; font-weight: bold; font-size: 16px;">
                ${text.title}
              </td>
            </tr>
          </table>

          <!-- Data Grid -->
          <table class="data-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 3%;">${text.sr}</th>
                <th rowspan="2" style="width: 8%;">${text.autoNo}</th>
                <th colspan="7">${text.addressDetails}</th>
                <th colspan="3">${text.deliveredItems}</th>
                <th rowspan="2" style="width: 8%;">${text.status}</th>
                <th rowspan="2" style="width: 8%;">${text.paid}</th>
                <th colspan="2">${text.invoiceNo}</th>
                <th rowspan="2" style="width: 6%;">${text.customerNo}</th>
              </tr>
              <tr>
                <th style="width: 4%;">${text.flat}</th>
                <th style="width: 4%;">${text.floor}</th>
                <th style="width: 4%;">${text.house}</th>
                <th style="width: 4%;">${text.jada}</th>
                <th style="width: 4%;">${text.street}</th>
                <th style="width: 4%;">${text.block}</th>
                <th style="width: 8%;">${text.area}</th>
                <th style="width: 5%; background-color: #e2e8f0;">${text.carpet}</th>
                <th style="width: 5%; background-color: #e2e8f0;">${text.blanket}</th>
                <th style="width: 4%;">${text.other}</th>
                <th style="width: 10%;">${text.autoInvoice}</th>
                <th style="width: 8%;">${text.manualInvoice}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- Bottom Summary Row -->
          <table class="summary-table">
            <tr>
              <td>${text.totalInvoices}: ${filteredOrders.length}</td>
              <td>${text.totalCustomers}: ${uniqueCustomers.size}</td>
              <td>${text.totalCarpets}: ${grandCarpetCount}</td>
              <td>${text.totalBlankets}: ${grandBlanketCount}</td>
              <td>${text.grandTotal}: ${grandTotalAmount.toFixed(3)} KWD</td>
            </tr>
          </table>

          <div style="margin-top: 25px; font-size: 10px; color: #555; text-align: left;">
            ${text.printDate}: ${printedDate} | Tuhama Laundry System
          </div>

        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(htmlContent);
    iframe.contentWindow.document.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    };
    setShowWorkshopModal(false);
  };

  const [showEditPickupModal, setShowEditPickupModal] = useState(false);
  const [editPickupData, setEditPickupData] = useState(null);

  const [showEditDeliveryModal, setShowEditDeliveryModal] = useState(false);
  const [editDeliveryData, setEditDeliveryData] = useState(null);

  const [showAddPickupModal, setShowAddPickupModal] = useState(false);
  const [addPickupData, setAddPickupData] = useState({
    customer: '',
    pickupDate: new Date().toISOString().split('T')[0],
    assignedStaff: '',
    notes: '',
    address: '',
  });

  const [showAddDeliveryModal, setShowAddDeliveryModal] = useState(false);
  const [addDeliveryData, setAddDeliveryData] = useState({
    customer: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    assignedStaff: '',
    orderCount: 1,
    address: '',
  });


  // Get filtered and sorted drivers for New Pickup Modal
  const assignableDriversForNewPickup = useMemo(() => {
    const cust = customers.find((c) => c.name === addPickupData.customer);
    if (!cust) return [];
    const custBranchId = cust.branchId || cust.branch;
    const targetBranch = branches?.find(b => (b.id || b._id)?.toString() === custBranchId?.toString());
    const targetBranchName = targetBranch ? targetBranch.name : '';
    const branchDrivers = targetBranchName
      ? drivers.filter(d => d.branch === targetBranchName)
      : drivers;
    return getAssignableDrivers(branchDrivers, cust?.areaName);
  }, [drivers, customers, addPickupData.customer, branches]);

  // Get filtered and sorted drivers for Edit Pickup Modal
  const assignableDriversForEditPickup = useMemo(() => {
    if (!editPickupData) return [];
    const cust = customers.find((c) => c.name === editPickupData.customer);
    const pickupBranchId = editPickupData.branchId;
    const targetBranch = branches?.find(b => (b.id || b._id)?.toString() === pickupBranchId?.toString());
    const targetBranchName = targetBranch ? targetBranch.name : '';
    const branchDrivers = targetBranchName
      ? drivers.filter(d => d.branch === targetBranchName)
      : drivers;
    return getAssignableDrivers(branchDrivers, cust?.areaName, editPickupData.assignedStaff);
  }, [drivers, customers, editPickupData, branches]);

  // Get filtered and sorted drivers for New Delivery Modal
  const assignableDriversForNewDelivery = useMemo(() => {
    const cust = customers.find((c) => c.name === addDeliveryData.customer);
    if (!cust) return [];
    const custBranchId = cust.branchId || cust.branch;
    const targetBranch = branches?.find(b => (b.id || b._id)?.toString() === custBranchId?.toString());
    const targetBranchName = targetBranch ? targetBranch.name : '';
    const branchDrivers = targetBranchName
      ? drivers.filter(d => d.branch === targetBranchName)
      : drivers;
    return getAssignableDrivers(branchDrivers, cust?.areaName);
  }, [drivers, customers, addDeliveryData.customer, branches]);

  // Get filtered and sorted drivers for Edit Delivery Modal
  const assignableDriversForEditDelivery = useMemo(() => {
    if (!editDeliveryData) return [];
    const cust = customers.find((c) => c.name === editDeliveryData.customer);
    const deliveryBranchId = editDeliveryData.branchId;
    const targetBranch = branches?.find(b => (b.id || b._id)?.toString() === deliveryBranchId?.toString());
    const targetBranchName = targetBranch ? targetBranch.name : '';
    const branchDrivers = targetBranchName
      ? drivers.filter(d => d.branch === targetBranchName)
      : drivers;
    return getAssignableDrivers(branchDrivers, cust?.areaName, editDeliveryData.assignedStaff);
  }, [drivers, customers, editDeliveryData, branches]);

  const getCustomerAddress = (custName) => {
    const cust = customers.find(c => c.name === custName);
    if (!cust) return '';
    const addressParts = [
      cust.areaName ? `Area: ${cust.areaName}` : '',
      cust.partNo ? `Block: ${cust.partNo}` : '',
      cust.street ? `Street: ${cust.street}` : '',
      cust.jadda ? `Jadah: ${cust.jadda}` : '',
      cust.houseNo ? `House: ${cust.houseNo}` : '',
      cust.levelNo ? `F: ${cust.levelNo}` : '',
      cust.flatNo ? `Flat: ${cust.flatNo}` : '',
    ].filter(Boolean).join(', ');
    return addressParts || cust.address || '';
  };

  const handleEditPickup = (pickup) => {
    setEditPickupData({ ...pickup });
    setShowEditPickupModal(true);
  };

  const handleEditDelivery = (delivery) => {
    setEditDeliveryData({ ...delivery });
    setShowEditDeliveryModal(true);
  };

  const handleBulkAssignDeliveries = async (selectedDriverName) => {
    try {
      const selectedDeliveries = filteredDeliveries.filter(d => selectedDeliveryIds.includes(d.id));

      const updatePromises = selectedDeliveries.map(delivery => {
        const isUnassign = !selectedDriverName || selectedDriverName === 'Unassigned';
        const newStatus = isUnassign ? 'Scheduled' : 'Assigned';
        return updateDeliveryJob({
          ...delivery,
          assignedStaff: selectedDriverName,
          status: newStatus
        });
      });

      await Promise.all(updatePromises);
      toast.success(`Successfully assigned driver to ${selectedDeliveries.length} deliveries`);
      setSelectedDeliveryIds([]);
      setShowBulkAssignModal(false);
      setBulkDriver('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to bulk assign driver');
    }
  };

  const filteredPickups = useMemo(() => {
    return pickups.filter((pickup) => {
      const pickupCustomer = pickup.customer || '';
      const matchesCustomer =
        !selectedCustomerObj || pickupCustomer.toLowerCase() === selectedCustomerObj.name.toLowerCase();
      const matchesSearch =
        pickupCustomer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pickup.pickupId || '').includes(searchTerm) ||
        (pickup.requestId || '').includes(searchTerm);
      const matchesStatus = pickupStatusFilter === 'All' || pickup.status === pickupStatusFilter;
      return matchesCustomer && matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return String(b.pickupId || '').localeCompare(String(a.pickupId || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [pickups, searchTerm, pickupStatusFilter, selectedCustomerObj]);

  const allHomeDeliveries = useMemo(() => {
    const deliveryMap = new Map();

    // 1. First add all explicit Delivery records
    (deliveries || []).forEach((d) => {
      const key = d.orderNumber || d.id || d.deliveryId;
      deliveryMap.set(key, { ...d });
    });

    // 2. Also ensure every order marked Home Delivery is represented
    (orders || []).forEach((o) => {
      const isHome = o.deliveryType === 'Home Delivery' || o.isHomeDelivery === true || o.deliveryMode === 'home';
      if (!isHome) return;

      const existing = deliveryMap.get(o.number) || deliveryMap.get(o.id);
      if (existing) {
        existing.orderNumber = existing.orderNumber || o.number;
        existing.customer = existing.customer || o.customerName;
        existing.orderDate = existing.orderDate || o.date || (o.createdAt ? o.createdAt.substring(0, 10) : '');
        existing.deliveryDate = existing.deliveryDate || o.deliveryDate || o.expectedDeliveryDate || '';
        existing.branchId = existing.branchId || o.branchId;
        existing.sharedBranches = o.sharedBranches;
        existing.transferredTo = o.transferredTo;
        existing.transferredBranchName = o.transferredBranchName;
        existing.orderStatus = o.status;
        existing.paymentStatus = o.paymentStatus;
        existing.totalAmount = o.totalAmount;
        existing.createdFromInvoice = true;
      } else {
        deliveryMap.set(o.number, {
          id: `del-order-${o.id || o.number}`,
          deliveryId: `DEL-${o.number}`,
          orderNumber: o.number,
          customer: o.customerName,
          orderDate: o.date || (o.createdAt ? o.createdAt.substring(0, 10) : ''),
          deliveryDate: o.deliveryDate || o.expectedDeliveryDate || '',
          assignedStaff: 'Unassigned',
          orderCount: (o.itemDetails && o.itemDetails.length) || 1,
          status: o.status === 'Delivered' ? 'Delivered' : 'Scheduled',
          address: o.notes || '',
          contactNumber: o.customerPhone || '',
          areaName: '',
          createdFromInvoice: true,
          branchId: o.branchId,
          sharedBranches: o.sharedBranches,
          transferredTo: o.transferredTo,
          transferredBranchName: o.transferredBranchName,
          orderStatus: o.status,
          paymentStatus: o.paymentStatus,
          totalAmount: o.totalAmount,
        });
      }
    });

    return Array.from(deliveryMap.values());
  }, [deliveries, orders]);

  const filteredDeliveries = useMemo(() => {
    return allHomeDeliveries.filter((delivery) => {
      // Branch filtering: match active selected branch (or transferred branch)
      const matchesBranch = (() => {
        if (!selectedBranch || selectedBranch === 'All') return true;
        const selStr = String(selectedBranch).toLowerCase();

        // If Home Service branch is selected, show all home deliveries across all branches
        const activeBranchObj = branches?.find(b => String(b.id || b._id).toLowerCase() === selStr || String(b.name || '').toLowerCase() === selStr);
        const bName = String(activeBranchObj?.name || selectedBranch || '').toLowerCase();
        if (bName.includes('home service') || selStr.includes('home')) return true;

        if (delivery.branchId && String(delivery.branchId).toLowerCase() === selStr) return true;
        if (delivery.transferredTo && String(delivery.transferredTo).toLowerCase() === selStr) return true;
        if (delivery.transferredBranchName && String(delivery.transferredBranchName).toLowerCase() === selStr) return true;
        if (Array.isArray(delivery.sharedBranches) && delivery.sharedBranches.some(b => String(b).toLowerCase() === selStr)) return true;

        if (activeBranchObj) {
          const bId = String(activeBranchObj.id || activeBranchObj._id).toLowerCase();
          if (delivery.branchId && String(delivery.branchId).toLowerCase() === bId) return true;
          if (delivery.transferredTo && String(delivery.transferredTo).toLowerCase() === bId) return true;
          if (delivery.transferredBranchName && String(delivery.transferredBranchName).toLowerCase() === bName) return true;
          if (Array.isArray(delivery.sharedBranches) && delivery.sharedBranches.some(b => String(b).toLowerCase() === bId)) return true;
        }
        return false;
      })();

      const deliveryCustomer = delivery.customer || '';
      const matchesCustomer =
        selectedCustomerObj
          ? deliveryCustomer.toLowerCase() === selectedCustomerObj.name.toLowerCase()
          : true;

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        deliveryCustomer.toLowerCase().includes(q) ||
        (delivery.deliveryId || '').toLowerCase().includes(q) ||
        (delivery.orderNumber || '').toLowerCase().includes(q);

      return matchesBranch && matchesCustomer && matchesSearch;
    }).sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return String(b.deliveryId || '').localeCompare(String(a.deliveryId || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [allHomeDeliveries, searchTerm, selectedCustomerObj, selectedBranch, branches]);

  const handleViewPickup = (pickup) => {
    setSelectedPickup(pickup);
    setShowPickupModal(true);
  };

  const handleViewDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDeliveryModal(true);
  };

  const handleSchedulePickup = () => {
    if (!ensureCustomerSelected()) return;
    const address = getCustomerAddress(selectedCustomerObj.name);
    setAddPickupData({
      customer: selectedCustomerObj.name,
      pickupDate: new Date().toISOString().split('T')[0],
      assignedStaff: '',
      notes: '',
      address,
    });
    setShowAddPickupModal(true);
  };

  const handleScheduleDelivery = () => {
    if (!ensureCustomerSelected()) return;
    const address = getCustomerAddress(selectedCustomerObj.name);
    setAddDeliveryData({
      customer: selectedCustomerObj.name,
      deliveryDate: new Date().toISOString().split('T')[0],
      assignedStaff: '',
      orderCount: 1,
      address,
    });
    setShowAddDeliveryModal(true);
  };

  const handleSaveNewPickup = (e) => {
    e.preventDefault();
    if (!addPickupData.customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!addPickupData.pickupDate) {
      toast.error('Please select a pickup date');
      return;
    }

    const isHomeServices = (() => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user && user.branchName && user.branchName.toLowerCase().includes('home service');
      } catch (err) { return false; }
    })();
    const activeBranch = (selectedBranch === 'All' || isHomeServices) ? (selectedCustomerObj?.branchId || selectedCustomerObj?.branch || selectedBranch) : selectedBranch;
    const pickupPayload = {
      customer: addPickupData.customer,
      pickupDate: addPickupData.pickupDate,
      assignedStaff: addPickupData.assignedStaff || '',
      notes: addPickupData.notes || '',
      address: addPickupData.address || '',
      contactNumber: selectedCustomerObj?.phone || '',
      areaName: selectedCustomerObj?.areaName || '',
      branchId: activeBranch
    };

    addPickup(pickupPayload).then((data) => {
      if (data) {
        if (addPickupData.assignedStaff) {
          assignDriverToJob(addPickupData.assignedStaff, 'pickup');
        }
        toast.success(`Pickup Request ${data.pickupId} scheduled successfully`);
        setShowAddPickupModal(false);
      }
    });
  };

  const handleSaveNewDelivery = (e) => {
    e.preventDefault();
    if (!addDeliveryData.customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!addDeliveryData.deliveryDate) {
      toast.error('Please select a delivery date');
      return;
    }

    const isHomeServices = (() => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user && user.branchName && user.branchName.toLowerCase().includes('home service');
      } catch (err) { return false; }
    })();
    const activeBranch = (selectedBranch === 'All' || isHomeServices) ? (selectedCustomerObj?.branchId || selectedCustomerObj?.branch || selectedBranch) : selectedBranch;
    const deliveryPayload = {
      customer: addDeliveryData.customer,
      deliveryDate: addDeliveryData.deliveryDate,
      assignedStaff: addDeliveryData.assignedStaff || '',
      orderNumber: 'ORD-MANUAL',
      orderCount: addDeliveryData.orderCount || 1,
      address: addDeliveryData.address || '',
      contactNumber: selectedCustomerObj?.phone || '',
      areaName: selectedCustomerObj?.areaName || '',
      branchId: activeBranch
    };

    addDelivery(deliveryPayload).then((data) => {
      if (data) {
        if (addDeliveryData.assignedStaff) {
          assignDriverToJob(addDeliveryData.assignedStaff, 'delivery');
        }
        toast.success(`Delivery ${data.deliveryId} scheduled successfully`);
        setShowAddDeliveryModal(false);
      }
    });
  };

  const pickupColumns = [
    {
      header: (
        <input
          type="checkbox"
          checked={filteredPickups.length > 0 && selectedPickupIds.length === filteredPickups.length}
          onChange={handleSelectAll}
          className="rounded border-border text-blue-500 focus:ring-blue-400/40 h-4 w-4"
        />
      ),
      accessor: 'checkbox',
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedPickupIds.includes(row.id)}
          onChange={() => handleSelectRow(row.id)}
          className="rounded border-border text-blue-500 focus:ring-blue-400/40 h-4 w-4"
        />
      ),
    },
    {
      header: 'Request ID',
      accessor: 'pickupId',
      cell: (row) => row.pickupId || row.requestId || 'N/A'
    },
    { header: 'Customer', accessor: 'customer' },
    {
      header: language === 'ar' ? 'العنوان' : 'Address',
      accessor: 'address',
      cell: (row) => {
        const cust = customers.find((c) => c.name === row.customer);
        if (language === 'ar') {
          return (
            <div className="text-xs space-y-0.5 text-right font-medium" dir="rtl">
              <div><strong>المنطقة:</strong> {cust?.areaName || row.areaName || 'Salmiya'}</div>
              <div><strong>قطعة:</strong> {cust?.partNo || row.partNo || '12'}</div>
              <div><strong>الشارع:</strong> {cust?.street || row.street || '5'}</div>
              <div><strong>الجادة:</strong> {cust?.jadda || row.jadda || '2'}</div>
              <div><strong>المنزل:</strong> {cust?.houseNo || row.houseNo || '14'}</div>
              <div><strong>الطابق:</strong> {cust?.levelNo || row.levelNo || '3'}</div>
              <div><strong>الشقة:</strong> {cust?.flatNo || row.flatNo || '12'}</div>
            </div>
          );
        }
        return (
          <div className="text-xs space-y-0.5 text-left font-medium" dir="ltr">
            <div><strong>Area:</strong> {cust?.areaName || row.areaName || 'Salmiya'}</div>
            <div><strong>Block:</strong> {cust?.partNo || row.partNo || '12'}</div>
            <div><strong>S:</strong> {cust?.street || row.street || '5'}</div>
            <div><strong>Jadah:</strong> {cust?.jadda || row.jadda || '2'}</div>
            <div><strong>House:</strong> {cust?.houseNo || row.houseNo || '14'}</div>
            <div><strong>F:</strong> {cust?.levelNo || row.levelNo || '3'}</div>
            <div><strong>Flat:</strong> {cust?.flatNo || row.flatNo || '12'}</div>
          </div>
        );
      }
    },
    { header: 'Pickup Date', accessor: 'pickupDate', format: (val) => formatDate(val) },
    { header: 'Assigned Staff', accessor: 'assignedStaff', format: (val) => val || 'Unassigned' },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusClass = `status-pill ${pickupStatusColors[row.status] || pickupStatusColors.Scheduled}`;
        return <span className={statusClass}>{row.status}</span>;
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button className="icon-button-small" onClick={() => handleViewPickup(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          <button className="icon-button-small" onClick={() => handleEditPickup(row)} aria-label="Edit">
            <FiEdit2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const deliveryColumns = [
    {
      header: (
        <input
          type="checkbox"
          checked={filteredDeliveries.length > 0 && selectedDeliveryIds.length === filteredDeliveries.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedDeliveryIds(filteredDeliveries.map((d) => d.id));
            } else {
              setSelectedDeliveryIds([]);
            }
          }}
          className="rounded border-border text-blue-500 focus:ring-blue-400/40 h-4 w-4"
        />
      ),
      accessor: 'checkbox',
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedDeliveryIds.includes(row.id)}
          onChange={() => {
            setSelectedDeliveryIds((prev) => {
              if (prev.includes(row.id)) {
                return prev.filter((item) => item !== row.id);
              } else {
                return [...prev, row.id];
              }
            });
          }}
          className="rounded border-border text-blue-500 focus:ring-blue-400/40 h-4 w-4"
        />
      ),
    },
    { header: 'Delivery ID', accessor: 'deliveryId' },
    { header: 'Invoice No.', accessor: 'orderNumber' },
    { header: 'Customer', accessor: 'customer' },
    {
      header: 'Order Date',
      accessor: 'orderDate',
      cell: (row) => {
        const val = row.orderDate;
        if (val) return formatDate(val);
        const order = orders?.find(o => o.number === row.orderNumber);
        const dateVal = order?.createdAt || order?.date;
        return dateVal ? formatDate(dateVal) : 'N/A';
      }
    },
    { header: 'Delivery Date', accessor: 'deliveryDate', format: (val) => formatDate(val) },
    { header: 'Assigned Staff', accessor: 'assignedStaff', format: (val) => val || 'Unassigned' },
    { header: 'Order Count', accessor: 'orderCount' },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusClass = `status-pill ${deliveryStatusColors[row.status] || deliveryStatusColors.Scheduled}`;
        return <span className={statusClass}>{row.status}</span>;
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button className="icon-button-small" onClick={() => handleViewDelivery(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          <button
            onClick={() => handleEditDelivery(row)}
            className="px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all border border-blue-500/20"
          >
            {language === 'ar' ? 'تعيين' : 'Assign'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <section className="surface-card overflow-hidden border border-border shadow-xl">
          <div className="dashboard-hero p-8 md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-secondary">{t('sidebar.pickups') || "Home Service"}</p>
                <h1 className="mt-3 text-3xl font-semibold text-primary">{t('sidebar.pickups') || "Home Service"}</h1>
                <p className="mt-2 max-w-2xl text-sm text-secondary">Schedule and track home service requests.</p>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (!ensureCustomerSelected()) return;
                    setShowWorkshopModal(true);
                  }}
                  disabled={!selectedCustomerObj}
                  className={`dashboard-hero-pill flex items-center justify-center gap-2 ${!selectedCustomerObj ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FiFileText size={18} className="text-blue-500" />
                  <span className="font-semibold">{language === 'ar' ? 'قائمة الورشة' : 'Print Workshop List'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSchedulePickup}
                  disabled={!selectedCustomerObj}
                  className={`dashboard-hero-pill flex items-center justify-center gap-2 ${!selectedCustomerObj ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FiPlus size={18} />
                  <span className="font-semibold">Schedule Pickup</span>
                </button>
                <button
                  type="button"
                  onClick={handleScheduleDelivery}
                  disabled={!selectedCustomerObj}
                  className={`dashboard-hero-pill flex items-center justify-center gap-2 ${!selectedCustomerObj ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FiTruck size={18} />
                  <span className="font-semibold">Schedule Delivery</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Select Customer */}
        <section className="surface-card border border-border rounded-2xl p-4 shadow-md">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
            <div className="relative" ref={customerDropdownRef}>
              <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                Select Customer *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type Name or Phone..."
                  value={customerInputDisplay}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerResults(true);
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                  onFocus={() => {
                    setShowCustomerResults(true);
                    if (selectedCustomerObj && customerSearchQuery === '') {
                      setCustomerSearchQuery('');
                    }
                  }}
                  className={`w-full text-sm rounded-xl border bg-surface pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${selectedCustomerObj && !showCustomerResults && customerSearchQuery === ''
                      ? 'border-emerald-400/60 text-primary font-medium'
                      : 'border-border'
                    }`}
                />
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              </div>

              {showCustomerResults && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface border border-border rounded-xl shadow-xl z-50">
                  {filteredCustomersList.length > 0 ? (
                    filteredCustomersList.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface-alt border-b border-border/40 flex justify-between items-center gap-2"
                      >
                        <span className="font-semibold text-primary truncate">{c.name}</span>
                        <span className="text-secondary font-mono text-xs shrink-0">{c.phone}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-secondary">No customer matches query.</div>
                  )}
                </div>
              )}

              {selectedCustomerObj && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="mt-2 text-xs font-semibold text-rose-500 hover:text-rose-600"
                >
                  Clear selection
                </button>
              )}
            </div>

            {!selectedCustomerObj ? (
              <div className="relative">
                <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                  {language === 'ar' ? 'البحث بواسطة رقم الطلب أو العنوان' : 'Search by Request ID or Address'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'البحث بواسطة رقم الطلب أو العنوان...' : 'Search by request ID or address...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm rounded-xl border border-border bg-surface pl-10 pr-3 py-2.5 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                </div>
              </div>
            ) : null}

            {selectedCustomerObj ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-4 lg:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <FiCheck className="text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-600">
                    Selected: {selectedCustomerObj.name}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Customer ID</p>
                    <p className="font-semibold text-primary">CUS-{String(selectedCustomerObj.id).padStart(4, '0')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Phone</p>
                    <p className="font-semibold text-primary">{selectedCustomerObj.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Email</p>
                    <p className="font-semibold text-primary truncate">{selectedCustomerObj.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Status</p>
                    <p className="font-semibold text-primary">{selectedCustomerObj.status || 'Active'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Discount</p>
                    <p className="font-semibold text-rose-500">{getCustomerDiscountLabel(selectedCustomerObj)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Due Balance</p>
                    <p className={`font-semibold ${Number(selectedCustomerObj.balance || 0) > 0 ? 'text-rose-600' : 'text-primary'}`}>
                      {formatCurrency(selectedCustomerObj.balance || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Total Orders</p>
                    <p className="font-semibold text-primary">{selectedCustomerObj.totalOrders || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Registration</p>
                    <p className="font-semibold text-primary">
                      {selectedCustomerObj.registrationDate ? formatDate(selectedCustomerObj.registrationDate) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary">Arabic Name</p>
                    <p className="font-semibold text-primary">{selectedCustomerObj.arabicName || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-400/20">
                  <p className="text-[10px] uppercase tracking-wider text-secondary mb-2">Address & Location</p>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-sm">
                    <div><span className="text-secondary">Area:</span> <span className="font-semibold text-primary">{selectedCustomerObj.areaName || 'N/A'}</span></div>
                    <div><span className="text-secondary">Block:</span> <span className="font-semibold text-primary">{selectedCustomerObj.partNo || 'N/A'}</span></div>
                    <div><span className="text-secondary">Street:</span> <span className="font-semibold text-primary">{selectedCustomerObj.street || 'N/A'}</span></div>
                    <div><span className="text-secondary">Jadda:</span> <span className="font-semibold text-primary">{selectedCustomerObj.jadda || 'N/A'}</span></div>
                    <div><span className="text-secondary">House:</span> <span className="font-semibold text-primary">{selectedCustomerObj.houseNo || 'N/A'}</span></div>
                    <div><span className="text-secondary">Floor:</span> <span className="font-semibold text-primary">{selectedCustomerObj.levelNo || 'N/A'}</span></div>
                    <div><span className="text-secondary">Flat:</span> <span className="font-semibold text-primary">{selectedCustomerObj.flatNo || 'N/A'}</span></div>
                    <div><span className="text-secondary">Paci No:</span> <span className="font-semibold text-primary">{selectedCustomerObj.paciNo || 'N/A'}</span></div>
                  </div>
                  {(selectedCustomerObj.address || selectedCustomerObj.addressNotes) && (
                    <div className="mt-3 text-sm">
                      <span className="text-secondary">Address:</span>{' '}
                      <span className="font-semibold text-primary">
                        {selectedCustomerObj.addressNotes || selectedCustomerObj.address}
                      </span>
                    </div>
                  )}
                  {selectedCustomerObj.notes && (
                    <div className="mt-2 text-sm">
                      <span className="text-secondary">Notes:</span>{' '}
                      <span className="font-semibold text-primary">{selectedCustomerObj.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {!selectedCustomerObj ? (
          <>
            {/* Deliveries Section */}
            <section className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-primary">
                    {language === 'ar' ? 'فواتير التوصيل المنزلي' : 'Home Delivery Invoices'}
                  </h2>
                  <p className="text-sm text-secondary">
                    {language === 'ar' ? `الإجمالي: ${filteredDeliveries.length} طلبات توصيل` : `Total: ${filteredDeliveries.length} deliveries`}
                  </p>
                </div>
                {selectedDeliveryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBulkAssignModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    {language === 'ar' ? 'تعيين جماعي للسائق' : 'Bulk Assign Driver'} ({selectedDeliveryIds.length})
                  </button>
                )}
              </div>

              <div className="mt-5">
                <ReusableTable columns={deliveryColumns} data={filteredDeliveries} onRowClick={handleViewDelivery} />
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Search and Filter */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search by request ID or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
              </div>

              <div className="relative">
                <select
                  value={pickupStatusFilter}
                  onChange={(e) => setPickupStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                >
                  <option value="All">All Pickup Status</option>
                  {pickupStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
              </div>
            </div>

            {/* Pickups Section */}
            <section>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-primary">Pickup Requests — {selectedCustomerObj.name}</h2>
                  <p className="text-sm text-secondary">Total: {filteredPickups.length} pickups for this customer</p>
                </div>
                <button
                  onClick={handlePrintManifest}
                  disabled={selectedPickupIds.length === 0}
                  className="action-button flex items-center justify-center gap-2 !w-auto !py-2 !px-4 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Print Driver Manifest"
                >
                  <span>Print Driver Manifest {selectedPickupIds.length > 0 ? `(${selectedPickupIds.length})` : ''}</span>
                </button>
              </div>

              <div className="mt-5">
                <ReusableTable columns={pickupColumns} data={filteredPickups} onRowClick={handleViewPickup} />
              </div>
            </section>

            {/* Deliveries Section */}
            <section>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-primary">Deliveries — {selectedCustomerObj.name}</h2>
                  <p className="text-sm text-secondary">Total: {filteredDeliveries.length} deliveries for this customer</p>
                </div>
                {selectedDeliveryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBulkAssignModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    {language === 'ar' ? 'تعيين جماعي للسائق' : 'Bulk Assign Driver'} ({selectedDeliveryIds.length})
                  </button>
                )}
              </div>

              <div className="mt-5">
                <ReusableTable columns={deliveryColumns} data={filteredDeliveries} onRowClick={handleViewDelivery} />
              </div>
            </section>
          </>
        )}
      </div>

      {/* Pickup Details Modal */}
      {showPickupModal && selectedPickup && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">Pickup Details</h2>
              <button onClick={() => setShowPickupModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Request ID</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedPickup.requestId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Customer</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedPickup.customer}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Address</p>
                <div className="mt-2 text-base text-primary">
                  {(() => {
                    const cust = customers.find((c) => c.name === selectedPickup.customer);
                    if (cust && (cust.areaName || cust.partNo || cust.street || cust.jadda || cust.houseNo || cust.levelNo || cust.flatNo)) {
                      if (language === 'ar') {
                        return (
                          <div className="text-sm space-y-0.5 text-right font-medium" dir="rtl">
                            <div><strong>المنطقة:</strong> {cust.areaName || '—'}</div>
                            <div><strong>قطعة:</strong> {cust.partNo || '—'}</div>
                            <div><strong>الشارع:</strong> {cust.street || '—'}</div>
                            <div><strong>الجادة:</strong> {cust.jadda || '—'}</div>
                            <div><strong>المنزل:</strong> {cust.houseNo || '—'}</div>
                            <div><strong>الطابق:</strong> {cust.levelNo || '—'}</div>
                            <div><strong>الشقة:</strong> {cust.flatNo || '—'}</div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-sm space-y-0.5 text-left font-medium" dir="ltr">
                          <div><strong>Area:</strong> {cust.areaName || '—'}</div>
                          <div><strong>Block:</strong> {cust.partNo || '—'}</div>
                          <div><strong>S:</strong> {cust.street || '—'}</div>
                          <div><strong>Jadah:</strong> {cust.jadda || '—'}</div>
                          <div><strong>House:</strong> {cust.houseNo || '—'}</div>
                          <div><strong>F:</strong> {cust.levelNo || '—'}</div>
                          <div><strong>Flat:</strong> {cust.flatNo || '—'}</div>
                        </div>
                      );
                    }
                    return selectedPickup.address || 'N/A';
                  })()}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Pickup Date</p>
                <p className="mt-2 text-lg font-semibold text-primary">{formatDate(selectedPickup.pickupDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Assigned Staff</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedPickup.assignedStaff || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Status</p>
                <p className={`status-pill mt-2 inline-block ${pickupStatusColors[selectedPickup.status]}`}>{selectedPickup.status}</p>
              </div>
              {selectedPickup.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Special Notes</p>
                  <p className="mt-2 text-base text-primary">{selectedPickup.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setShowPickupModal(false)}
                className="flex-1 rounded-3xl border border-blue-500/50 bg-blue-500/10 py-3 font-semibold text-blue-600 transition hover:bg-blue-500/15 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delivery Details Modal */}
      {showDeliveryModal && selectedDelivery && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">Delivery Details</h2>
              <button onClick={() => setShowDeliveryModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Delivery ID</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedDelivery.deliveryId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Customer</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedDelivery.customer}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Delivery Address</p>
                <div className="mt-2 text-base text-primary">
                  {(() => {
                    const cust = customers.find((c) => c.name === selectedDelivery.customer);
                    if (cust && (cust.areaName || cust.partNo || cust.street || cust.jadda || cust.houseNo || cust.levelNo || cust.flatNo)) {
                      if (language === 'ar') {
                        return (
                          <div className="text-sm space-y-0.5 text-right font-medium" dir="rtl">
                            <div><strong>المنطقة:</strong> {cust.areaName || '—'}</div>
                            <div><strong>قطعة:</strong> {cust.partNo || '—'}</div>
                            <div><strong>الشارع:</strong> {cust.street || '—'}</div>
                            <div><strong>الجادة:</strong> {cust.jadda || '—'}</div>
                            <div><strong>المنزل:</strong> {cust.houseNo || '—'}</div>
                            <div><strong>الطابق:</strong> {cust.levelNo || '—'}</div>
                            <div><strong>الشقة:</strong> {cust.flatNo || '—'}</div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-sm space-y-0.5 text-left font-medium" dir="ltr">
                          <div><strong>Area:</strong> {cust.areaName || '—'}</div>
                          <div><strong>Block:</strong> {cust.partNo || '—'}</div>
                          <div><strong>S:</strong> {cust.street || '—'}</div>
                          <div><strong>Jadah:</strong> {cust.jadda || '—'}</div>
                          <div><strong>House:</strong> {cust.houseNo || '—'}</div>
                          <div><strong>F:</strong> {cust.levelNo || '—'}</div>
                          <div><strong>Flat:</strong> {cust.flatNo || '—'}</div>
                        </div>
                      );
                    }
                    return selectedDelivery.address || 'N/A';
                  })()}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Delivery Date</p>
                <p className="mt-2 text-lg font-semibold text-primary">{formatDate(selectedDelivery.deliveryDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Assigned Staff</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedDelivery.assignedStaff || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Orders Included</p>
                <p className="mt-2 text-lg font-semibold text-primary">{selectedDelivery.orderCount} order(s)</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Status</p>
                <p className={`status-pill mt-2 inline-block ${deliveryStatusColors[selectedDelivery.status]}`}>{selectedDelivery.status}</p>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="flex-1 rounded-3xl border border-blue-500/50 bg-blue-500/10 py-3 font-semibold text-blue-600 transition hover:bg-blue-500/15 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Pickup Modal */}
      {showEditPickupModal && editPickupData && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updatePickupJob(editPickupData);
              toast.success(`Pickup Request ${editPickupData.requestId} updated successfully`);
              setShowEditPickupModal(false);
            }}
            className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">Edit Pickup Request</h2>
              <button type="button" onClick={() => setShowEditPickupModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Customer</label>
                <input
                  type="text"
                  disabled
                  value={editPickupData.customer}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface-alt py-3 px-4 text-secondary disabled:opacity-75 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Address</label>
                <input
                  type="text"
                  required
                  value={editPickupData.address}
                  onChange={(e) => setEditPickupData({ ...editPickupData, address: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Pickup Date</label>
                <input
                  type="date"
                  required
                  value={editPickupData.pickupDate ? editPickupData.pickupDate.substring(0, 10) : ''}
                  onChange={(e) => setEditPickupData({ ...editPickupData, pickupDate: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Assigned Staff / Driver</label>
                  <select
                    value={editPickupData.assignedStaff || ''}
                    onChange={(e) => setEditPickupData({ ...editPickupData, assignedStaff: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium animate-none"
                  >
                    <option value="">{editPickupData.customer ? 'Unassigned' : 'Select Customer First'}</option>
                    {assignableDriversForEditPickup.map((drv) => (
                      <option key={drv.id} value={drv.driverName}>
                        {isHomeServices ? `${drv.driverName} (${drv.status} - ${drv.branch || 'No Branch'})` : `${drv.driverName} (${drv.status})`}
                      </option>
                    ))}
                  </select>
                  {editPickupData.assignedStaff && (() => {
                    const drv = drivers.find(d => d.driverName === editPickupData.assignedStaff);
                    if (!drv) return null;
                    const colors = {
                      'Available': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
                      'Assigned': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
                      'On Delivery': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
                      'Off Duty': 'bg-rose-500/10 text-rose-600 border-rose-500/15'
                    };
                    return (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-secondary font-medium">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${colors[drv.status] || colors.Available}`}>
                          {drv.status}
                        </span>
                      </div>
                    );
                  })()}
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Status</label>
                  <select
                    value={editPickupData.status}
                    onChange={(e) => setEditPickupData({ ...editPickupData, status: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    {pickupStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Special Notes</label>
                <textarea
                  value={editPickupData.notes || ''}
                  onChange={(e) => setEditPickupData({ ...editPickupData, notes: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium h-20"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowEditPickupModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Edit Delivery Modal */}
      {showEditDeliveryModal && editDeliveryData && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateDeliveryJob(editDeliveryData);
              toast.success(`Delivery ID ${editDeliveryData.deliveryId} updated successfully`);
              setShowEditDeliveryModal(false);
            }}
            className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">{language === 'ar' ? 'تعيين التوصيل' : 'Assign Delivery'}</h2>
              <button type="button" onClick={() => setShowEditDeliveryModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Customer</label>
                <input
                  type="text"
                  disabled
                  value={editDeliveryData.customer}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface-alt py-3 px-4 text-secondary disabled:opacity-75 focus:outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Address</label>
                <input
                  type="text"
                  required
                  value={editDeliveryData.address || ''}
                  onChange={(e) => setEditDeliveryData({ ...editDeliveryData, address: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Delivery Date</label>
                <input
                  type="date"
                  required
                  value={editDeliveryData.deliveryDate ? editDeliveryData.deliveryDate.substring(0, 10) : ''}
                  onChange={(e) => setEditDeliveryData({ ...editDeliveryData, deliveryDate: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Assigned Staff / Driver</label>
                  <select
                    value={editDeliveryData.assignedStaff || ''}
                    onChange={(e) => setEditDeliveryData({ ...editDeliveryData, assignedStaff: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    <option value="">{editDeliveryData.customer ? 'Unassigned' : 'Select Customer First'}</option>
                    {assignableDriversForEditDelivery.map((drv) => (
                      <option key={drv.id} value={drv.driverName}>
                        {isHomeServices ? `${drv.driverName} (${drv.status} - ${drv.branch || 'No Branch'})` : `${drv.driverName} (${drv.status})`}
                      </option>
                    ))}
                  </select>
                  {editDeliveryData.assignedStaff && (() => {
                    const drv = drivers.find(d => d.driverName === editDeliveryData.assignedStaff);
                    if (!drv) return null;
                    const colors = {
                      'Available': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
                      'Assigned': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
                      'On Delivery': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
                      'Off Duty': 'bg-rose-500/10 text-rose-600 border-rose-500/15'
                    };
                    return (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-secondary font-medium">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${colors[drv.status] || colors.Available}`}>
                          {drv.status}
                        </span>
                      </div>
                    );
                  })()}
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Status</label>
                  <select
                    value={editDeliveryData.status}
                    onChange={(e) => setEditDeliveryData({ ...editDeliveryData, status: e.target.value })}
                    className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  >
                    {deliveryStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowEditDeliveryModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Workshop Print Filter Modal */}
      {showWorkshopModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md rounded-3xl border border-border p-5 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-xl font-bold text-primary">
                {language === 'ar' ? 'طباعة قائمة السجاد والبطانيات بالورشة' : 'Print Carpet & Blanket Workshop List'}
              </h2>
              <button onClick={() => setShowWorkshopModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                  {language === 'ar' ? 'اسم الورشة' : 'Workshop Name'}
                </label>
                <input
                  type="text"
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    {language === 'ar' ? 'من تاريخ' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={workshopStartDate}
                    onChange={(e) => setWorkshopStartDate(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    {language === 'ar' ? 'إلى تاريخ' : 'To Date'}
                  </label>
                  <input
                    type="date"
                    value={workshopEndDate}
                    onChange={(e) => setWorkshopEndDate(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowWorkshopModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handlePrintWorkshopList}
                className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm"
              >
                {language === 'ar' ? 'طباعة 🖨️' : 'Print 🖨️'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Pickup Modal */}
      {showAddPickupModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveNewPickup}
            className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">Schedule Pickup</h2>
              <button type="button" onClick={() => setShowAddPickupModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Customer</label>
                <input
                  type="text"
                  readOnly
                  value={addPickupData.customer}
                  className="w-full rounded-2xl border border-border bg-surface-alt py-3 px-4 text-primary text-sm font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Address</label>
                <input
                  type="text"
                  required
                  value={addPickupData.address}
                  onChange={(e) => setAddPickupData({ ...addPickupData, address: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Pickup Date</label>
                <input
                  type="date"
                  required
                  value={addPickupData.pickupDate}
                  onChange={(e) => setAddPickupData({ ...addPickupData, pickupDate: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Assigned Staff / Driver</label>
                <select
                  value={addPickupData.assignedStaff}
                  onChange={(e) => setAddPickupData({ ...addPickupData, assignedStaff: e.target.value })}
                  className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                >
                  <option value="">{addPickupData.customer ? 'Unassigned' : 'Select Customer First'}</option>
                  {assignableDriversForNewPickup.map((drv) => (
                    <option key={drv.id} value={drv.driverName}>
                      {isHomeServices ? `${drv.driverName} (${drv.status} - ${drv.branch || 'No Branch'})` : `${drv.driverName} (${drv.status})`}
                    </option>
                  ))}
                </select>
                {addPickupData.assignedStaff && (() => {
                  const drv = drivers.find(d => d.driverName === addPickupData.assignedStaff);
                  if (!drv) return null;
                  const colors = {
                    'Available': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
                    'Assigned': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
                    'On Delivery': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
                    'Off Duty': 'bg-rose-500/10 text-rose-600 border-rose-500/15'
                  };
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-secondary font-medium">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${colors[drv.status] || colors.Available}`}>
                        {drv.status}
                      </span>
                    </div>
                  );
                })()}
                <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Special Notes</label>
                <textarea
                  value={addPickupData.notes}
                  onChange={(e) => setAddPickupData({ ...addPickupData, notes: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium h-20"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowAddPickupModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm"
              >
                Schedule Pickup
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Schedule Delivery Modal */}
      {showAddDeliveryModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveNewDelivery}
            className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">Schedule Delivery</h2>
              <button type="button" onClick={() => setShowAddDeliveryModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Customer</label>
                <input
                  type="text"
                  readOnly
                  value={addDeliveryData.customer}
                  className="w-full rounded-2xl border border-border bg-surface-alt py-3 px-4 text-primary text-sm font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Address</label>
                <input
                  type="text"
                  required
                  value={addDeliveryData.address}
                  onChange={(e) => setAddDeliveryData({ ...addDeliveryData, address: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Delivery Date</label>
                <input
                  type="date"
                  required
                  value={addDeliveryData.deliveryDate}
                  onChange={(e) => setAddDeliveryData({ ...addDeliveryData, deliveryDate: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Assigned Staff / Driver</label>
                <select
                  value={addDeliveryData.assignedStaff}
                  onChange={(e) => setAddDeliveryData({ ...addDeliveryData, assignedStaff: e.target.value })}
                  className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                >
                  <option value="">{addDeliveryData.customer ? 'Unassigned' : 'Select Customer First'}</option>
                  {assignableDriversForNewDelivery.map((drv) => (
                    <option key={drv.id} value={drv.driverName}>
                      {isHomeServices ? `${drv.driverName} (${drv.status} - ${drv.branch || 'No Branch'})` : `${drv.driverName} (${drv.status})`}
                    </option>
                  ))}
                </select>
                {addDeliveryData.assignedStaff && (() => {
                  const drv = drivers.find(d => d.driverName === addDeliveryData.assignedStaff);
                  if (!drv) return null;
                  const colors = {
                    'Available': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
                    'Assigned': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
                    'On Delivery': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
                    'Off Duty': 'bg-rose-500/10 text-rose-600 border-rose-500/15'
                  };
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-secondary font-medium">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${colors[drv.status] || colors.Available}`}>
                        {drv.status}
                      </span>
                    </div>
                  );
                })()}
                <FiChevronDown className="pointer-events-none absolute right-4 top-[3.2rem] -translate-y-1/2 text-secondary" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">Order Count</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={addDeliveryData.orderCount}
                  onChange={(e) => setAddDeliveryData({ ...addDeliveryData, orderCount: parseInt(e.target.value) || 1 })}
                  className="mt-2 w-full rounded-2xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowAddDeliveryModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm"
              >
                Schedule Delivery
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
      {showBulkAssignModal && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-primary">
                {language === 'ar' ? 'تعيين جماعي للسائق' : 'Bulk Assign Driver'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowBulkAssignModal(false); setBulkDriver(''); }}
                className="text-secondary hover:text-primary"
              >
                ✕
              </button>
            </div>

            {(() => {
              const selectedDeliveries = filteredDeliveries.filter(d => selectedDeliveryIds.includes(d.id));
              const selectedBranchNames = selectedDeliveries.map(d => {
                const targetBranch = branches?.find(b => (b.id || b._id)?.toString() === d.branchId?.toString());
                return targetBranch ? targetBranch.name : '';
              }).filter(Boolean);
              const uniqueBranchNames = [...new Set(selectedBranchNames)];

              if (uniqueBranchNames.length > 1) {
                return (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
                      {language === 'ar'
                        ? 'الطلبات المحددة تنتمي إلى فروع مختلفة. يرجى تحديد الطلبات من فرع واحد فقط لتعيين سائق.'
                        : 'Selected deliveries belong to different branches. Please select deliveries from a single branch to assign a driver.'}
                    </div>
                    <div className="mt-8 flex gap-4">
                      <button
                        type="button"
                        onClick={() => { setShowBulkAssignModal(false); setBulkDriver(''); }}
                        className="w-full rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
                      >
                        {language === 'ar' ? 'إغلاق' : 'Close'}
                      </button>
                    </div>
                  </div>
                );
              }

              const targetBranchName = uniqueBranchNames[0];
              const bulkAssignableDrivers = targetBranchName
                ? drivers.filter(d => d.branch === targetBranchName)
                : drivers;

              return (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      {language === 'ar' ? 'اختر السائق' : 'Select Driver'}
                    </label>
                    <div className="relative mt-2">
                      <select
                        value={bulkDriver}
                        onChange={(e) => setBulkDriver(e.target.value)}
                        className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 pl-4 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm font-medium"
                      >
                        <option value="">{language === 'ar' ? 'اختر سائق...' : 'Select a driver...'}</option>
                        <option value="Unassigned">{language === 'ar' ? 'غير معين' : 'Unassigned'}</option>
                        {bulkAssignableDrivers.map((d) => (
                          <option key={d.id || d._id} value={d.driverName}>
                            {d.driverName} ({d.status} - {d.branch})
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
                    </div>
                  </div>

                  <div className="mt-8 flex gap-4">
                    <button
                      type="button"
                      onClick={() => { setShowBulkAssignModal(false); setBulkDriver(''); }}
                      className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface text-sm"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={!bulkDriver}
                      onClick={() => handleBulkAssignDeliveries(bulkDriver)}
                      className="flex-1 rounded-3xl text-white bg-blue-600 hover:bg-blue-700 py-3 font-semibold transition shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default PickupDelivery;
