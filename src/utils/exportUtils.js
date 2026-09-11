import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBilingualGarmentNames, translateGarmentName } from './garmentTranslations';

export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  let currency = 'KWD';
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.currency) {
        currency = parsed.system.currency;
      }
    }
  } catch (e) {
    // fallback
  }

  const lang = localStorage.getItem('language') || 'en';

  if (currency === 'KWD') {
    if (lang === 'ar') {
      return `${num.toFixed(3)} د.ك`;
    }
    return `KWD ${num.toFixed(3)}`;
  }

  if (lang === 'ar') {
    return `${num.toFixed(2)} ${currency}`;
  }
  return `${currency} ${num.toFixed(2)}`;
};

export const formatDate = (value) => {
  if (!value) return 'N/A';
  let timezone = undefined;
  let dateFormat = 'DD/MM/YYYY';
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.timezone) {
        timezone = parsed.system.timezone;
      }
      if (parsed.system?.dateFormat) {
        dateFormat = parsed.system.dateFormat;
      }
    }
  } catch {}

  const d = new Date(value);
  try {
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    
    const partMap = {};
    parts.forEach(p => {
      if (p.type !== 'literal') {
        partMap[p.type] = p.value;
      }
    });

    const day = partMap.day;
    const month = partMap.month;
    const year = partMap.year;

    if (dateFormat === 'YYYY-MM-DD') {
      return `${year}-${month}-${day}`;
    } else {
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
};

export const formatDateTime = (value) => {
  if (!value) return 'N/A';
  let timezone = undefined;
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.timezone) {
        timezone = parsed.system.timezone;
      }
    }
  } catch {}

  return new Date(value).toLocaleString('en-US', {
    timeZone: timezone,
  });
};

export const formatInvoiceDateTime = (order) => {
  let timezone = undefined;
  let dateFormat = 'DD/MM/YYYY';
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.timezone) {
        timezone = parsed.system.timezone;
      }
      if (parsed.system?.dateFormat) {
        dateFormat = parsed.system.dateFormat;
      }
    }
  } catch {}

  let dateObj = null;
  if (order?.createdAt) {
    const d = new Date(order.createdAt);
    if (!isNaN(d.getTime())) dateObj = d;
  }
  
  if (!dateObj && order?.date) {
    const d = new Date(order.date);
    if (!isNaN(d.getTime())) {
      dateObj = d;
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }
    }
  }

  if (!dateObj) {
    dateObj = new Date();
  }

  try {
    const dateOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('en-US', dateOptions);
    const parts = formatter.formatToParts(dateObj);
    const partMap = {};
    parts.forEach(p => {
      if (p.type !== 'literal') partMap[p.type] = p.value;
    });

    const day = partMap.day;
    const month = partMap.month;
    const year = partMap.year;

    const dateFormatted = dateFormat === 'YYYY-MM-DD'
      ? `${year}-${month}-${day}`
      : `${day}/${month}/${year}`;

    const timeOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    const timeFormatted = dateObj.toLocaleTimeString('en-US', timeOptions);

    return `${dateFormatted} ${timeFormatted}`;
  } catch (e) {
    return dateObj.toLocaleString('en-US', { timeZone: timezone });
  }
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};



const getCellValue = (row, col) => {
  const raw = row[col.key];
  if (col.format) return col.format(raw, row);
  return raw ?? '';
};

/** @returns {boolean} success */const extractTextFromReact = (val) => {
  if (val && typeof val === 'object') {
    if (val.props && val.props.children !== undefined) {
      return extractTextFromReact(val.props.children);
    }
    if (Array.isArray(val)) {
      return val.map(extractTextFromReact).join(' ');
    }
    if (val.en !== undefined || val.ar !== undefined) {
      const lang = localStorage.getItem('language') || 'en';
      return lang === 'ar' ? (val.ar || val.en) : (val.en || val.ar);
    }
  }
  return val == null ? '' : String(val);
};

