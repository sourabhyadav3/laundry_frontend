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
      doc.text(line, 14, y);
      y += 5;
    });
    y += 4;
  }

  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((c) => {
      const val = getCellValue(row, c);
      return extractTextFromReact(val);
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

const translateBranch = (branchIdOrName) => {
  if (!branchIdOrName) return { en: 'Main Branch', ar: 'الفرع الرئيسي' };
  const rawId = String(branchIdOrName).trim();
  const branchName = rawId.toLowerCase();

  // 1. Try to find in localStorage cached branches
  try {
    const cached = localStorage.getItem('branches_list');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const found = list.find(b => 
          String(b.id || b._id || '').toLowerCase() === branchName ||
          String(b.name || '').toLowerCase() === branchName
        );
        if (found) {
          const nameLower = String(found.name).toLowerCase();
          if (found.nameAr && /[\u0600-\u06FF]/.test(found.nameAr)) {
            return { en: found.name, ar: found.nameAr };
          }
          if (nameLower.includes('home') || nameLower.includes('service')) {
            return { en: 'Home Services', ar: 'خدمة المنازل' };
          }
          if (nameLower.includes('ragheey') || nameLower.includes('rigai')) {
            return { en: found.name, ar: 'الرقعي' };
          }
          if (nameLower.includes('mishrif')) {
            return { en: found.name, ar: 'مشرف' };
          }
          if (nameLower.includes('andalus')) {
            return { en: found.name, ar: 'الأندلس' };
          }
          if (nameLower.includes('ardiya')) {
            return { en: found.name, ar: 'العارضية' };
          }
          if (nameLower.includes('khaitan')) {
            return { en: found.name, ar: 'خيطان' };
          }
          if (nameLower.includes('qurain')) {
            return { en: found.name, ar: 'القرين' };
          }
          if (nameLower.includes('jahra')) {
            return { en: found.name, ar: 'الجهراء' };
          }
          if (nameLower.includes('main') || nameLower.includes('head')) {
            return { en: found.name, ar: 'الفرع الرئيسي' };
          }
          if (nameLower.includes('salmiya')) return { en: found.name, ar: 'السالمية' };
          if (nameLower.includes('hawally')) return { en: found.name, ar: 'حولي' };
          if (nameLower.includes('farwaniya')) return { en: found.name, ar: 'الفروانية' };
          if (nameLower.includes('mahboula')) return { en: found.name, ar: 'المهبولة' };
          if (nameLower.includes('fahaheel')) return { en: found.name, ar: 'الفحيحيل' };
          if (nameLower.includes('mangaf')) return { en: found.name, ar: 'المنقف' };
          return { en: found.name, ar: '' };
        }
      }
    }
  } catch (e) {
    console.error('Error looking up branch from localStorage:', e);
  }

  // 2. Direct database seeded ObjectId mapping or code mapping
  if (branchName.includes('home') || branchName.includes('service')) return { en: 'Home Services', ar: 'خدمة المنازل' };
  if (branchName.includes('main') || branchName.includes('head')) return { en: 'Main Branch', ar: 'الفرع الرئيسي' };
  if (branchName === '6a3cf82764fc882a198272c5' || branchName.includes('ragheey') || branchName === '1') return { en: 'Ragheey', ar: 'الرقعي' };
  if (branchName === '6a3cf82764fc882a198272c6' || branchName.includes('mishrif') || branchName === '2') return { en: 'Mishrif', ar: 'مشرف' };
  if (branchName === '6a3cf82764fc882a198272c7' || branchName.includes('andalus') || branchName === '3') return { en: 'Andalus', ar: 'الأندلس' };
  if (branchName.includes('ardiya') || branchName === '4') return { en: 'Ardiya', ar: 'العارضية' };
  if (branchName.includes('khaitan') || branchName === '5') return { en: 'Khaitan', ar: 'خيطان' };
  if (branchName.includes('qurain') || branchName === '6') return { en: 'Qurain', ar: 'القرين' };
  if (branchName.includes('jahra') || branchName === '7') return { en: 'Jahra', ar: 'الجهراء' };
  if (branchName === '6a3d01028b85970b21c6dc45' || branchName.includes('rigai') || branchName === '8') return { en: 'Rigai', ar: 'الرقعي' };
  if (branchName.includes('salmiya')) return { en: 'Salmiya', ar: 'السالمية' };
  if (branchName.includes('hawally')) return { en: 'Hawally', ar: 'حولي' };
  if (branchName.includes('farwaniya')) return { en: 'Farwaniya', ar: 'الفروانية' };

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
  let url = `${base}/receipt/${encodeURIComponent(invoiceNumber)}`;
  // Embed order data in query string so any device scanning the QR sees real data
  if (order) {
    try {
      const slim = {
        number: order.number,
        date: order.date,
        customerName: order.customerName,
        staffName: order.staffName || order.createdBy,
        serviceType: order.serviceType,
        paymentStatus: order.paymentStatus,
        branchId: order.branchId || order.branch,
        amount: order.amount,
        discount: order.discount,
        tax: order.tax,
        taxRate: order.taxRate,
        totalAmount: order.totalAmount,
        deliveryType: order.deliveryType,
        deliveryStatus: order.deliveryStatus || order.status,
        itemDetails: (order.itemDetails || []).map(it => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes,
        })),
      };
      const json = JSON.stringify(slim);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      url += `?d=${encodeURIComponent(encoded)}`;
    } catch (e) {
      console.error('Failed to embed order data in receipt URL', e);
    }
  }
  return url;
};