export const exportToCSV = (data, filename, columns) => {
  if (!data?.length) return false;

  const cols =
    columns ||
    Object.keys(data[0]).map((key) => ({ key, label: key }));

  const branchName = getActiveBranchName();
  const formattedDate = formatDateTime(new Date());

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sheet1</x:Name>
              <x:WorksheetOptions>
                <x:FitToPage/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; }
        .heading { font-size: 16px; font-weight: bold; color: #1e3a8a; }
        .meta { font-size: 11px; color: #4b5563; }
        table { border-collapse: collapse; margin-top: 15px; }
        th { font-weight: bold; background-color: #2563eb; color: #ffffff; padding: 8px 12px; border: 1px solid #d1d5db; text-align: left; }
        td { padding: 8px 12px; border: 1px solid #e5e7eb; text-align: left; }
      </style>
    </head>
    <body>
      <div class="heading">Branch: ${branchName}</div>
      <div class="meta">Generated: ${formattedDate}</div>
      <div class="meta">Records: ${data.length}</div>
      <br/>
      <table border="1" cellpadding="8">
        <thead>
          <tr>
            ${cols.map(c => `<th>${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${cols.map(c => {
                const val = getCellValue(row, c);
                return `<td>${extractTextFromReact(val)}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  
  const cleanBranch = branchName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const baseName = filename.endsWith('.csv') ? filename.slice(0, -4) : filename.endsWith('.xls') ? filename.slice(0, -4) : filename;
  const safeName = `${baseName}_${cleanBranch}.xls`;

  downloadBlob(blob, safeName);
  return true;
};

export const exportToJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
  return true;
};

/**
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.subtitle]
 * @param {Array<{key:string, label:string, format?:Function}>} options.columns
 * @param {Array} options.data
 * @param {string} options.filename
 * @param {string[]} [options.summaryLines]
 */
export const exportToPDF = ({ title, subtitle, columns, data, filename, summaryLines = [] }) => {
  if (!data?.length) return false;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  const branchName = getActiveBranchName();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${title} (${branchName})`, 14, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);

  if (subtitle) {
    doc.text(subtitle, 14, y);
    y += 6;
  }

  doc.text(`Branch: ${branchName}`, 14, y);
  y += 6;
  doc.text(`Generated: ${formatDateTime(new Date())}`, 14, y);
  y += 6;
  doc.text(`Records: ${data.length}`, 14, y);
  y += 8;

  doc.setTextColor(40);

  if (summaryLines.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Summary', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    summaryLines.forEach((line) => {
      let cleanLine = typeof line === 'string'
        ? line.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim()
        : line;
      doc.text(cleanLine, 14, y);
      y += 5;
    });
    y += 4;
  }

  const head = [columns.map((c) => {
    let label = c.label || '';
    if (typeof label === 'string') {
      label = label.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').replace(/\s*\/\s*$/, '').trim();
    }
    return label;
  })];
  const body = data.map((row) =>
    columns.map((c) => {
      let val = getCellValue(row, c);
      val = extractTextFromReact(val);
      if (typeof val === 'string') {
        val = val.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').replace(/\s*\/\s*$/, '').trim();
      }
      return val;
    })
  );

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'Tuhama laundry co. — Confidential',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  const cleanBranch = branchName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const baseName = filename.endsWith('.pdf') ? filename.slice(0, -4) : filename;
  const safeName = `${baseName}_${cleanBranch}.pdf`;

  doc.save(safeName);
  return true;
};

const translateService = (service) => {
  const s = String(service || 'Iron & Wash').trim();
  const lower = s.toLowerCase();
  if (lower === 'express iron & wash') return { en: 'Express Iron & Wash', ar: 'غسيل وكوي مستعجل' };
  if (lower === 'iron & wash' || lower === 'normal' || lower === 'normal service') return { en: 'Iron & Wash', ar: 'غسيل وكوي عادي' };
  if (lower === 'express iron') return { en: 'Express Iron', ar: 'كوي مستعجل' };
  if (lower === 'iron only' || lower === 'iron only service') return { en: 'Iron Only', ar: 'كوي عادي' };
  if (lower === 'dry cleaning' || lower === 'dry cleaning only' || lower === 'dry clean service') return { en: 'Dry Cleaning Only', ar: 'غسيل جاف فقط' };
  if (lower === 'urgent' || lower === 'express') return { en: 'Express', ar: 'مستعجل / ممتاز' };
  if (lower === 'express wash' || lower === 'express wash service') return { en: 'Express Wash', ar: 'غسيل مستعجل' };
  return { en: s, ar: s };
};

export const translateBranch = (branchIdOrName) => {
  if (!branchIdOrName || String(branchIdOrName).trim().toLowerCase() === 'all') {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.branchName) return { en: u.branchName, ar: u.branchNameAr || '' };
      if (u.branch && u.branch !== 'All') return translateBranch(u.branch);
    } catch(e) {}
    return { en: 'Main Branch', ar: 'الفرع الرئيسي' };
  }

  const rawId = String(branchIdOrName).trim();
  const lowerQuery = rawId.toLowerCase();

  // 1. Gather all cached branches from window and localStorage
  let allBranches = [];
  try {
    if (typeof window !== 'undefined' && Array.isArray(window.__cachedBranches) && window.__cachedBranches.length > 0) {
      allBranches = allBranches.concat(window.__cachedBranches);
    }
  } catch (e) {}

  try {
    const cached = localStorage.getItem('branches_list');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) allBranches = allBranches.concat(list);
    }
  } catch (e) {}

  try {
    const cached2 = localStorage.getItem('branches');
    if (cached2) {
      const list2 = JSON.parse(cached2);
      if (Array.isArray(list2)) allBranches = allBranches.concat(list2);
    }
  } catch (e) {}

  if (allBranches.length > 0) {
    const found = allBranches.find(b => {
      if (!b) return false;
      const bId = String(b.id || b._id || '').toLowerCase();
      const bBranchId = String(b.branchId || '').toLowerCase();
      const bCode = String(b.code || '').toLowerCase();
      const bName = String(b.name || '').toLowerCase();
      const bNameAr = String(b.nameAr || b.arabicName || '').toLowerCase();

      return bId === lowerQuery ||
             bBranchId === lowerQuery ||
             bCode === lowerQuery ||
             bName === lowerQuery ||
             bNameAr === lowerQuery;
    });

    if (found && found.name) {
      let enName = String(found.name).trim();
      let arName = String(found.nameAr || found.arabicName || '').trim();

      if (!arName || !/[\u0600-\u06FF]/.test(arName)) {
        const enLower = enName.toLowerCase();
        if (enLower.includes('mishrif')) arName = 'مشرف';
        else if (enLower.includes('ragheey') || enLower.includes('rigai')) arName = 'الرقعي';
        else if (enLower.includes('andalus')) arName = 'الأندلس';
        else if (enLower.includes('ardiya')) arName = 'العارضية';
        else if (enLower.includes('khaitan')) arName = 'خيطان';
        else if (enLower.includes('qurain')) arName = 'القرين';
        else if (enLower.includes('jahra')) arName = 'الجهراء';
        else if (enLower.includes('salmiya')) arName = 'السالمية';
        else if (enLower.includes('hawally')) arName = 'حولي';
        else if (enLower.includes('farwaniya')) arName = 'الفروانية';
        else if (enLower.includes('mahboula')) arName = 'المهبولة';
        else if (enLower.includes('fahaheel')) arName = 'الفحيحيل';
        else if (enLower.includes('mangaf')) arName = 'المنقف';
        else if (enLower.includes('bayan')) arName = 'بيان';
        else if (enLower.includes('jabriya')) arName = 'الجابرية';
        else if (enLower.includes('home') || enLower.includes('service')) arName = 'خدمة المنازل';
        else if (enLower.includes('main') || enLower.includes('head')) arName = 'الفرع الرئيسي';
      }

      return { en: enName, ar: arName || '' };
    }
  }

  // 2. Standard known branch mappings by keywords
  if (lowerQuery.includes('home') || lowerQuery.includes('service')) return { en: 'Home Services', ar: 'خدمة المنازل' };
  if (lowerQuery.includes('main') || lowerQuery.includes('head')) return { en: 'Main Branch', ar: 'الفرع الرئيسي' };
  if (lowerQuery === '6a3cf82764fc882a198272c5' || lowerQuery.includes('ragheey') || lowerQuery === '1') return { en: 'Ragheey', ar: 'الرقعي' };
  if (lowerQuery === '6a3cf82764fc882a198272c6' || lowerQuery.includes('mishrif') || lowerQuery === '2') return { en: 'Mishrif', ar: 'مشرف' };
  if (lowerQuery === '6a3cf82764fc882a198272c7' || lowerQuery.includes('andalus') || lowerQuery === '3') return { en: 'Andalus', ar: 'الأندلس' };
  if (lowerQuery.includes('ardiya') || lowerQuery === '4') return { en: 'Ardiya', ar: 'العارضية' };
  if (lowerQuery.includes('khaitan') || lowerQuery === '5') return { en: 'Khaitan', ar: 'خيطان' };
  if (lowerQuery.includes('qurain') || lowerQuery === '6') return { en: 'Qurain', ar: 'القرين' };
  if (lowerQuery.includes('jahra') || lowerQuery === '7') return { en: 'Jahra', ar: 'الجهراء' };
  if (lowerQuery === '6a3d01028b85970b21c6dc45' || lowerQuery.includes('rigai') || lowerQuery === '8') return { en: 'Rigai', ar: 'الرقعي' };
  if (lowerQuery.includes('salmiya')) return { en: 'Salmiya', ar: 'السالمية' };
  if (lowerQuery.includes('hawally')) return { en: 'Hawally', ar: 'حولي' };
  if (lowerQuery.includes('farwaniya')) return { en: 'Farwaniya', ar: 'الفروانية' };
  if (lowerQuery.includes('mahboula')) return { en: 'Mahboula', ar: 'المهبولة' };
  if (lowerQuery.includes('fahaheel')) return { en: 'Fahaheel', ar: 'الفحيحيل' };
  if (lowerQuery.includes('mangaf')) return { en: 'Mangaf', ar: 'المنقف' };
  if (lowerQuery.includes('bayan')) return { en: 'Bayan', ar: 'بيان' };
  if (lowerQuery.includes('jabriya')) return { en: 'Jabriya', ar: 'الجابرية' };

  // 3. If rawId is a 24-character hexadecimal MongoDB ObjectId that was not found, check logged-in user or default to Mishrif/Main
  if (/^[0-9a-fA-F]{24}$/.test(rawId)) {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.branchName) return { en: u.branchName, ar: u.branchNameAr || '' };
    } catch(e) {}
    return { en: 'Mishrif', ar: 'مشرف' };
  }

  // 4. Clean text fallback
  const capitalized = rawId.charAt(0).toUpperCase() + rawId.slice(1);
  return { en: capitalized, ar: '' };
};

const translatePaymentStatus = (status) => {
  const s = String(status || 'Pending').trim().toLowerCase();
  if (s === 'paid') return { en: 'Paid', ar: 'مدفوع' };
  if (s === 'pending') return { en: 'Pending', ar: 'معلق' };
  if (s === 'partial') return { en: 'Partial', ar: 'جزئي' };
  return { en: status, ar: status };
};

export const getCustomerOrders = (customer, allOrders = []) => {
  if (!customer || !Array.isArray(allOrders)) return [];
  const cId = String(customer.id || '');
  const cMongoId = String(customer._id || '');
  const cDisplayId = String(customer.displayId || '');
  const cCustNo = String(customer.customerNo || '');
  const cName = String(customer.englishName || customer.name || '').trim().toLowerCase();
  const cPhone = String(customer.phone || (customer.phones && customer.phones[0]) || '').trim();
  const altPhones = Array.isArray(customer.phones) ? customer.phones.map(p => String(p).trim()).filter(Boolean) : [];

  return allOrders.filter(o => {
    if (!o) return false;
    const oCustId = String(o.customerId || '');
    const oCustMongo = o.customer ? (typeof o.customer === 'object' ? String(o.customer._id || o.customer.id || '') : String(o.customer)) : '';
    const oCustName = String(o.customerName || (typeof o.customer === 'object' ? o.customer.name : '') || '').trim().toLowerCase();
    const oPhone = String(o.phone || o.customerPhone || '').trim();

    // 1. Exact ID matches
    if (cId && (oCustId === cId || oCustMongo === cId)) return true;
    if (cMongoId && (oCustId === cMongoId || oCustMongo === cMongoId)) return true;
    if (cDisplayId && (oCustId === cDisplayId || oCustMongo === cDisplayId)) return true;
    if (cCustNo && (oCustId === cCustNo || oCustMongo === cCustNo)) return true;

    // 2. Phone match
    if (cPhone && cPhone !== 'N/A' && oPhone && (oPhone === cPhone || altPhones.includes(oPhone))) return true;

    // 3. Name match
    if (cName && cName !== 'valued customer' && cName !== 'n/a' && oCustName && oCustName === cName) return true;

    return false;
  }).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
};

const getDeliveryTypeLabel = (order) => {
  if (order?.isHomeDelivery || String(order?.deliveryType || '').toLowerCase() === 'home delivery') {
    return { en: 'Home Delivery', ar: 'توصيل منزلي' };
  }
  const type = String(order?.deliveryType || '').toLowerCase();
  if (type === 'branch pickup' || type === 'shop pickup') {
    return { en: 'Branch Pickup', ar: 'استلام من الفرع' };
  }
  return { en: 'Branch Pickup', ar: 'استلام من الفرع' };
};

export const translateDeliveryStatus = (status) => {
  const s = String(status || 'Waiting').trim().toLowerCase();
  if (s === 'waiting' || s === 'received') return { en: 'Waiting', ar: 'قيد الانتظار' };
  if (s === 'preparing in shop' || s === 'in shop' || s === 'washing') return { en: 'Preparing in shop', ar: 'قيد التحضير في المحل' };
  if (s === 'preparing in workshop' || s === 'in workshop' || s === 'drying' || s === 'ironing') return { en: 'Preparing in workshop', ar: 'قيد التحضير في الورشة' };
  if (s === 'hold' || s === 'on hold') return { en: 'Hold', ar: 'معلق' };
  if (s === 'ready') return { en: 'Ready', ar: 'جاهز' };
  if (s === 'ready for delivery' || s === 'h services') return { en: 'Ready for delivery', ar: 'جاهز للتوصيل' };
  if (s === 'ready for shop') return { en: 'Ready for shop', ar: 'جاهز للمحل' };
  if (s === 'with driver' || s === 'assigned' || s === 'out for delivery') return { en: 'With Driver', ar: 'مع السائق' };
  if (s === 'delivered') return { en: 'Delivered', ar: 'تم التسليم' };
  if (s === 'return' || s === 'cancel' || s === 'cancelled') return { en: 'Return', ar: 'مرتجع' };
  if (s === 'store' || s === 'in store') return { en: 'Store', ar: 'في المخزن' };
  if (s === 'failed') return { en: 'Failed', ar: 'فشل' };
  return { en: status, ar: status };
};

const translateGarment = (garmentName) => {
  let catalogList = window.__cachedCatalog;
  if (!catalogList) {
    try {
      const stored = localStorage.getItem('catalog_list');
      if (stored) {
        catalogList = JSON.parse(stored);
      }
    } catch (e) {}
  }
  return getBilingualGarmentNames(garmentName, catalogList);
};

export const getDisplayTotal = (order) =>
  order?.paymentStatus === 'Paid' ? 0 : Number(order?.totalAmount) || 0;

const normalizeReceiptId = (value) => String(value || '').trim().toUpperCase();

export const cacheReceiptSnapshot = (order) => {
  if (!order?.number) return;
  try {
    const snapshots = JSON.parse(localStorage.getItem('receipt_snapshots') || '{}');
    snapshots[order.number] = order;
    localStorage.setItem('receipt_snapshots', JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to cache receipt snapshot', e);
  }
};

export const getReceiptUrl = (invoiceNumber, order) => {
  const finalNum = order?.number || invoiceNumber || 'INV';
  let base = window.location.origin;
  try {
    const stored = localStorage.getItem('spinclean-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.system?.publicReceiptUrl) {
        base = String(parsed.system.publicReceiptUrl).replace(/\/$/, '');
      }
    }
  } catch (e) {
    // use current origin
  }
  if (order) {
    cacheReceiptSnapshot(order);
  }
  return `${base}/receipt/${encodeURIComponent(finalNum)}`;
};

export const decodeReceiptData = (search, hash) => {
  try {
    let encoded = null;
    if (search) {
      const params = new URLSearchParams(search);
      encoded = params.get('d');
    }
    if (!encoded && hash) {
      const match = hash.match(/[?&]d=([^&]+)/) || hash.match(/d=(.+)/);
      if (match) {
        encoded = match[1];
      }
    }
    if (!encoded && typeof window !== 'undefined' && window.location) {
      const allParams = new URLSearchParams(window.location.search);
      encoded = allParams.get('d');
    }
    if (!encoded) return null;
    const decodedB64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(decodedB64)));
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode receipt data from URL', e);
    return null;
  }
};

export const findReceiptOrder = (id, mockOrders = []) => {
  if (!id) return null;
  const target = normalizeReceiptId(id);

  try {
    const snapshots = JSON.parse(localStorage.getItem('receipt_snapshots') || '{}');
    if (snapshots[id]) return snapshots[id];
    const snapshotMatch = Object.values(snapshots).find(
      (o) => normalizeReceiptId(o.number) === target
    );
    if (snapshotMatch) return snapshotMatch;
  } catch (e) {
    console.error(e);
  }

  try {
    const saved = localStorage.getItem('orders_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      const direct = parsed.find(
        (o) => normalizeReceiptId(o.number) === target || String(o.id) === String(id)
      );
      if (direct) return direct;
    }
  } catch (e) {
    console.error(e);
  }

  let found = mockOrders.find(
    (o) => normalizeReceiptId(o.number) === target || String(o.id) === String(id)
  );
  if (!found && id.includes('-')) {
    const numPart = id.split('-').pop();
    found = mockOrders.find((o) => o.number?.endsWith(numPart));
  }
  return found || null;
};

export const getExpectedDeliveryInfo = (order) => {
  const serviceName = String(order?.serviceType || '').trim();
  const lowerService = serviceName.toLowerCase();
  const isExpress = lowerService.includes('express') || lowerService.includes('urgent') || lowerService.includes('مستعجل') || lowerService.includes('سريع') ||
    (Array.isArray(order?.itemDetails) && order.itemDetails.some(it => String(it.service || '').toLowerCase().includes('express')));

  // Try to find matching service in window.__cachedServices or localStorage
  let matchedService = null;
  try {
    const cached = window.__cachedServices || JSON.parse(localStorage.getItem('services_list') || '[]');
    if (Array.isArray(cached) && cached.length > 0) {
      // 1. Exact match by order.serviceType
      matchedService = cached.find(s => String(s.name || '').toLowerCase().trim() === lowerService);

      // 2. Exact match by itemDetails services
      if (!matchedService && Array.isArray(order?.itemDetails) && order.itemDetails.length > 0) {
        for (const it of order.itemDetails) {
          const itServ = String(it.service || '').toLowerCase().trim();
          if (itServ) {
            matchedService = cached.find(s => String(s.name || '').toLowerCase().trim() === itServ);
            if (matchedService) break;
          }
        }
      }

      // 3. Match respecting express/normal mode
      if (!matchedService) {
        const findByFuzzy = (targetStr) => {
          if (!targetStr) return null;
          const targetIsExpress = targetStr.includes('express') || targetStr.includes('urgent');
          return cached.find(s => {
            const sName = String(s.name || '').toLowerCase().trim();
            const sIsExpress = sName.includes('express') || sName.includes('urgent');
            if (targetIsExpress !== sIsExpress) return false;

            return targetStr.includes(sName) ||
                   sName.includes(targetStr) ||
                   (targetStr.includes('wash') && targetStr.includes('iron') && sName.includes('wash') && sName.includes('iron')) ||
                   (targetStr.includes('iron') && !targetStr.includes('wash') && sName.includes('iron') && !sName.includes('wash')) ||
                   (targetStr.includes('fold') && sName.includes('fold')) ||
                   (targetStr.includes('dry') && sName.includes('dry'));
          });
        };

        matchedService = findByFuzzy(lowerService);

        if (!matchedService && Array.isArray(order?.itemDetails)) {
          for (const it of order.itemDetails) {
            matchedService = findByFuzzy(String(it.service || '').toLowerCase().trim());
            if (matchedService) break;
          }
        }
      }

      // 4. Category / Express fallback
      if (!matchedService) {
        matchedService = cached.find(s => {
          const sName = String(s.name || '').toLowerCase();
          const sCat = String(s.category || '').toLowerCase();
          const sIsExpress = sName.includes('express') || sName.includes('urgent') || sCat.includes('express');
          return isExpress ? sIsExpress : !sIsExpress;
        });
      }
    }
  } catch (e) {}

  const rawTime = String(order?.expectedDeliveryTime || order?.deliveryTime || '').trim();
  let estimatedTime = rawTime || matchedService?.estimatedTime || (isExpress ? '2 hours' : '24 hours');

  let estTimeEn = estimatedTime;
  let estTimeAr = estimatedTime;
  
  const clockMatch = estimatedTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  const ampmMatch = estimatedTime.match(/^([0-1]?[0-9]):([0-5][0-9])\s*(AM|PM|am|pm)$/i);
  const dayMatch = estimatedTime.toLowerCase().includes('day') || estimatedTime.includes('يوم') || estimatedTime.includes('أيام');
  const pureNumMatch = estimatedTime.match(/^\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?|ساعة|ساعات)?\s*$/i);
  const hourMatch = estimatedTime.toLowerCase().includes('hour') || estimatedTime.includes('ساعة') || estimatedTime.includes('ساعات');

  if (clockMatch) {
    let hours = parseInt(clockMatch[1], 10);
    const minutes = clockMatch[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const periodAr = hours >= 12 ? 'م' : 'ص';
    const hours12 = hours % 12 || 12;
    const formattedHours = String(hours12).padStart(2, '0');
    estTimeEn = `${formattedHours}:${minutes} ${period}`;
    estTimeAr = `${formattedHours}:${minutes} ${periodAr}`;
  } else if (ampmMatch) {
    const hours = ampmMatch[1].padStart(2, '0');
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    const periodAr = period === 'PM' ? 'م' : 'ص';
    estTimeEn = `${hours}:${minutes} ${period}`;
    estTimeAr = `${hours}:${minutes} ${periodAr}`;
  } else if (dayMatch) {
    const num = estimatedTime.replace(/[^0-9.]/g, '');
    const numVal = parseFloat(num);
    const isSingle = numVal === 1;
    estTimeEn = numVal ? (isSingle ? 'After 1 Day' : `After ${numVal} Days`) : (estimatedTime.toLowerCase().startsWith('after') ? estimatedTime : `After ${estimatedTime}`);
    estTimeAr = numVal ? (isSingle ? 'بعد 1 يوم' : `بعد ${numVal} أيام`) : (estimatedTime.startsWith('بعد') ? estimatedTime : `بعد ${estimatedTime}`);
  } else if (pureNumMatch || hourMatch) {
    const num = estimatedTime.replace(/[^0-9.]/g, '');
    const numVal = parseFloat(num);
    const isSingle = numVal === 1;
    estTimeEn = numVal ? (isSingle ? 'After 1 Hour' : `After ${numVal} Hours`) : (estimatedTime.toLowerCase().startsWith('after') ? estimatedTime : `After ${estimatedTime}`);
    estTimeAr = numVal ? (isSingle ? 'بعد 1 ساعة' : `بعد ${numVal} ساعات`) : (estimatedTime.startsWith('بعد') ? estimatedTime : `بعد ${estimatedTime}`);
  } else {
    estTimeEn = estimatedTime;
    estTimeAr = estimatedTime;
  }

  const isHome = order?.isHomeDelivery === true || String(order?.deliveryType || '').toLowerCase() === 'home delivery';

  let dateStr = isHome ? (order?.deliveryDate || order?.expectedDeliveryDate) : '';
  if (isHome && !dateStr) {
    const baseDate = order?.date ? new Date(order.date) : new Date();
    let hoursToAdd = 24;
    if (pureNumMatch || hourMatch || estimatedTime.toLowerCase().includes('hour')) {
      const parsedHours = parseFloat(estimatedTime.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedHours) && parsedHours > 0) hoursToAdd = parsedHours;
    } else if (dayMatch || estimatedTime.toLowerCase().includes('day')) {
      const parsedDays = parseFloat(estimatedTime.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedDays) && parsedDays > 0) hoursToAdd = parsedDays * 24;
    } else {
      hoursToAdd = isExpress ? 2 : 24;
    }
    const computedDate = new Date(baseDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    dateStr = computedDate.toISOString().split('T')[0];
  }

  return {
    isHomeDelivery: isHome,
    date: isHome && dateStr ? formatDate(dateStr) : '',
    timeEn: estTimeEn,
    timeAr: estTimeAr,
    rawEstimatedTime: estimatedTime
  };
};

export const generateInvoicePDF = (order, { showPaidTotal = false } = {}) => {
  cacheReceiptSnapshot(order);

  // Look up customer displayId and phone number from window cache or localStorage or order directly
  let customerObj = null;
  const cachedList = window.__cachedCustomers || [];
  const storedList = (() => {
    try {
      return JSON.parse(localStorage.getItem('cached_customers') || '[]');
    } catch (e) {
      return [];
    }
  })();
  const customersList = [...cachedList, ...storedList];

  if (customersList.length > 0) {
    customerObj = customersList.find(
      (c) =>
        c.id === order?.customerId ||
        c._id === order?.customerId ||
        (order?.customerId && (String(c.id) === String(order.customerId) || String(c._id) === String(order.customerId))) ||
        (c.name && order?.customerName && c.name.toLowerCase() === order.customerName.toLowerCase())
    );
  }

  let rawCustNo = order?.customerNo || customerObj?.customerNo;
  let rawDisplayId = customerObj?.displayId || order?.displayId;
  let rawCustId = customerObj?.id || order?.customerId;

  let customerIdStr = 'N/A';
  if (rawCustNo && rawCustNo !== 'Auto-generated' && !/^[0-9a-fA-F]{24}$/.test(String(rawCustNo))) {
    customerIdStr = rawCustNo;
  } else if (rawDisplayId) {
    customerIdStr = `CUST-${String(rawDisplayId).padStart(4, '0')}`;
  } else if (rawCustId && rawCustId !== 'Auto-generated' && !/^[0-9a-fA-F]{24}$/.test(String(rawCustId))) {
    customerIdStr = rawCustId;
  } else if (order?.customerId && /^[0-9a-fA-F]{24}$/.test(String(order.customerId))) {
    customerIdStr = `CUST-${String(order.customerId).slice(-4).toUpperCase()}`;
  } else if (customerObj?._id) {
    customerIdStr = `CUST-${String(customerObj._id).slice(-4).toUpperCase()}`;
  }

  const customerPhoneStr =
    order?.customerPhone ||
    order?.contactNumber ||
    customerObj?.phone ||
    (customerObj?.phones && customerObj.phones[0]) ||
    'N/A';

  // Calculate total quantity
  const totalQuantity = (order?.itemDetails || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  const translatedPayment = translatePaymentStatus(order?.paymentStatus);
  const translatedDeliveryType = getDeliveryTypeLabel(order);
  const translatedBranch = translateBranch(order?.branchId || order?.branch);
  const translatedService = translateService(order?.serviceType);
  const expectedDeliveryInfo = getExpectedDeliveryInfo(order);
  const displayTotal = showPaidTotal
    ? Number(order?.totalAmount) || 0
    : getDisplayTotal(order);
  
  const paidVal = order?.paymentStatus === 'Paid'
    ? displayTotal
    : order?.paymentStatus === 'Pending'
      ? 0
      : Number(order?.amountPaid || 0);

  const balanceVal = Math.max(0, displayTotal - paidVal);
  
  // Construct QR URL
  const receiptUrl = getReceiptUrl(order?.number || '', order);

  // Parse items
  const itemsHtml = (order?.itemDetails || []).map((it) => {
    const translatedItem = translateGarment(it.name);
    
    const itemEn = it.name || translatedItem.en || '';
    let itemAr = it.nameAr || '';
    
    // Overwrite with translation if stored Arabic name is missing or contains non-Arabic text (bad/historic data)
    if (!itemAr || !/[\u0600-\u06FF]/.test(itemAr)) {
      itemAr = translatedItem.ar || '';
    }
    
    // Ultimate fallback if still no Arabic characters
    if (!itemAr || !/[\u0600-\u06FF]/.test(itemAr)) {
      itemAr = translateGarmentName(itemEn) || '';
    }
    
    // De-duplicate if the Arabic translation matches the English name, or if no Arabic text exists
    if (itemEn.toLowerCase() === itemAr.toLowerCase() || !/[\u0600-\u06FF]/.test(itemAr)) {
      itemAr = '';
    }

    const noteHtml = it.notes ? `<div class="item-notes" style="color: #000 !important; font-weight: bold; font-size: 9px; margin-top: 1px;">Note: ${it.notes}</div>` : '';
    
    return `
      <tr>
        <td style="padding: 3px 2px; border-bottom: 1px dashed #000; text-align: left; vertical-align: middle;">
          ${itemEn ? `<div class="item-name-en" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 700; font-size: 10px; color: #000; display: block; text-align: left; direction: ltr; line-height: 1.2;">${itemEn}</div>` : ''}
          ${itemAr ? `<div class="item-name-ar" lang="ar" dir="rtl" style="font-family: 'Noto Sans Arabic', 'Cairo', 'Tajawal', Tahoma, sans-serif; font-weight: 700; font-size: 10px; color: #000; display: block; text-align: right; direction: rtl; margin-top: 1px; line-height: 1.2;">${itemAr}</div>` : ''}
          ${noteHtml}
        </td>
        <td style="padding: 3px 2px; border-bottom: 1px dashed #000; text-align: center; vertical-align: middle;" class="item-qty">
          ${it.quantity}
        </td>
        <td style="padding: 3px 2px; border-bottom: 1px dashed #000; text-align: right; vertical-align: middle;" class="item-price">
          ${formatCurrency(it.unitPrice)}
        </td>
        <td style="padding: 3px 2px; border-bottom: 1px dashed #000; text-align: right; vertical-align: middle;" class="item-total">
          ${formatCurrency(it.quantity * it.unitPrice)}
        </td>
      </tr>
    `;
  }).join('');

  // Discount lines
  let discountLine = '';
  if (order?.discount > 0) {
    discountLine = `
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #000 !important; font-weight: 700; margin-bottom: 2px;">
        <span style="font-size: 10px; font-weight: 700;">Discount / الخصم:</span>
        <span style="font-family: monospace; font-size: 10px; font-weight: 700;">-${formatCurrency(order.discount)}</span>
      </div>
    `;
  }

  // Free Balance deduction lines
  let freeBalanceLine = '';
  const freeBalUsed = Number(order?.freeBalanceUsed || 0);
  if (freeBalUsed > 0) {
    freeBalanceLine = `
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #2563eb !important; font-weight: 800; margin-bottom: 2px;">
        <span style="font-size: 10px; font-weight: 800;">Free Balance / الرصيد المجاني:</span>
        <span style="font-family: monospace; font-size: 10px; font-weight: 800;">-${formatCurrency(freeBalUsed)}</span>
      </div>
    `;
  }

  // Tax lines
  let taxLine = '';
  if (order?.tax > 0) {
    taxLine = `
      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; color: #000 !important; font-weight: 700;">
        <span style="font-size: 10px; font-weight: 700;">Tax (${order.taxRate || 0}%) / الضريبة (${order.taxRate || 0}%):</span>
        <span style="font-family: monospace; font-size: 10px; font-weight: 700;">${formatCurrency(order.tax)}</span>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="ltr">
      <head>
        <meta charset="utf-8">
        <title>Invoice ${order?.number || 'N/A'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@600;700;800&display=swap');
          * {
            box-sizing: border-box;
          }
          @media print {
            @page {
              margin: 0;
              size: auto;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              height: auto !important;
            }
            .receipt-container {
              width: 100% !important;
              max-width: 76mm !important;
              margin: 0 auto !important;
              padding: 3mm 2mm !important;
              box-shadow: none !important;
              border: 1px solid #000 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, 'Noto Sans Arabic', sans-serif;
            margin: 0;
            padding: 6px;
            background-color: #f3f4f6;
            color: #000 !important;
            font-weight: 700 !important;
            -webkit-font-smoothing: antialiased;
          }
          .receipt-container {
            max-width: 320px;
            margin: 0 auto;
            background: #fff;
            padding: 8px;
            border: 1.5px solid #000 !important;
            border-radius: 4px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .brand-header {
            text-align: center;
            margin-bottom: 4px;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .receipt-title {
            text-align: center;
            font-size: 11px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
            margin-bottom: 2px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 2px;
            color: #000 !important;
          }
          .info-section {
            border-bottom: 1.5px dashed #000;
            padding-bottom: 4px;
            margin-bottom: 4px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            line-height: 1.25;
            margin-bottom: 2px;
            color: #000 !important;
            font-weight: 700 !important;
          }
          .info-label {
            color: #000 !important;
            font-weight: 800 !important;
          }
          .info-value {
            font-weight: 700 !important;
            text-align: right;
            font-size: 9.5px;
            color: #000 !important;
          }
          .table-header th {
            border-bottom: 2px solid #000 !important;
            font-size: 9.5px;
            font-weight: 800 !important;
            padding: 3px 2px;
            text-transform: uppercase;
            color: #000 !important;
          }
          .item-name-en {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-weight: 700 !important;
            font-size: 10px;
            color: #000 !important;
            display: block;
            text-align: left;
            direction: ltr;
          }
          .item-name-ar {
            font-family: 'Noto Sans Arabic', 'Cairo', 'Tajawal', Tahoma, sans-serif;
            font-size: 10px;
            color: #000 !important;
            display: block;
            direction: rtl;
            text-align: right;
            font-weight: 700 !important;
            margin-top: 1px;
          }
          .item-qty {
            font-size: 10px;
            font-weight: 700 !important;
            color: #000 !important;
          }
          .item-price {
            font-family: monospace;
            font-size: 10px;
            font-weight: 700 !important;
            color: #000 !important;
          }
          .item-total {
            font-family: monospace;
            font-size: 10px;
            font-weight: 700 !important;
            color: #000 !important;
          }
          .item-notes {
            font-size: 8px;
            color: #000 !important;
            font-style: italic;
            margin-top: 1px;
            font-weight: 700;
          }
          .summary-section {
            border-top: 1.5px dashed #000;
            padding-top: 3px;
            margin-top: 3px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: 800 !important;
            border-top: 2px solid #000 !important;
            border-bottom: 2px solid #000 !important;
            padding: 3px 0;
            margin-top: 3px;
            color: #000 !important;
          }
          .footer-section {
            text-align: center;
            font-size: 9.5px;
            color: #000 !important;
            margin-top: 4px;
            border-top: 1.5px dashed #000;
            padding-top: 3px;
            font-weight: 700 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="brand-header" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 4px;">
            <!-- Top row: English left | Logo center | Arabic right -->
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 2px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 11px; font-weight: 800; color: #000 !important; line-height: 1.2;">Tuhama Laundry Co.</div>
                <div style="font-size: 8px; color: #000 !important; line-height: 1.1; font-weight: 700;">Cleaning, Ironing &amp; Wash in K.</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 4px;">
                <img src="${window.location.origin}/logo.png" alt="Tuhama Logo" style="width: 50px; height: 50px; object-fit: contain; border-radius: 8px; display: block; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 12px; font-weight: 800; color: #000 !important; line-height: 1.2;">شركة مصابغ تهامة</div>
                <div style="font-size: 8px; color: #000 !important; line-height: 1.1; font-weight: 700;">تنظيف وكي وغسيل</div>
              </div>
            </div>
            <!-- Phone numbers row -->
            <div style="display: flex; justify-content: center; gap: 8px; margin-top: 2px; margin-bottom: 2px;">
              <span style="font-size: 9.5px; font-weight: 800; color: #000 !important;">Tel: 222 03 222</span>
            </div>
            <div class="receipt-title">Invoice - فاتورة</div>
          </div>
          
          <div class="info-section">
            <div style="text-align: center; border: 1.5px solid #000; border-radius: 4px; background-color: #f3f4f6; padding: 4px; margin-bottom: 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <span style="font-size: 12px; font-weight: 800; color: #000;">Invoice # ${order?.number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date / التاريخ:</span>
              <span class="info-value">${formatInvoiceDateTime(order)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Branch / الفرع:</span>
              <span class="info-value">${!translatedBranch.ar || translatedBranch.en.toLowerCase() === translatedBranch.ar.toLowerCase() ? translatedBranch.en : `${translatedBranch.en} / <span style="direction: rtl;">${translatedBranch.ar}</span>`}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer / العميل:</span>
              <span class="info-value">${order?.customerName || 'N/A'}</span>
            </div>
            ${(customerObj?.isSubscriber || Number(customerObj?.insuranceAmount || 0) >= 20 || order?.isSubscriber) ? `
            <div class="info-row" style="background-color: #fef08a; padding: 2px 4px; border-radius: 4px; font-weight: 800; border: 1px solid #eab308; margin-bottom: 3px; margin-top: 1px;">
              <span class="info-label" style="color: #854d0e !important; font-weight: 800;">Subscriber Status / الاشتراك:</span>
              <span class="info-value" style="color: #854d0e !important; font-weight: 800;">⭐</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Customer ID / رقم العميل:</span>
              <span class="info-value">${customerIdStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone / الهاتف:</span>
              <span class="info-value">${customerPhoneStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Staff / الموظف:</span>
              <span class="info-value">${order?.staffName || order?.createdBy || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Service Type / نوع الخدمة:</span>
              <span class="info-value">
                ${/express|urgent|مستعجل/i.test(translatedService.en || '')
                  ? `<span style="background-color: #dc2626; color: #ffffff !important; padding: 1px 5px; border-radius: 4px; font-weight: 800; display: inline-block; letter-spacing: 0.3px;">⚡ ${translatedService.en === translatedService.ar ? translatedService.en : `${translatedService.en} / ${translatedService.ar}`}</span>`
                  : (translatedService.en === translatedService.ar ? translatedService.en : `${translatedService.en} / <span style="direction: rtl;">${translatedService.ar}</span>`)}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Status / الدفع:</span>
              <span class="info-value">${translatedPayment.en} / <span style="direction: rtl;">${translatedPayment.ar}</span></span>
            </div>
            <div class="info-row">
              <span class="info-label">Delivery Type / نوع التوصيل:</span>
              <span class="info-value">${translatedDeliveryType.en} / <span style="direction: rtl;">${translatedDeliveryType.ar}</span></span>
            </div>
            <div class="info-row" style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="info-label" style="white-space: nowrap; font-weight: 800;">Exp. Delivery / التسليم المتوقع:</span>
              <span class="info-value" style="text-align: right;">
                ${expectedDeliveryInfo.date ? `${expectedDeliveryInfo.date}<br/>` : ''}
                <span style="font-size: 9.5px; font-weight: 700; color: #111;">
                  ${expectedDeliveryInfo.timeEn === expectedDeliveryInfo.timeAr ? expectedDeliveryInfo.timeEn : `${expectedDeliveryInfo.timeEn} / <span style="direction: rtl;">${expectedDeliveryInfo.timeAr}</span>`}
                </span>
              </span>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <thead>
              <tr class="table-header">
                <th style="width: 50%; text-align: left; padding: 3px 2px;">Item<br><span style="font-size: 9px; font-weight: 800;">الصنف</span></th>
                <th style="width: 12%; text-align: center; padding: 3px 2px;">Qty<br><span style="font-size: 9px; font-weight: 800;">الكمية</span></th>
                <th style="width: 18%; text-align: right; padding: 3px 2px;">Price<br><span style="font-size: 9px; font-weight: 800;">السعر</span></th>
                <th style="width: 20%; text-align: right; padding: 3px 2px;">Total<br><span style="font-size: 9px; font-weight: 800;">الإجمالي</span></th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary-section">
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 10px; font-weight: 700;">Total Qty / إجمالي الكمية:</span>
              <span style="font-family: monospace; font-size: 10px; font-weight: 700;">${totalQuantity}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 10px; font-weight: 700;">Subtotal / المجموع الفرعي:</span>
              <span style="font-family: monospace; font-size: 10px; font-weight: 700;">${formatCurrency(order?.amount || 0)}</span>
            </div>
            ${discountLine}
            ${freeBalanceLine}
            ${taxLine}
            <div class="total-row">
              <span style="font-size: 13px; font-weight: 800;">Total Amount / إجمالي السعر:</span>
              <span style="font-family: monospace; font-size: 14px; font-weight: 800;">${formatCurrency(displayTotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 3px; margin-bottom: 2px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 10px; font-weight: 700;">Paid Amount / المبلغ المدفوع:</span>
              <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #059669;">${formatCurrency(paidVal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 10px; font-weight: 700;">Remaining Balance / المتبقي:</span>
              <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #dc2626;">${formatCurrency(balanceVal)}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 6px; margin-bottom: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-inside: avoid !important; break-inside: avoid !important;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=M&qzone=2&data=${encodeURIComponent(receiptUrl)}" alt="Invoice QR" style="width: 85px; height: 85px; display: block; margin: 0 auto 3px auto;" />
            <div style="font-size: 9.5px; color: #000 !important; font-weight: 800; line-height: 1.2;">Scan to View Invoice</div>
            <div style="font-size: 9.5px; color: #000 !important; direction: rtl; font-weight: 800; line-height: 1.2;">امسح لفتح الفاتورة</div>
          </div>
          
          <div class="footer-section">
            <div style="font-weight: 800; margin-bottom: 1px; font-size: 9.5px; color: #000 !important;">Thank you for choosing Tuhama laundry co.!</div>
            <div style="direction: rtl; font-weight: 800; font-size: 9.5px; color: #000 !important;">شكراً لاختياركم تهامة برو!</div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Hidden iframe logic
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  iframe.onload = () => {
    const triggerPrint = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
    const qrImg = iframe.contentWindow.document.querySelector('img[alt="Invoice QR"]');
    if (qrImg && !qrImg.complete) {
      qrImg.onload = () => setTimeout(triggerPrint, 150);
      qrImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  // Clean up
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};

/**
 * Generate and print a bilingual thermal receipt for Customer Subscription / Insurance Deposit
 */
export const generateSubscriptionReceiptPDF = (customer, options = {}) => {
  if (!customer) return;

  const isSub = customer.isSubscriber === true || (customer.isSubscriber !== false && Number(customer.insuranceAmount || 0) >= 20);
  if (!isSub && !options.force) {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const amountVal = Number(options.amount !== undefined ? options.amount : (customer.insuranceAmount || 20));
  const formattedAmount = formatCurrency(amountVal);
  const freeBalanceVal = Number(customer.freeBalance || 0);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const currentDateTimeStr = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;

  const validCustNo = (customer.customerNo && customer.customerNo !== 'Auto-generated')
    ? customer.customerNo
    : (customer.displayId ? customer.displayId : (customer.id && customer.id !== 'Auto-generated' ? customer.id : (customer._id ? String(customer._id).slice(-4) : '001')));
  const receiptNo = options.receiptNo || `SUB-${validCustNo}`;

  const rawBranch = options.branchName || options.branch || customer.branchName || customer.branch || customer.branchId;
  const branchObj = translateBranch(rawBranch);
  const branchName = !branchObj.ar || branchObj.en.toLowerCase() === branchObj.ar.toLowerCase()
    ? branchObj.en
    : `${branchObj.en} / ${branchObj.ar}`;

  const paymentMethod = options.paymentMethod || 'Cash / نقدي';

  const customerName = customer.englishName || customer.name || 'Valued Customer';
  const arabicCustomerName = customer.arabicName || '';
  const customerPhone = customer.phones?.[0] || customer.phone || 'N/A';
  const customerId = (customer.customerNo && customer.customerNo !== 'Auto-generated')
    ? customer.customerNo
    : (customer.displayId ? customer.displayId : (customer.id && customer.id !== 'Auto-generated' ? customer.id : customer._id || 'N/A'));

  const addressParts = [
    customer.areaName ? `Area: ${customer.areaName}` : '',
    customer.street ? `Street: ${customer.street}` : '',
    customer.houseNo ? `House: ${customer.houseNo}` : '',
    customer.flatNo ? `Flat: ${customer.flatNo}` : '',
    customer.paciNo ? `PACI: ${customer.paciNo}` : '',
  ].filter(Boolean).join(', ');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Subscription Receipt - ${receiptNo}</title>
        <style>
          @page {
            size: auto;
            margin: 8mm auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            color: #000 !important;
            line-height: 1.35;
            padding: 6mm 0;
          }
          .receipt-container {
            width: 82mm;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .brand-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .receipt-title {
            text-align: center;
            font-size: 13px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 6px 0 4px 0;
            padding: 4px 0;
            background: #000;
            color: #fff !important;
            border-radius: 4px;
          }
          .info-section {
            border-bottom: 1.5px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 3px;
            font-size: 10.5px;
          }
          .info-label {
            font-weight: 600;
            color: #000 !important;
            flex: 1;
          }
          .info-value {
            font-weight: 800 !important;
            text-align: right;
            color: #000 !important;
            flex: 1;
          }
          .table-header {
            border-bottom: 2px solid #000;
            padding: 4px 0;
            font-weight: 800;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            text-transform: uppercase;
          }
          .table-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px dashed #ccc;
            font-size: 11px;
          }
          .total-box {
            border-top: 3px solid #000;
            border-bottom: 3px solid #000;
            padding: 6px 0;
            margin: 8px 0;
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 900 !important;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            background: #000;
            color: #fff !important;
            font-weight: 800;
            border-radius: 3px;
            font-size: 10px;
          }
          .star-badge {
            font-size: 12px;
            font-weight: bold;
          }
          .footer-section {
            text-align: center;
            font-size: 10px;
            border-top: 1.5px dashed #000;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Logo & Header -->
          <div class="brand-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 12px; font-weight: 800; line-height: 1.2;">Tuhama Laundry Co.</div>
                <div style="font-size: 8.5px; font-weight: 700;">Cleaning &amp; Ironing</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 4px;">
                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 60px; height: 60px; object-fit: contain; display: block;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 12px; font-weight: 800; line-height: 1.2;">شركة مصابغ تهامة</div>
                <div style="font-size: 8.5px; font-weight: 700;">تنظيف وكي وغسيل</div>
              </div>
            </div>
            <div style="font-size: 9.5px; font-weight: 700;">Tel: 222 03 222 | خدمة العملاء</div>
          </div>

          <!-- Receipt Title -->
          <div class="receipt-title">
            SUBSCRIPTION RECEIPT / إيصال اشتراك
          </div>

          <!-- Receipt & Customer Info -->
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Receipt No / رقم الإيصال:</span>
              <span class="info-value">${receiptNo}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date &amp; Time / التاريخ والوقت:</span>
              <span class="info-value">${currentDateTimeStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Branch / الفرع:</span>
              <span class="info-value">${branchName}</span>
            </div>
            <div style="border-top: 1px dashed #aaa; margin: 4px 0;"></div>
            <div class="info-row">
              <span class="info-label">Customer ID / رقم العميل:</span>
              <span class="info-value">${customerId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer / العميل:</span>
              <span class="info-value">${customerName}</span>
            </div>
            ${arabicCustomerName ? `
            <div class="info-row">
              <span class="info-label">الاسم بالعربي:</span>
              <span class="info-value" style="direction: rtl;">${arabicCustomerName}</span>
            </div>` : ''}
            <div class="info-row">
              <span class="info-label">Phone / الهاتف:</span>
              <span class="info-value">${customerPhone}</span>
            </div>
            ${addressParts ? `
            <div class="info-row">
              <span class="info-label">Address / العنوان:</span>
              <span class="info-value" style="font-size: 9.5px;">${addressParts}</span>
            </div>` : ''}
            <div class="info-row" style="margin-top: 4px;">
              <span class="info-label">Membership / العضوية:</span>
              <span class="info-value"><span class="star-badge">⭐</span> Subscriber / مشترك</span>
            </div>
          </div>

          <!-- Payment Breakdown -->
          <div class="table-header">
            <span>Description / البيان</span>
            <span style="text-align: right;">Amount / المبلغ</span>
          </div>

          <div class="table-row">
            <div>
              <div style="font-weight: 700;">Subscription Deposit</div>
              <div style="font-size: 9.5px; direction: rtl; text-align: left;">تأمين ورسوم الاشتراك</div>
            </div>
            <div style="font-weight: 800; font-family: monospace;">${formattedAmount}</div>
          </div>

          ${freeBalanceVal > 0 ? `
          <div class="table-row">
            <div>
              <div style="font-weight: 700;">Free Balance / الرصيد المجاني</div>
            </div>
            <div style="font-weight: 800; font-family: monospace;">${formatCurrency(freeBalanceVal)}</div>
          </div>` : ''}

          <!-- Total -->
          <div class="total-box">
            <span>TOTAL PAID / المبلغ المدفوع</span>
            <span style="font-family: monospace;">${formattedAmount}</span>
          </div>

          <!-- Status & Method Details -->
          <div class="info-section" style="border-bottom: none; margin-bottom: 2px;">
            <div class="info-row">
              <span class="info-label">Payment Status / حالة الدفع:</span>
              <span class="info-value"><span class="status-badge">PAID / مدفوع</span></span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method / طريقة الدفع:</span>
              <span class="info-value">${paymentMethod}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Subscription Status / حالة الاشتراك:</span>
              <span class="info-value">Active / نشط ⭐</span>
            </div>
          </div>

          <!-- Terms & Policy Notice -->
          <div style="border: 1.5px solid #000; border-radius: 5px; padding: 6px 8px; margin: 8px 0 6px 0; background: #fafafa; text-align: center;">
            <div style="font-size: 9.5px; font-weight: 800; color: #000; line-height: 1.35;">
              * Insurance ${formattedAmount} claimable at the time of account closure.
            </div>
            <div style="font-size: 9.5px; font-weight: 800; color: #000; direction: rtl; margin-top: 2px; line-height: 1.35;">
              * مبلغ التأمين ${formattedAmount} قابل للاسترداد عند إغلاق الحساب.
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-section">
            <div>Thank you for subscribing with Tuhama Laundry!</div>
            <div style="direction: rtl; margin-top: 2px;">شكراً لاشتراككم مع شركة مصابغ تهامة!</div>
            <div style="font-size: 8.5px; color: #777; margin-top: 4px;">Software by SpinClean Laundry Management</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print subscription receipt error', e);
    }
  };

  iframe.onload = () => {
    const logoImg = iframe.contentWindow.document.querySelector('img[alt="Logo"]');
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 150);
      logoImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  // Clean up iframe
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};

/**
 * Generate and print a bilingual Customer Account Statement (1-Month / 6-Month usage, Items issued, Dues, History)
 */
export const generateCustomerStatementPDF = (customer, customerOrders = [], stats = {}) => {
  if (!customer) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const currentDateTimeStr = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;

  const customerName = customer.englishName || customer.name || 'Valued Customer';
  const arabicCustomerName = customer.arabicName || '';
  const customerPhone = customer.phones?.[0] || customer.phone || 'N/A';
  const customerId = (customer.customerNo && customer.customerNo !== 'Auto-generated')
    ? customer.customerNo
    : (customer.displayId ? customer.displayId : (customer.id && customer.id !== 'Auto-generated' ? customer.id : customer._id || 'N/A'));

  const rawBranch = customer.branchName || customer.branch || customer.branchId;
  const branchObj = translateBranch(rawBranch);
  const branchName = !branchObj.ar || branchObj.en.toLowerCase() === branchObj.ar.toLowerCase()
    ? branchObj.en
    : `${branchObj.en} / ${branchObj.ar}`;

  const addressParts = [
    customer.areaName ? `Area: ${customer.areaName}` : '',
    customer.street ? `Street: ${customer.street}` : '',
    customer.houseNo ? `House: ${customer.houseNo}` : '',
    customer.flatNo ? `Flat: ${customer.flatNo}` : '',
    customer.paciNo ? `PACI: ${customer.paciNo}` : '',
  ].filter(Boolean).join(', ');

  const totalOrdersCount = customerOrders.length;
  const totalItemsCount = stats.totalItemsIssued || 0;
  const totalDueAmount = formatCurrency(stats.totalDue || 0);
  const monthSpendStr = formatCurrency(stats.monthSpend || 0);
  const sixMonthSpendStr = formatCurrency(stats.sixMonthSpend || 0);
  const lifetimeSpendStr = formatCurrency(stats.lifetimeSpend || 0);

  const orderRowsHtml = customerOrders.map(order => {
    const orderDate = formatDate(order.createdAt || order.date);
    const orderNum = order.number || order.orderNumber || order.id || 'N/A';
    const itemsCount = (order.itemDetails && Array.isArray(order.itemDetails))
      ? order.itemDetails.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0)
      : (order.itemCount || 1);
    const total = Number(order.totalAmount || 0);
    const paid = Number(order.amountPaid || 0);
    const due = Math.max(0, total - paid);
    const status = order.status || 'Active';
    const payStatus = order.paymentStatus || (due === 0 ? 'Paid' : 'Pending');

    return `
      <tr>
        <td style="padding: 5px 3px; font-size: 10px; border-bottom: 1px dashed #ddd; font-family: monospace;">${orderNum}</td>
        <td style="padding: 5px 3px; font-size: 10px; border-bottom: 1px dashed #ddd;">${orderDate}</td>
        <td style="padding: 5px 3px; font-size: 10px; border-bottom: 1px dashed #ddd; text-align: center;">${itemsCount}</td>
        <td style="padding: 5px 3px; font-size: 10px; border-bottom: 1px dashed #ddd; font-family: monospace; text-align: right;">${formatCurrency(total)}</td>
        <td style="padding: 5px 3px; font-size: 10px; border-bottom: 1px dashed #ddd; font-family: monospace; text-align: right; color: ${due > 0 ? '#b91c1c' : '#047857'}; font-weight: 700;">${due > 0 ? formatCurrency(due) : '0.000'}</td>
        <td style="padding: 5px 3px; font-size: 9.5px; border-bottom: 1px dashed #ddd; text-align: right;">${status} (${payStatus})</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Account Statement - ${customerName}</title>
        <style>
          @page {
            size: auto;
            margin: 8mm auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            color: #000 !important;
            line-height: 1.35;
            padding: 6mm 0;
          }
          .statement-container {
            width: 88mm;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .brand-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .statement-title {
            text-align: center;
            font-size: 12.5px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 6px 0 4px 0;
            padding: 4px 0;
            background: #000;
            color: #fff !important;
            border-radius: 4px;
          }
          .info-section {
            border-bottom: 1.5px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 3px;
            font-size: 10.5px;
          }
          .info-label {
            font-weight: 600;
            color: #000 !important;
            flex: 1;
          }
          .info-value {
            font-weight: 800 !important;
            text-align: right;
            color: #000 !important;
            flex: 1;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin: 8px 0;
            border: 1.5px solid #000;
            border-radius: 6px;
            padding: 6px;
            background: #fafafa;
          }
          .stat-box {
            padding: 4px;
            border-bottom: 1px dashed #ccc;
          }
          .stat-label {
            font-size: 9px;
            font-weight: 700;
            color: #444;
            text-transform: uppercase;
          }
          .stat-value {
            font-size: 12px;
            font-weight: 900;
            font-family: monospace;
            color: #000;
            margin-top: 1px;
          }
          .table-title {
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            margin: 8px 0 4px 0;
            border-bottom: 1.5px solid #000;
            padding-bottom: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            font-size: 9.5px;
            font-weight: 800;
            text-align: left;
            border-bottom: 1.5px solid #000;
            padding: 3px 2px;
          }
          .footer-section {
            text-align: center;
            font-size: 10px;
            border-top: 1.5px dashed #000;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="statement-container">
          <!-- Logo & Header -->
          <div class="brand-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 12px; font-weight: 800; line-height: 1.2;">Tuhama Laundry Co.</div>
                <div style="font-size: 8.5px; font-weight: 700;">Cleaning &amp; Ironing</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 4px;">
                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 55px; height: 55px; object-fit: contain; display: block;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 12px; font-weight: 800; line-height: 1.2;">شركة مصابغ تهامة</div>
                <div style="font-size: 8.5px; font-weight: 700;">تنظيف وكي وغسيل</div>
              </div>
            </div>
            <div style="font-size: 9.5px; font-weight: 700;">Tel: 222 03 222 | خدمة العملاء</div>
          </div>

          <!-- Statement Title -->
          <div class="statement-title">
            ACCOUNT STATEMENT / كشف حساب العميل
          </div>

          <!-- Customer Info -->
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Statement Date / التاريخ:</span>
              <span class="info-value">${currentDateTimeStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Branch / الفرع:</span>
              <span class="info-value">${branchName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer ID / رقم العميل:</span>
              <span class="info-value">${customerId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer / العميل:</span>
              <span class="info-value">${customerName}</span>
            </div>
            ${arabicCustomerName ? `
            <div class="info-row">
              <span class="info-label">الاسم بالعربي:</span>
              <span class="info-value" style="direction: rtl;">${arabicCustomerName}</span>
            </div>` : ''}
            <div class="info-row">
              <span class="info-label">Phone / الهاتف:</span>
              <span class="info-value">${customerPhone}</span>
            </div>
            ${addressParts ? `
            <div class="info-row">
              <span class="info-label">Address / العنوان:</span>
              <span class="info-value" style="font-size: 9.5px;">${addressParts}</span>
            </div>` : ''}
          </div>

          <!-- Key Financial & Usage Analytics -->
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Total Items / إجمالي القطع</div>
              <div class="stat-value">📦 ${totalItemsCount} pcs</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Due / المبلغ المتبقي</div>
              <div class="stat-value" style="color: ${stats.totalDue > 0 ? '#b91c1c' : '#047857'};">💰 ${totalDueAmount}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">1 Month (30d) / استهلاك شهر</div>
              <div class="stat-value">📅 ${monthSpendStr}</div>
              <div style="font-size: 8px; color: #666;">(${stats.monthItems || 0} items)</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">6 Months / استهلاك 6 أشهر</div>
              <div class="stat-value">📊 ${sixMonthSpendStr}</div>
              <div style="font-size: 8px; color: #666;">(${stats.sixMonthItems || 0} items)</div>
            </div>
          </div>

          <!-- Total Lifetime Spending -->
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 2px; margin-bottom: 8px; font-weight: 800; font-size: 11px;">
            <span>LIFETIME SPEND / إجمالي المبيعات</span>
            <span style="font-family: monospace;">${lifetimeSpendStr}</span>
          </div>

          <!-- Invoices & Activity Breakdown -->
          <div class="table-title">Order History / سجل الفواتير (${totalOrdersCount})</div>
          <table>
            <thead>
              <tr>
                <th>Inv #</th>
                <th>Date</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Total</th>
                <th style="text-align: right;">Due</th>
                <th style="text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${orderRowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 8px; color: #888;">No order history found.</td></tr>'}
            </tbody>
          </table>

          <!-- Footer -->
          <div class="footer-section">
            <div>Thank you for choosing Tuhama Laundry!</div>
            <div style="direction: rtl; margin-top: 2px;">شكراً لتعاملكم مع شركة مصابغ تهامة!</div>
            <div style="font-size: 8.5px; color: #777; margin-top: 4px;">Software by SpinClean Laundry Management</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print statement error', e);
    }
  };

  iframe.onload = () => {
    const logoImg = iframe.contentWindow.document.querySelector('img[alt="Logo"]');
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 150);
      logoImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  // Clean up iframe
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};

/**
 * Generate and download a full professional A4 PDF Customer Account Statement
 */
export const exportCustomerStatementA4PDF = (customer, customerOrders = [], stats = {}, options = {}) => {
  if (!customer) return false;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  const customerName = customer.englishName || customer.name || 'Valued Customer';
  const customerId = (customer.customerNo && customer.customerNo !== 'Auto-generated')
    ? customer.customerNo
    : (customer.displayId ? customer.displayId : (customer.id && customer.id !== 'Auto-generated' ? customer.id : customer._id || 'N/A'));
  const customerPhone = customer.phones?.[0] || customer.phone || 'N/A';
  const branchName = options.branchName || customer.branchName || customer.branch || getActiveBranchName();

  const addressParts = [
    customer.areaName ? `Area: ${customer.areaName}` : '',
    customer.street ? `Street: ${customer.street}` : '',
    customer.houseNo ? `House: ${customer.houseNo}` : '',
    customer.flatNo ? `Flat: ${customer.flatNo}` : '',
  ].filter(Boolean).join(', ');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text('Tuhama Laundry Co.', 14, y);
  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.text('Customer Account Statement', pageWidth - 14, y, { align: 'right' });
  y += 7;

  // Sub-header Line
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Customer & Statement Info Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text(`Customer Name: ${customerName}`, 14, y);
  doc.text(`Statement Date: ${formatDate(new Date())}`, pageWidth - 14, y, { align: 'right' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80);
  doc.text(`Customer ID: ${customerId}  |  Mobile: ${customerPhone}`, 14, y);
  doc.text(`Branch: ${branchName}`, pageWidth - 14, y, { align: 'right' });
  y += 5;

  if (addressParts) {
    doc.text(`Address: ${addressParts}`, 14, y);
    y += 5;
  }

  y += 3;

  // Summary Metrics Banner
  const totalOrders = customerOrders.length;
  const totalItems = stats.totalItemsIssued || 0;
  const lifetimeSpend = stats.lifetimeSpend || 0;
  const totalDue = stats.totalDue || 0;
  const monthSpend = stats.monthSpend || 0;
  const sixMonthSpend = stats.sixMonthSpend || 0;

  autoTable(doc, {
    startY: y,
    head: [['Total Orders', 'Total Items Processed', '1 Month Spend', '6 Months Spend', 'Lifetime Spend', 'Outstanding Due']],
    body: [[
      `${totalOrders}`,
      `${totalItems} pcs`,
      formatCurrency(monthSpend),
      formatCurrency(sixMonthSpend),
      formatCurrency(lifetimeSpend),
      formatCurrency(totalDue)
    ]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      5: { fontStyle: 'bold', textColor: totalDue > 0 ? [220, 38, 38] : [4, 120, 87] }
    },
    margin: { left: 14, right: 14 }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Orders History Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text(`Order History & Financial Transactions (${customerOrders.length})`, 14, y);
  y += 4;

  const tableHead = [['#', 'Date', 'Invoice #', 'Service', 'Items', 'Total Amount', 'Paid', 'Due', 'Status']];
  const tableBody = customerOrders.map((o, idx) => {
    const orderDate = formatDate(o.createdAt || o.date);
    const orderNum = o.number || o.orderNumber || o.id || 'N/A';
    const service = o.serviceType || 'Normal';
    const itemsCount = (o.itemDetails && Array.isArray(o.itemDetails))
      ? o.itemDetails.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0)
      : (o.itemCount || 1);
    const total = Number(o.totalAmount || 0);
    const isPaid = o.paymentStatus === 'Paid';
    const isPartial = o.paymentStatus === 'Partial';
    const paid = o.amountPaid !== undefined && o.amountPaid !== null && Number(o.amountPaid) > 0
      ? Number(o.amountPaid)
      : (isPaid ? total : 0);
    const due = isPaid ? 0 : (isPartial ? Math.max(0, total - paid) : total);

    return [
      `${idx + 1}`,
      orderDate,
      orderNum,
      service,
      `${itemsCount}`,
      formatCurrency(total),
      formatCurrency(paid),
      formatCurrency(due),
      o.status || 'Pending'
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'center' }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'Tuhama Laundry Co. — Customer Account Statement',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }
  });

  const safeCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Customer_Statement_${safeCustomerName}_${customerId}.pdf`;
  doc.save(filename);
  return true;
};
// ——— Payment report ———

export const PAYMENT_EXPORT_COLUMNS = [
  { key: 'id', label: 'Payment ID', format: (v) => `PAY-${String(v).padStart(4, '0')}` },
  { key: 'orderNumber', label: 'Order #' },
  { key: 'customer', label: 'Customer' },
  { key: 'amount', label: 'Amount', format: (v) => formatCurrency(v) },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date', format: (v) => formatDate(v) },
];

export const exportPaymentsCSV = (payments, filename = 'payments-report') =>
  exportToCSV(payments, filename, PAYMENT_EXPORT_COLUMNS);

export const exportPaymentsPDF = (payments, summary, filename = 'payments-report') =>
  exportToPDF({
    title: 'Tuhama — Payments Report',
    subtitle: 'Financial transaction summary',
    columns: PAYMENT_EXPORT_COLUMNS,
    data: payments,
    filename,
    summaryLines: summary,
  });

// ——— Staff report ———

export const STAFF_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'username', label: 'Username', format: (v) => (v ? `@${v}` : '') },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'joiningDate', label: 'Joining Date', format: (v) => formatDate(v) },
];

export const exportStaffCSV = (staff, filename = 'staff-directory') =>
  exportToCSV(staff, filename, STAFF_EXPORT_COLUMNS);

export const exportStaffPDF = (staff, summary, filename = 'staff-directory') =>
  exportToPDF({
    title: 'Tuhama — Staff Directory',
    subtitle: 'Employee listing and roles',
    columns: STAFF_EXPORT_COLUMNS,
    data: staff,
    filename,
    summaryLines: summary,
  });

const DEFAULT_BRANCHES = [
  { id: 1, name: 'Ragheey' },
  { id: 2, name: 'Mishrif' },
  { id: 3, name: 'Andalus' },
  { id: 4, name: 'Ardiya' },
  { id: 5, name: 'Khaitan' },
  { id: 6, name: 'Qurain' },
  { id: 7, name: 'Jahra' },
  { id: 8, name: 'Rigai' },
];

const getBranchDirectory = () => {
  try {
    const saved = localStorage.getItem('branches_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  if (typeof window !== 'undefined' && window.__cachedBranches && Array.isArray(window.__cachedBranches) && window.__cachedBranches.length) {
    return window.__cachedBranches;
  }
  return DEFAULT_BRANCHES;
};

export const resolveBranchName = (branchIdOrName) => {
  if (branchIdOrName == null || branchIdOrName === '' || branchIdOrName === 'null' || branchIdOrName === 'undefined') return '';
  const raw = String(branchIdOrName).trim();
  if (raw === 'null' || raw === 'undefined') return '';
  const branches = getBranchDirectory();

  const byId = branches.find((b) => String(b.id || b._id || '') === raw);
  if (byId?.name) return byId.name;

  const lower = raw.toLowerCase();
  const byName = branches.find(
    (b) =>
      b.name?.toLowerCase() === lower ||
      lower.includes(b.name?.toLowerCase()) ||
      b.name?.toLowerCase().includes(lower)
  );
  if (byName?.name) return byName.name;

  if (!/^\d+$/.test(raw)) return raw;
  return '';
};

export const getActiveBranchName = () => {
  try {
    const selectedBranchId = localStorage.getItem('selected_branch') || 'All';
    if (selectedBranchId === 'All' || selectedBranchId === 'all') {
      return 'All Branches';
    }
    const resolved = resolveBranchName(selectedBranchId);
    return resolved || selectedBranchId;
  } catch (e) {
    return 'All Branches';
  }
};

export const getBranchPrefix3 = (branchIdOrName) => {
  const name = resolveBranchName(branchIdOrName);
  if (!name) return 'SYS';
  const letters = name.replace(/[^a-zA-Z]/g, '');
  if (!letters) return 'SYS';
  return letters.slice(0, 3).toUpperCase();
};

export const getBranchCode = (branchIdOrName) => {
  if (!branchIdOrName || branchIdOrName === 'null' || branchIdOrName === 'undefined') return 'SYS';
  const name = String(branchIdOrName).toLowerCase();
  if (name === 'null' || name === 'undefined') return 'SYS';
  if (name.includes('ragheey') || name === '1') return 'RG';
  if (name.includes('mishrif') || name === '2') return 'MS';
  if (name.includes('andalus') || name === '3') return 'AD';
  if (name.includes('ardiya') || name === '4') return 'AR';
  if (name.includes('khaitan') || name === '5') return 'KH';
  if (name.includes('qurain') || name === '6') return 'QU';
  if (name.includes('jahra') || name === '7') return 'JH';
  if (name.includes('rigai') || name === '8') return 'RI';
  return 'SYS';
};

const sameBranch = (a, b, prefix) => {
  if (prefix === 'INV') {
    return getBranchPrefix3(a) === getBranchPrefix3(b);
  }
  return getBranchCode(a) === getBranchCode(b);
};

export const getNextBranchOrderNo = (orders = [], branchId, prefix = 'ORD') => {
  const branchPrefix = prefix === 'INV' ? getBranchPrefix3(branchId) : getBranchCode(branchId);
  const regex = prefix === 'INV' 
    ? new RegExp(`^${branchPrefix}-(\\d+)$`) 
    : new RegExp(`^${branchPrefix}-${prefix}-(\\d+)$`);

  const branchKey = branchId;
  const branchOrders = (orders || []).filter((o) =>
    sameBranch(o.branchId || o.branch, branchKey, prefix)
  );

  let maxSeq = 0;
  branchOrders.forEach((o) => {
    if (!o || !o.number) return;
    const match = o.number.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const seq = prefix === 'INV' ? String(nextSeq).padStart(3, '0') : String(nextSeq).padStart(5, '0');

  if (prefix === 'INV') {
    return `${branchPrefix}-${seq}`;
  }

  return `${branchPrefix}-${prefix}-${seq}`;
};

/**
 * Generate and print a bilingual Shift Settlement and Bank Deposit Closeout voucher
 */
export const generateShiftSettlementPDF = (shiftData, options = {}) => {
  if (!shiftData) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const currentDateTimeStr = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;

  const shiftName = shiftData.shift || options.shift || 'All Day / اليوم الكامل';
  const rawBranch = options.branchName || options.branch || shiftData.branchName || shiftData.branch || shiftData.branchId;
  const branchObj = translateBranch(rawBranch);
  const branchName = !branchObj.ar || branchObj.en.toLowerCase() === branchObj.ar.toLowerCase()
    ? branchObj.en
    : `${branchObj.en} / ${branchObj.ar}`;
  const staffList = shiftData.staffBreakdown || [];
  const expensesList = shiftData.expensesBreakdown || [];

  const morningStaff = (shiftData.morningStaff && shiftData.morningStaff.length > 0) ? shiftData.morningStaff.join(', ') : '';
  const eveningStaff = (shiftData.eveningStaff && shiftData.eveningStaff.length > 0) ? shiftData.eveningStaff.join(', ') : '';

  const staffRowsHtml = staffList.map(st => `
    <tr>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; font-weight: 700;">
        ${st.staffName || st.name}
        <div style="font-size: 8px; color: #555; font-weight: normal; margin-top: 1px;">
          <span style="font-weight: 700; color: #2563eb;">[${st.shift || (st.shiftKey === 'Morning' ? 'Morning / صباحية' : 'Evening / مسائية')}]</span> | 💵 Cash: ${formatCurrency(st.cashCollected || 0)} | 💳 K-Net: ${formatCurrency(st.knetCollected || 0)} | 🎟️ Bukey: ${formatCurrency(st.bukeyCollected || 0)} | 💰 Credit: ${formatCurrency(st.creditCollected || st.creditPending || 0)}${(st.cashExpenses || 0) > 0 ? ` | 💸 Exp: ${formatCurrency(st.cashExpenses || 0)}` : ''}
        </div>
      </td>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; text-align: center; vertical-align: top;">${st.invoicesCount || st.count || 0}</td>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; text-align: right; font-family: monospace; font-weight: 800; vertical-align: top;">
        ${formatCurrency(st.totalRevenue !== undefined ? st.totalRevenue : (st.sales || 0))}
        <div style="font-size: 8px; color: #047857; font-weight: 700;">Deposit: ${formatCurrency(st.netCashInHand !== undefined ? st.netCashInHand : (st.cashCollected || 0))}</div>
      </td>
    </tr>
  `).join('');

  const expenseRowsHtml = expensesList.map(ex => `
    <tr>
      <td style="padding: 4px 2px; font-size: 10px; border-bottom: 1px dashed #ddd; font-weight: 700;">
        ${ex.title}
        <div style="font-size: 8.5px; color: #666; font-weight: normal;">${ex.category} (${ex.paymentMethod})</div>
      </td>
      <td style="padding: 4px 2px; font-size: 10px; border-bottom: 1px dashed #ddd; text-align: right; font-family: monospace; font-weight: 800; color: #dc2626;">- ${formatCurrency(ex.amount || 0)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Shift Settlement Report - ${shiftName}</title>
        <style>
          @page {
            size: auto;
            margin: 8mm auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            color: #000 !important;
            line-height: 1.35;
            padding: 6mm 0;
          }
          .settlement-container {
            width: 88mm;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .brand-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .title-box {
            text-align: center;
            font-size: 12px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 6px 0 4px 0;
            padding: 5px 0;
            background: #000;
            color: #fff !important;
            border-radius: 4px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 3px;
            font-size: 10.5px;
          }
          .stats-grid {
            margin: 8px 0;
            border: 1.5px solid #000;
            border-radius: 6px;
            padding: 6px 8px;
            background: #fafafa;
          }
          .table-title {
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            margin: 8px 0 4px 0;
            border-bottom: 1.5px solid #000;
            padding-bottom: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            font-size: 9.5px;
            font-weight: 800;
            text-align: left;
            border-bottom: 1.5px solid #000;
            padding: 3px 2px;
          }
          .footer-section {
            text-align: center;
            font-size: 10px;
            border-top: 1.5px dashed #000;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="settlement-container">
          <div class="brand-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 12px; font-weight: 800;">Tuhama Laundry Co.</div>
                <div style="font-size: 8.5px; font-weight: 700;">Daily Cash Settlement</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 4px;">
                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 50px; height: 50px; object-fit: contain; display: block;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 12px; font-weight: 800;">شركة مصابغ تهامة</div>
                <div style="font-size: 8.5px; font-weight: 700;">تقرير إغلاق الوردية</div>
              </div>
            </div>
          </div>

          <div class="title-box">
            SHIFT &amp; CASH CLOSEOUT / تقرير الوردية
          </div>

          <div style="border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
            <div class="info-row">
              <span style="font-weight: 600;">Date &amp; Time / التاريخ:</span>
              <span style="font-weight: 800;">${currentDateTimeStr}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Shift / الوردية:</span>
              <span style="font-weight: 800;">${shiftName}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Branch / الفرع:</span>
              <span style="font-weight: 800;">${branchName}</span>
            </div>
            ${morningStaff ? `
            <div class="info-row">
              <span style="font-weight: 600;">Morning Staff / موظفو الصباح:</span>
              <span style="font-weight: 800; color: #1e40af;">${morningStaff}</span>
            </div>` : ''}
            ${eveningStaff ? `
            <div class="info-row">
              <span style="font-weight: 600;">Evening Staff / موظفو المساء:</span>
              <span style="font-weight: 800; color: #7e22ce;">${eveningStaff}</span>
            </div>` : ''}
            <div class="info-row">
              <span style="font-weight: 600;">Invoices Count / عدد الفواتير:</span>
              <span style="font-weight: 800;">${shiftData.invoicesCount || 0}</span>
            </div>
          </div>

          <!-- Collection & Settlement Breakdown -->
          <div class="stats-grid">
            <div class="info-row" style="font-size: 11px;">
              <span style="font-weight: 700;">💵 Cash Inflow / المقبوضات النقدية:</span>
              <span style="font-weight: 900; font-family: monospace;">${formatCurrency(shiftData.cashCollected || 0)}</span>
            </div>
            <div class="info-row" style="font-size: 11px;">
              <span style="font-weight: 700;">💳 K-Net / Card / كي نت:</span>
              <span style="font-weight: 900; font-family: monospace;">${formatCurrency(shiftData.knetCollected !== undefined ? shiftData.knetCollected : (shiftData.cardCollected || 0))}</span>
            </div>
            <div class="info-row" style="font-size: 11px;">
              <span style="font-weight: 700;">🎟️ Bukey / Package / باقات وبوكيه:</span>
              <span style="font-weight: 900; font-family: monospace;">${formatCurrency(shiftData.bukeyCollected !== undefined ? shiftData.bukeyCollected : (shiftData.linkCollected || 0))}</span>
            </div>
            ${(shiftData.creditCollected || 0) > 0 ? `
            <div class="info-row" style="font-size: 11px;">
              <span style="font-weight: 700;">💰 Credit / Unpaid / آجل وذمم:</span>
              <span style="font-weight: 900; font-family: monospace; color: #7c3aed;">${formatCurrency(shiftData.creditCollected || 0)}</span>
            </div>
            ` : ''}
            <div class="info-row" style="border-top: 1.5px solid #000; padding-top: 4px; margin-top: 4px; font-size: 12px;">
              <span style="font-weight: 900;">GROSS SALES / إجمالي المبيعات:</span>
              <span style="font-weight: 900; font-family: monospace;">${formatCurrency(shiftData.totalRevenue || 0)}</span>
            </div>
            ${(shiftData.cashExpenses || 0) > 0 ? `
            <div class="info-row" style="font-size: 11px; color: #dc2626; border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px;">
              <span style="font-weight: 800;">💸 Less: Cash Expenses / المصروفات النقدية:</span>
              <span style="font-weight: 900; font-family: monospace;">- ${formatCurrency(shiftData.cashExpenses || 0)}</span>
            </div>
            ` : ''}
            <div class="info-row" style="border-top: 1.5px solid #000; padding-top: 4px; margin-top: 4px; font-size: 12px;">
              <span style="font-weight: 900;">NET CASH IN HAND / صافي النقد:</span>
              <span style="font-weight: 900; font-family: monospace; color: #047857;">${formatCurrency(shiftData.netCashInHand !== undefined ? shiftData.netCashInHand : (shiftData.cashCollected || 0))}</span>
            </div>
          </div>

          <!-- Bank Deposit Box -->
          <div style="border: 2px solid #000; border-radius: 6px; padding: 6px 8px; margin: 8px 0; background: #fff; text-align: center;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase;">BANK DEPOSIT / المبلغ المودع بالبنك</div>
            <div style="font-size: 15px; font-weight: 900; font-family: monospace; margin-top: 2px; color: #047857;">
              🏦 ${formatCurrency(shiftData.bankDepositAmount !== undefined ? shiftData.bankDepositAmount : (shiftData.cashCollected || 0))}
            </div>
          </div>

          <!-- Expenses Breakdown (If any) -->
          ${expensesList.length > 0 ? `
          <div class="table-title">Shift Expenses / المصروفات المسجلة</div>
          <table>
            <thead>
              <tr>
                <th>Expense Title</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRowsHtml}
            </tbody>
          </table>` : ''}

          <!-- Staff Breakdown -->
          ${staffList.length > 0 ? `
          <div class="table-title">Staff Sales / مبيعات الموظفين</div>
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th style="text-align: center;">Invoices</th>
                <th style="text-align: right;">Sales</th>
              </tr>
            </thead>
            <tbody>
              ${staffRowsHtml}
            </tbody>
          </table>` : ''}

          <!-- Signatures Section -->
          <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1.5px dashed #000;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 9px; font-weight: 700;">Cashier Signature</div>
              <div style="font-size: 8.5px; direction: rtl;">توقيع الكاشير</div>
              <div style="margin-top: 18px; border-bottom: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto;"></div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 9px; font-weight: 700;">Manager Signature</div>
              <div style="font-size: 8.5px; direction: rtl;">توقيع المشرف</div>
              <div style="margin-top: 18px; border-bottom: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto;"></div>
            </div>
          </div>

          <div class="footer-section">
            <div>Tuhama Laundry Management System</div>
            <div style="font-size: 8.5px; color: #777; margin-top: 2px;">Printed on ${currentDateTimeStr}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print shift settlement error', e);
    }
  };

  iframe.onload = () => {
    const logoImg = iframe.contentWindow.document.querySelector('img[alt="Logo"]');
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 150);
      logoImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};

// ==========================================
// 10. GENERATE EXPENSE RECEIPT / VOUCHER (Thermal & A4 Slip)
// ==========================================
export const generateExpenseReceiptPDF = (expense, options = {}) => {
  if (!expense) return;

  const existing = document.getElementById('expense-receipt-iframe');
  if (existing) {
    document.body.removeChild(existing);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'expense-receipt-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const currentDateTimeStr = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;

  const rawBranch = options.branchName || options.branch || expense.branchName || expense.branch || expense.branchId;
  const branchObj = translateBranch(rawBranch);
  const branchName = !branchObj.ar || branchObj.en.toLowerCase() === branchObj.ar.toLowerCase()
    ? branchObj.en
    : `${branchObj.en} / ${branchObj.ar}`;
  const voucherNo = expense.id || expense._id ? String(expense.id || expense._id).slice(-8).toUpperCase() : `EXP-${Date.now().toString().slice(-6)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Expense Receipt - ${voucherNo}</title>
        <style>
          @page {
            size: auto;
            margin: 6mm auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            color: #000 !important;
            line-height: 1.35;
            padding: 4mm 0;
          }
          .voucher-container {
            width: 88mm;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .brand-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .title-box {
            text-align: center;
            font-size: 12px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 6px 0 6px 0;
            padding: 5px 0;
            background: #000;
            color: #fff !important;
            border-radius: 4px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
            font-size: 10.5px;
          }
          .details-card {
            margin: 8px 0;
            border: 1.5px solid #000;
            border-radius: 6px;
            padding: 8px;
            background: #fafafa;
          }
          .amount-box {
            border: 2px solid #000;
            border-radius: 6px;
            padding: 8px;
            margin: 8px 0;
            background: #fff;
            text-align: center;
          }
          .footer-section {
            text-align: center;
            font-size: 9.5px;
            border-top: 1.5px dashed #000;
            padding-top: 8px;
            margin-top: 10px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div class="brand-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 12px; font-weight: 800;">Tuhama Laundry Co.</div>
                <div style="font-size: 8.5px; font-weight: 700;">Expense Payment Voucher</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 4px;">
                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; display: block;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 12px; font-weight: 800;">شركة مصابغ تهامة</div>
                <div style="font-size: 8.5px; font-weight: 700;">سند صرف مصروفات</div>
              </div>
            </div>
          </div>

          <div class="title-box">
            EXPENSE RECEIPT / سند صرف
          </div>

          <!-- Metadata -->
          <div style="border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
            <div class="info-row">
              <span style="font-weight: 600;">Voucher # / رقم السند:</span>
              <span style="font-weight: 800; font-family: monospace;">#${voucherNo}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Branch / الفرع:</span>
              <span style="font-weight: 800;">${branchName}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Date & Time / التاريخ:</span>
              <span style="font-weight: 800;">${expense.date || day + '/' + month + '/' + year} ${expense.time || ''}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Shift / الوردية:</span>
              <span style="font-weight: 800;">${expense.shift || 'General'}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Logged By / المسجل:</span>
              <span style="font-weight: 800;">${expense.createdBy || 'Staff'}</span>
            </div>
          </div>

          <!-- Details Card -->
          <div class="details-card">
            <div style="font-size: 10px; font-weight: 700; color: #555; text-transform: uppercase;">Expense Description / وصف المصروف</div>
            <div style="font-size: 13px; font-weight: 900; margin-top: 3px; color: #000;">${expense.title}</div>
            
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ccc;">
              <div class="info-row" style="margin-bottom: 2px;">
                <span style="font-weight: 600;">Category / التصنيف:</span>
                <span style="font-weight: 800;">${expense.category || 'General'}</span>
              </div>
              <div class="info-row" style="margin-bottom: 2px;">
                <span style="font-weight: 600;">Paid Via / الدفع من:</span>
                <span style="font-weight: 800;">${expense.paymentMethod === 'Cash' ? '💵 Cash Drawer / نقدي' : expense.paymentMethod}</span>
              </div>
              ${expense.notes ? `
              <div style="margin-top: 4px; font-size: 9.5px; color: #444;">
                <span style="font-weight: 700;">Remarks / ملاحظات:</span> ${expense.notes}
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Amount Box -->
          <div class="amount-box">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase;">AMOUNT PAID / المبلغ المصروف</div>
            <div style="font-size: 18px; font-weight: 900; font-family: monospace; margin-top: 2px; color: #dc2626;">
              - ${formatCurrency(expense.amount || 0)}
            </div>
          </div>

          <!-- Signatures Section -->
          <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1.5px dashed #000;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 9px; font-weight: 700;">Receiver / Staff Signature</div>
              <div style="font-size: 8.5px; direction: rtl;">توقيع المستلم</div>
              <div style="margin-top: 22px; border-bottom: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto;"></div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 9px; font-weight: 700;">Authorized Approval</div>
              <div style="font-size: 8.5px; direction: rtl;">اعتماد الإدارة / المشرف</div>
              <div style="margin-top: 22px; border-bottom: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto;"></div>
            </div>
          </div>

          <div class="footer-section">
            <div>Tuhama Laundry Management System</div>
            <div style="font-size: 8.5px; color: #777; margin-top: 2px;">Receipt printed on ${currentDateTimeStr}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print expense receipt error', e);
    }
  };

  iframe.onload = () => {
    const logoImg = iframe.contentWindow.document.querySelector('img[alt="Logo"]');
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 150);
      logoImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};

// ==========================================
// 11. GENERATE DAY-WISE / DAILY EXPENSES STATEMENT (Thermal & A4 Slip)
// ==========================================
export const generateDailyExpensesSummaryPDF = (expensesList = [], options = {}) => {
  const existing = document.getElementById('daily-expense-statement-iframe');
  if (existing) {
    document.body.removeChild(existing);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'daily-expense-statement-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const currentDateTimeStr = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;

  const branchName = options.branchName || 'Main Branch / الفرع الرئيسي';
  const periodLabel = options.periodLabel || `${day}/${month}/${year}`;
  const totalAmount = expensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const cashTotal = expensesList.filter(e => /cash|نقدي/i.test(e.paymentMethod || '')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const otherTotal = totalAmount - cashTotal;

  const rowsHtml = expensesList.length > 0 ? expensesList.map((e, idx) => `
    <tr>
      <td style="padding: 4px 2px; font-size: 10px; border-bottom: 1px dashed #ddd; text-align: center; color: #555;">${idx + 1}</td>
      <td style="padding: 4px 2px; font-size: 10px; border-bottom: 1px dashed #ddd; font-weight: 700;">
        ${e.title}
        <div style="font-size: 8.5px; color: #666; font-weight: normal;">${e.category} (${e.paymentMethod}) - ${e.time || ''}</div>
      </td>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; text-align: center;">${e.createdBy || 'Staff'}</td>
      <td style="padding: 4px 2px; font-size: 10px; border-bottom: 1px dashed #ddd; text-align: right; font-family: monospace; font-weight: 800; color: #dc2626;">- ${formatCurrency(e.amount || 0)}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="4" style="padding: 12px; text-align: center; font-size: 10px; color: #777;">No expenses recorded for this day</td>
    </tr>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Daily Expenses Statement - ${periodLabel}</title>
        <style>
          @page {
            size: auto;
            margin: 6mm auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            color: #000 !important;
            line-height: 1.35;
            padding: 4mm 0;
          }
          .statement-container {
            width: 88mm;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .brand-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .title-box {
            text-align: center;
            font-size: 11.5px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 6px 0 6px 0;
            padding: 5px 0;
            background: #000;
            color: #fff !important;
            border-radius: 4px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 3px;
            font-size: 10.5px;
          }
          .stats-grid {
            margin: 8px 0;
            border: 1.5px solid #000;
            border-radius: 6px;
            padding: 6px 8px;
            background: #fafafa;
          }
          .table-title {
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            margin: 8px 0 4px 0;
            border-bottom: 1.5px solid #000;
            padding-bottom: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            font-size: 9.5px;
            font-weight: 800;
            text-align: left;
            border-bottom: 1.5px solid #000;
            padding: 3px 2px;
          }
          .footer-section {
            text-align: center;
            font-size: 9.5px;
            border-top: 1.5px dashed #000;
            padding-top: 8px;
            margin-top: 10px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="statement-container">
          <div class="brand-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 12px; font-weight: 800;">Tuhama Laundry Co.</div>
                <div style="font-size: 8.5px; font-weight: 700;">Daily Expenses Statement</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 4px;">
                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; display: block;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 12px; font-weight: 800;">شركة مصابغ تهامة</div>
                <div style="font-size: 8.5px; font-weight: 700;">كشف المصروفات اليومية</div>
              </div>
            </div>
          </div>

          <div class="title-box">
            DAILY EXPENSES / كشف المصروفات
          </div>

          <!-- Metadata -->
          <div style="border-bottom: 1.5px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
            <div class="info-row">
              <span style="font-weight: 600;">Statement Date / التاريخ:</span>
              <span style="font-weight: 800;">${periodLabel}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Branch / الفرع:</span>
              <span style="font-weight: 800;">${branchName}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: 600;">Items Count / عدد السجلات:</span>
              <span style="font-weight: 800;">${expensesList.length}</span>
            </div>
          </div>

          <!-- Summary Box -->
          <div class="stats-grid">
            <div class="info-row" style="font-size: 10.5px;">
              <span style="font-weight: 700;">💵 Cash Outflow / نقدي من الدرج:</span>
              <span style="font-weight: 900; font-family: monospace;">- ${formatCurrency(cashTotal)}</span>
            </div>
            ${otherTotal > 0 ? `
            <div class="info-row" style="font-size: 10.5px;">
              <span style="font-weight: 700;">💳 Card/Bank / بطاقة وبنك:</span>
              <span style="font-weight: 900; font-family: monospace;">- ${formatCurrency(otherTotal)}</span>
            </div>
            ` : ''}
            <div class="info-row" style="border-top: 1.5px solid #000; padding-top: 4px; margin-top: 4px; font-size: 12px;">
              <span style="font-weight: 900;">TOTAL EXPENSES / إجمالي المصروفات:</span>
              <span style="font-weight: 900; font-family: monospace; color: #dc2626;">- ${formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <!-- Itemized Breakdown -->
          <div class="table-title">Itemized List / بيان المصروفات</div>
          <table>
            <thead>
              <tr>
                <th style="width: 14px; text-align: center;">#</th>
                <th>Expense & Category</th>
                <th style="text-align: center;">Staff</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Signatures Section -->
          <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1.5px dashed #000;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 9px; font-weight: 700;">Cashier Signature</div>
              <div style="font-size: 8.5px; direction: rtl;">توقيع الكاشير</div>
              <div style="margin-top: 20px; border-bottom: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto;"></div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 9px; font-weight: 700;">Manager Signature</div>
              <div style="font-size: 8.5px; direction: rtl;">توقيع المشرف</div>
              <div style="margin-top: 20px; border-bottom: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto;"></div>
            </div>
          </div>

          <div class="footer-section">
            <div>Tuhama Laundry Management System</div>
            <div style="font-size: 8.5px; color: #777; margin-top: 2px;">Statement printed on ${currentDateTimeStr}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print daily expense statement error', e);
    }
  };

  iframe.onload = () => {
    const logoImg = iframe.contentWindow.document.querySelector('img[alt="Logo"]');
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 150);
      logoImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};

// ==========================================
// 12. GENERATE PAYMENT / BALANCE SETTLEMENT RECEIPT (Thermal Slip)
// ==========================================
export const generateSettlementReceiptPDF = (customer, settlementData = {}, options = {}) => {
  if (!customer) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const currentDateTimeStr = `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;

  const validCustNo = (customer.customerNo && customer.customerNo !== 'Auto-generated')
    ? customer.customerNo
    : (customer.displayId ? customer.displayId : (customer.id && customer.id !== 'Auto-generated' ? customer.id : (customer._id ? String(customer._id).slice(-4) : '001')));
  const receiptNo = settlementData.receiptNo || settlementData.paymentId || `PAY-${Date.now().toString().slice(-6)}`;

  const rawBranch = options.branchName || options.branch || customer.branchName || customer.branch || customer.branchId;
  const branchObj = translateBranch(rawBranch);
  const branchName = !branchObj.ar || branchObj.en.toLowerCase() === branchObj.ar.toLowerCase()
    ? branchObj.en
    : `${branchObj.en} / ${branchObj.ar}`;

  const customerName = customer.englishName || customer.name || 'Valued Customer';
  const arabicCustomerName = customer.arabicName || '';
  const customerPhone = customer.phones?.[0] || customer.phone || 'N/A';
  const customerId = validCustNo;

  const totalPaid = Number(settlementData.totalPaid || settlementData.amount || 0);
  const paymentMethod = settlementData.method || options.method || 'Cash / نقدي';
  const advanceAdded = Number(settlementData.advanceAdded || 0);
  const remainingDue = Number(settlementData.newTotalDue !== undefined ? settlementData.newTotalDue : (customer.balance || 0));
  const settledOrders = settlementData.settledOrders || [];

  const ordersRowsHtml = settledOrders.length > 0 ? settledOrders.map((ord, idx) => `
    <tr>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; font-family: monospace; font-weight: 700;">${ord.orderNumber || `Order #${idx + 1}`}</td>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; text-align: right; font-family: monospace;">${formatCurrency(ord.orderTotal || 0)}</td>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; text-align: right; font-family: monospace; font-weight: 700; color: #047857;">${formatCurrency(ord.amountApplied || 0)}</td>
      <td style="padding: 4px 2px; font-size: 9.5px; border-bottom: 1px dashed #ddd; text-align: right; font-family: monospace; color: ${ord.remainingDue > 0 ? '#b91c1c' : '#047857'}; font-weight: 700;">${formatCurrency(ord.remainingDue || 0)}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="4" style="padding: 6px 2px; font-size: 9.5px; text-align: center; color: #666;">General Account / Balance Settlement</td>
    </tr>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Payment Receipt - ${receiptNo}</title>
        <style>
          @page {
            size: auto;
            margin: 6mm auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            color: #000 !important;
            line-height: 1.35;
            padding: 4mm 0;
          }
          .receipt-container {
            width: 82mm;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .brand-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .receipt-title {
            text-align: center;
            font-size: 13px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 6px 0 8px 0;
            padding: 4px 0;
            background: #000;
            color: #fff !important;
            border-radius: 4px;
          }
          .info-section {
            border-bottom: 1.5px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 3px;
            font-size: 10.5px;
          }
          .info-label {
            font-weight: 600;
            color: #000 !important;
            flex: 1;
          }
          .info-value {
            font-weight: 800 !important;
            text-align: right;
            color: #000 !important;
            flex: 1;
          }
          .total-box {
            border: 2px solid #000;
            border-radius: 6px;
            padding: 8px 10px;
            margin: 8px 0;
            background: #fafafa;
            text-align: center;
          }
          .total-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .total-amount {
            font-size: 18px;
            font-weight: 900;
            font-family: monospace;
            color: #000;
            margin: 3px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
          }
          th {
            font-size: 9px;
            font-weight: 800;
            border-bottom: 1.5px solid #000;
            padding: 3px 2px;
          }
          .footer-section {
            text-align: center;
            font-size: 10px;
            border-top: 1.5px dashed #000;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Logo & Header -->
          <div class="brand-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 12px; font-weight: 800; line-height: 1.2;">Tuhama Laundry Co.</div>
                <div style="font-size: 8.5px; font-weight: 700;">Cleaning &amp; Ironing</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 4px;">
                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 50px; height: 50px; object-fit: contain; display: block;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 12px; font-weight: 800; line-height: 1.2;">شركة مصابغ تهامة</div>
                <div style="font-size: 8.5px; font-weight: 700;">تنظيف وكي وغسيل</div>
              </div>
            </div>
            <div style="font-size: 9.5px; font-weight: 700;">Tel: 222 03 222 | خدمة العملاء</div>
          </div>

          <!-- Receipt Title -->
          <div class="receipt-title">
            PAYMENT RECEIPT / سند قبض
          </div>

          <!-- Meta Info -->
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Receipt No / رقم السند:</span>
              <span class="info-value">${receiptNo}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date &amp; Time / التاريخ والوقت:</span>
              <span class="info-value">${currentDateTimeStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Branch / الفرع:</span>
              <span class="info-value">${branchName}</span>
            </div>
            <div style="border-top: 1px dashed #aaa; margin: 4px 0;"></div>
            <div class="info-row">
              <span class="info-label">Customer ID / رقم العميل:</span>
              <span class="info-value">${customerId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer / العميل:</span>
              <span class="info-value">${customerName}</span>
            </div>
            ${arabicCustomerName ? `
            <div class="info-row">
              <span class="info-label">الاسم بالعربي:</span>
              <span class="info-value" style="direction: rtl;">${arabicCustomerName}</span>
            </div>` : ''}
            <div class="info-row">
              <span class="info-label">Phone / الهاتف:</span>
              <span class="info-value">${customerPhone}</span>
            </div>
          </div>

          <!-- Paid Highlight Box -->
          <div class="total-box">
            <div class="total-title">TOTAL AMOUNT PAID / المبلغ المستلم</div>
            <div class="total-amount">${formatCurrency(totalPaid)}</div>
            <div style="font-size: 9.5px; font-weight: 700; color: #444;">Payment Method: <b>${paymentMethod}</b></div>
          </div>

          <!-- Settle Breakdown Table -->
          ${settledOrders.length > 0 ? `
          <div style="margin: 6px 0;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px;">Settled Invoices / الفواتير المسددة:</div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Inv #</th>
                  <th style="text-align: right;">Total</th>
                  <th style="text-align: right;">Paid</th>
                  <th style="text-align: right;">Bal</th>
                </tr>
              </thead>
              <tbody>
                ${ordersRowsHtml}
              </tbody>
            </table>
          </div>` : ''}

          <!-- Balances Summary -->
          <div class="info-section" style="border-top: 1.5px dashed #000; padding-top: 6px;">
            ${advanceAdded > 0 ? `
            <div class="info-row">
              <span class="info-label">Advance Credited / رصيد إضافي:</span>
              <span class="info-value" style="color: #047857;">+ ${formatCurrency(advanceAdded)}</span>
            </div>` : ''}
            <div class="info-row" style="font-size: 11px;">
              <span class="info-label" style="font-weight: 800;">Remaining Due / المتبقي:</span>
              <span class="info-value" style="color: ${remainingDue > 0 ? '#b91c1c' : '#047857'}; font-size: 12px;">${formatCurrency(remainingDue)}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-section">
            <div>Thank you for your payment!</div>
            <div style="direction: rtl; margin-top: 2px;">شكراً لتعاملكم مع شركة مصابغ تهامة!</div>
            <div style="font-size: 8.5px; color: #777; margin-top: 6px;">Software by SpinClean Laundry Management</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print settlement receipt error', e);
    }
  };

  iframe.onload = () => {
    const logoImg = iframe.contentWindow.document.querySelector('img[alt="Logo"]');
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 150);
      logoImg.onerror = () => setTimeout(triggerPrint, 150);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000);
};