export const decodeReceiptData = (search, hash) => {
  try {
    let encoded = null;
    if (search) {
      const params = new URLSearchParams(search);
      encoded = params.get('d');
    }
    if (!encoded && hash) {
      const match = hash.match(/d=(.+)/);
      if (match) {
        encoded = match[1];
      }
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
  } else if (estimatedTime.toLowerCase().includes('hour')) {
    const num = estimatedTime.replace(/[^0-9]/g, '');
    const isSingle = num === '1';
    estTimeEn = num ? (isSingle ? 'After 1 Hour' : `After ${num} Hours`) : (estimatedTime.toLowerCase().startsWith('after') ? estimatedTime : `After ${estimatedTime}`);
    estTimeAr = num ? (isSingle ? 'بعد 1 ساعة' : `بعد ${num} ساعات`) : (estimatedTime.startsWith('بعد') ? estimatedTime : `بعد ${estimatedTime}`);
  } else if (estimatedTime.toLowerCase().includes('day')) {
    const num = estimatedTime.replace(/[^0-9]/g, '');
    const isSingle = num === '1';
    estTimeEn = num ? (isSingle ? 'After 1 Day' : `After ${num} Days`) : (estimatedTime.toLowerCase().startsWith('after') ? estimatedTime : `After ${estimatedTime}`);
    estTimeAr = num ? (isSingle ? 'بعد 1 يوم' : `بعد ${num} أيام`) : (estimatedTime.startsWith('بعد') ? estimatedTime : `بعد ${estimatedTime}`);
  } else {
    estTimeEn = estimatedTime;
    estTimeAr = estimatedTime;
  }

  const isHome = order?.isHomeDelivery === true || String(order?.deliveryType || '').toLowerCase() === 'home delivery';

  let dateStr = isHome ? (order?.deliveryDate || order?.expectedDeliveryDate) : '';
  if (isHome && !dateStr) {
    const baseDate = order?.date ? new Date(order.date) : new Date();
    let hoursToAdd = 24;
    if (estimatedTime.toLowerCase().includes('hour')) {
      const parsedHours = parseInt(estimatedTime, 10);
      if (!isNaN(parsedHours)) hoursToAdd = parsedHours;
    } else if (estimatedTime.toLowerCase().includes('day')) {
      const parsedDays = parseInt(estimatedTime, 10);
      if (!isNaN(parsedDays)) hoursToAdd = parsedDays * 24;
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

  // Look up customer displayId and phone number from window cache
  const customersList = window.__cachedCustomers || [];
  const customerObj = customersList.find(
    (c) =>
      c.id === order?.customerId ||
      c._id === order?.customerId ||
      c.name?.toLowerCase() === order?.customerName?.toLowerCase()
  );

  const customerIdStr = customerObj
    ? (customerObj.customerNo || `CUST-${String(customerObj.displayId || '').padStart(4, '0')}`)
    : 'N/A';
  const customerPhoneStr = customerObj?.phone || order?.contactNumber || 'N/A';

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

    const noteHtml = it.notes ? `<div class="item-notes" style="color: #000 !important; font-weight: bold; font-size: 10px; margin-top: 1px;">Note: ${it.notes}</div>` : '';
    
    return `
      <tr>
        <td style="padding: 5px 2px; border-bottom: 1.5px dashed #000; text-align: left; vertical-align: middle;">
          ${itemEn ? `<div class="item-name-en" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 700; font-size: 11px; color: #000; display: block; text-align: left; direction: ltr;">${itemEn}</div>` : ''}
          ${itemAr ? `<div class="item-name-ar" lang="ar" dir="rtl" style="font-family: 'Noto Sans Arabic', 'Cairo', 'Tajawal', Tahoma, sans-serif; font-weight: 700; font-size: 11px; color: #000; display: block; text-align: right; direction: rtl; margin-top: 2px;">${itemAr}</div>` : ''}
          ${noteHtml}
        </td>
        <td style="padding: 5px 2px; border-bottom: 1.5px dashed #000; text-align: center; vertical-align: middle;" class="item-qty">
          ${it.quantity}
        </td>
        <td style="padding: 5px 2px; border-bottom: 1.5px dashed #000; text-align: right; vertical-align: middle;" class="item-price">
          ${formatCurrency(it.unitPrice)}
        </td>
        <td style="padding: 5px 2px; border-bottom: 1.5px dashed #000; text-align: right; vertical-align: middle;" class="item-total">
          ${formatCurrency(it.quantity * it.unitPrice)}
        </td>
      </tr>
    `;
  }).join('');

  // Discount lines
  let discountLine = '';
  if (order?.discount > 0) {
    discountLine = `
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #000 !important; font-weight: 700; margin-bottom: 3px;">
        <span style="font-size: 11px; font-weight: 700;">Discount / الخصم:</span>
        <span style="font-family: monospace; font-size: 11px; font-weight: 700;">-${formatCurrency(order.discount)}</span>
      </div>
    `;
  }

  // Tax lines
  let taxLine = '';
  if (order?.tax > 0) {
    taxLine = `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; color: #000 !important; font-weight: 700;">
        <span style="font-size: 11px; font-weight: 700;">Tax (${order.taxRate || 0}%) / الضريبة (${order.taxRate || 0}%):</span>
        <span style="font-family: monospace; font-size: 11px; font-weight: 700;">${formatCurrency(order.tax)}</span>
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
          @media print {
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff !important;
            }
            .receipt-container {
              width: 78mm !important;
              margin: 0 auto !important;
              padding: 6px !important;
              box-shadow: none !important;
              border: 2px solid #000 !important;
            }
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, 'Noto Sans Arabic', sans-serif;
            margin: 0;
            padding: 10px;
            background-color: #f3f4f6;
            color: #000 !important;
            font-weight: 700 !important;
            -webkit-font-smoothing: antialiased;
          }
          .receipt-container {
            max-width: 340px;
            margin: 0 auto;
            background: #fff;
            padding: 12px;
            border: 2px solid #000 !important;
            border-radius: 4px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          }
          .brand-header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 3px solid #000;
            padding-bottom: 6px;
          }
          .brand-name {
            font-size: 18px;
            font-weight: 800;
            color: #000 !important;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .receipt-title {
            text-align: center;
            font-size: 13px;
            font-weight: 800 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            color: #000 !important;
          }
          .info-section {
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 3px;
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
            font-size: 11px;
            color: #000 !important;
          }
          .table-header th {
            border-bottom: 2.5px solid #000 !important;
            font-size: 11px;
            font-weight: 800 !important;
            padding: 4px 2px;
            text-transform: uppercase;
            color: #000 !important;
          }
          .item-name-en {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-weight: 700 !important;
            font-size: 11px;
            color: #000 !important;
            display: block;
            text-align: left;
            direction: ltr;
          }
          .item-name-ar {
            font-family: 'Noto Sans Arabic', 'Cairo', 'Tajawal', Tahoma, sans-serif;
            font-size: 11px;
            color: #000 !important;
            display: block;
            direction: rtl;
            text-align: right;
            font-weight: 700 !important;
            margin-top: 2px;
          }
          .item-qty {
            font-size: 11px;
            font-weight: 700 !important;
            color: #000 !important;
          }
          .item-price {
            font-family: monospace;
            font-size: 11px;
            font-weight: 700 !important;
            color: #000 !important;
          }
          .item-total {
            font-family: monospace;
            font-size: 11px;
            font-weight: 700 !important;
            color: #000 !important;
          }
          .item-notes {
            font-size: 9px;
            color: #000 !important;
            font-style: italic;
            margin-top: 1px;
            font-weight: 700;
          }
          .summary-section {
            border-top: 2px dashed #000;
            padding-top: 6px;
            margin-top: 6px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 15px;
            font-weight: 800 !important;
            border-top: 3px solid #000 !important;
            border-bottom: 3px solid #000 !important;
            padding: 6px 0;
            margin-top: 6px;
            color: #000 !important;
          }
          .footer-section {
            text-align: center;
            font-size: 11px;
            color: #000 !important;
            margin-top: 15px;
            border-top: 2px dashed #000;
            padding-top: 6px;
            font-weight: 700 !important;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="brand-header" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 8px;">
            <!-- Top row: English left | Logo center | Arabic right -->
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div style="text-align: left; flex: 1;">
                <div style="font-size: 12px; font-weight: 800; color: #000 !important; line-height: 1.3;">Tuhama Laundry Co.</div>
                <div style="font-size: 9px; color: #000 !important; line-height: 1.2; font-weight: 700;">Cleaning, Ironing &amp; Wash in K.</div>
              </div>
              <div style="flex: 0 0 auto; margin: 0 6px;">
                <img src="${window.location.origin}/logo.png" alt="Tuhama Logo" style="width: 80px; height: 80px; object-fit: contain; border-radius: 12px; display: block; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
              </div>
              <div style="text-align: right; flex: 1; direction: rtl;">
                <div style="font-size: 13px; font-weight: 800; color: #000 !important; line-height: 1.3;">شركة مصابغ تهامة</div>
                <div style="font-size: 9px; color: #000 !important; line-height: 1.2; font-weight: 700;">تنظيف وكي وغسيل</div>
              </div>
            </div>
            <!-- Phone numbers row -->
            <div style="display: flex; justify-content: center; gap: 12px; margin-top: 4px; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: #000 !important;">Tel: 222 03 222</span>
            </div>
            <div class="receipt-title">Invoice - فاتورة</div>
          </div>
          
          <div class="info-section">
            <div style="text-align: center; border: 1.5px solid #000; border-radius: 6px; background-color: #f3f4f6; padding: 6px; margin-bottom: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <span style="font-size: 13px; font-weight: 800; color: #000;">Invoice # ${order?.number || 'N/A'}</span>
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
            <div class="info-row" style="background-color: #fef08a; padding: 2px 4px; border-radius: 4px; font-weight: 800; border: 1px solid #eab308; margin-bottom: 4px; margin-top: 2px;">
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
              <span class="info-value">${translatedService.en === translatedService.ar ? translatedService.en : `${translatedService.en} / <span style="direction: rtl;">${translatedService.ar}</span>`}</span>
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
                <span style="font-size: 10px; font-weight: 700; color: #111;">
                  ${expectedDeliveryInfo.timeEn === expectedDeliveryInfo.timeAr ? expectedDeliveryInfo.timeEn : `${expectedDeliveryInfo.timeEn} / <span style="direction: rtl;">${expectedDeliveryInfo.timeAr}</span>`}
                </span>
              </span>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <thead>
              <tr class="table-header">
                <th style="width: 50%; text-align: left; padding: 4px 2px;">Item<br><span style="font-size: 10px; font-weight: 800;">الصنف</span></th>
                <th style="width: 12%; text-align: center; padding: 4px 2px;">Qty<br><span style="font-size: 10px; font-weight: 800;">الكمية</span></th>
                <th style="width: 18%; text-align: right; padding: 4px 2px;">Price<br><span style="font-size: 10px; font-weight: 800;">السعر</span></th>
                <th style="width: 20%; text-align: right; padding: 4px 2px;">Total<br><span style="font-size: 10px; font-weight: 800;">الإجمالي</span></th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary-section">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 11px; font-weight: 700;">Total Qty / إجمالي الكمية:</span>
              <span style="font-family: monospace; font-size: 11px; font-weight: 700;">${totalQuantity}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 11px; font-weight: 700;">Subtotal / المجموع الفرعي:</span>
              <span style="font-family: monospace; font-size: 11px; font-weight: 700;">${formatCurrency(order?.amount || 0)}</span>
            </div>
            ${discountLine}
            ${taxLine}
            <div class="total-row">
              <span style="font-size: 15px; font-weight: 800;">Total Amount / إجمالي السعر:</span>
              <span style="font-family: monospace; font-size: 16px; font-weight: 800;">${formatCurrency(displayTotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px; margin-bottom: 3px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 11px; font-weight: 700;">Paid Amount / المبلغ المدفوع:</span>
              <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #059669;">${formatCurrency(paidVal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; color: #000 !important; font-weight: 700;">
              <span style="font-size: 11px; font-weight: 700;">Remaining Balance / المتبقي:</span>
              <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #dc2626;">${formatCurrency(balanceVal)}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 15px; margin-bottom: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=350x350&ecc=H&qzone=4&data=${encodeURIComponent(receiptUrl)}" alt="Invoice QR" style="width: 140px; height: 140px; display: block; margin: 0 auto 6px auto;" />
            <div style="font-size: 11px; color: #000 !important; font-weight: 800; line-height: 1.3;">Scan to View Invoice</div>
            <div style="font-size: 11px; color: #000 !important; direction: rtl; font-weight: 800; line-height: 1.3;">امسح لفتح الفاتورة</div>
          </div>
          
          <div class="footer-section">
            <div style="font-weight: 800; margin-bottom: 2px; font-size: 11px; color: #000 !important;">Thank you for choosing Tuhama laundry co.!</div>
            <div style="direction: rtl; font-weight: 800; font-size: 11px; color: #000 !important;">شكراً لاختياركم تهامة برو!</div>
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

  const receiptNo = options.receiptNo || `SUB-${customer.customerNo || customer.displayId || String(customer.id || '').slice(-4) || '001'}`;
  const branchName = options.branchName || customer.branchName || 'Main Branch / الفرع الرئيسي';
  const paymentMethod = options.paymentMethod || 'Cash / نقدي';

  // Build verification QR URL
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `Tuhama Laundry - Subscription Receipt: ${receiptNo}\nCustomer: ${customer.name || customer.englishName || ''}\nPhone: ${customer.phone || ''}\nAmount: ${formattedAmount}\nStatus: Paid / مدفوع\nDate: ${currentDateTimeStr}`
  )}`;

  const customerName = customer.englishName || customer.name || 'Valued Customer';
  const arabicCustomerName = customer.arabicName || '';
  const customerPhone = customer.phones?.[0] || customer.phone || 'N/A';
  const customerId = customer.displayId || customer.customerNo || customer.id || 'N/A';

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
  const customerId = customer.displayId || customer.customerNo || customer.id || 'N/A';

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

export const getNextBranchOrderNo = (orders, branchId, prefix = 'ORD') => {
  const branchKey = branchId;
  const branchOrders = orders.filter((o) =>
    sameBranch(o.branchId || o.branch, branchKey, prefix)
  );

  let maxSeq = prefix === 'INV' ? 0 : 100;
  branchOrders.forEach((o) => {
    const match = o.number?.match(/(\d+)$/);
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
    return `${getBranchPrefix3(branchId)}-${seq}`;
  }

  const code = getBranchCode(branchId);
  return `${code}-${prefix}-${seq}`;
};
