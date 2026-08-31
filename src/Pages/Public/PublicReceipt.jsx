import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  formatCurrency,
  getDisplayTotal,
  getReceiptUrl,
  findReceiptOrder,
  decodeReceiptData,
  getExpectedDeliveryInfo,
  formatInvoiceDateTime
} from '../../utils/exportUtils';
import { getBilingualGarmentNames } from '../../utils/garmentTranslations';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  const name = rawId.toLowerCase();

  try {
    const cached = localStorage.getItem('branches_list');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const found = list.find(b => 
          String(b.id || b._id || '').toLowerCase() === name ||
          String(b.name || '').toLowerCase() === name
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

  if (name.includes('home') || name.includes('service')) return { en: 'Home Services', ar: 'خدمة المنازل' };
  if (name.includes('main') || name.includes('head')) return { en: 'Main Branch', ar: 'الفرع الرئيسي' };
  if (name === '6a3cf82764fc882a198272c5' || name.includes('ragheey') || name === '1') return { en: 'Ragheey', ar: 'الرقعي' };
  if (name === '6a3cf82764fc882a198272c6' || name.includes('mishrif') || name === '2') return { en: 'Mishrif', ar: 'مشرف' };
  if (name === '6a3cf82764fc882a198272c7' || name.includes('andalus') || name === '3') return { en: 'Andalus', ar: 'الأندلس' };
  if (name.includes('ardiya') || name === '4') return { en: 'Ardiya', ar: 'العارضية' };
  if (name.includes('khaitan') || name === '5') return { en: 'Khaitan', ar: 'خيطان' };
  if (name.includes('qurain') || name === '6') return { en: 'Qurain', ar: 'القرين' };
  if (name.includes('jahra') || name === '7') return { en: 'Jahra', ar: 'الجهراء' };
  if (name === '6a3d01028b85970b21c6dc45' || name.includes('rigai') || name === '8') return { en: 'Rigai', ar: 'الرقعي' };
  if (name.includes('salmiya')) return { en: 'Salmiya', ar: 'السالمية' };
  if (name.includes('hawally')) return { en: 'Hawally', ar: 'حولي' };
  if (name.includes('farwaniya')) return { en: 'Farwaniya', ar: 'الفروانية' };

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

const translateGarment = (name) => {
  let catalogList = window.__cachedCatalog;
  if (!catalogList) {
    try {
      const stored = localStorage.getItem('catalog_list');
      if (stored) {
        catalogList = JSON.parse(stored);
      }
    } catch (e) {}
  }
  return getBilingualGarmentNames(name, catalogList);
};

const PublicReceipt = () => {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Instant preview from QR embedded param if available
    const urlData = decodeReceiptData(location.search, location.hash);
    if (urlData && (urlData.number || urlData.totalAmount)) {
      setOrder(urlData);
      setLoading(false);
    }

    // 2. Fetch fresh live invoice data from Backend API
    const fetchLiveInvoice = async () => {
      const queryId = id || urlData?.number;
      if (!queryId) {
        if (!urlData) setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/orders/public/${encodeURIComponent(queryId)}`, {
          timeout: 6000
        });
        if (res.data && isMounted) {
          setOrder(res.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Backend live invoice fetch notice:', err?.message || err);
      }

      // 3. Fallback to localStorage snapshots if available
      if (isMounted) {
        if (!urlData) {
          const foundOrder = findReceiptOrder(queryId, []);
          if (foundOrder) {
            setOrder(foundOrder);
          }
        }
        setLoading(false);
      }
    };

    fetchLiveInvoice();

    return () => {
      isMounted = false;
    };
  }, [id, location.search, location.hash]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent mb-3"></div>
          <p className="text-gray-300 font-semibold">Loading Invoice / جاري تحميل الفاتورة...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">Invoice Not Found / الفاتورة غير موجودة</h2>
        <p className="text-gray-600 mb-6 max-w-sm text-sm">
          We couldn't locate an active invoice for <strong>{id || 'N/A'}</strong>. Please check the receipt number or scan again.
        </p>
        <Link to="/" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors">
          Go to Homepage / الرئيسية
        </Link>
      </div>
    );
  }

  const translatedPayment = translatePaymentStatus(order.paymentStatus);
  const translatedBranch = translateBranch(order.branchId || order.branch || order.branchName);
  const translatedService = translateService(order.serviceType);
  const expectedDeliveryInfo = getExpectedDeliveryInfo(order);
  const displayTotal = getDisplayTotal(order);

  const discountVal = Number(order.discount !== undefined ? order.discount : (order.discountAmount || 0));
  const paidVal = order.paymentStatus === 'Paid'
    ? displayTotal
    : order.paymentStatus === 'Pending'
      ? 0
      : Number(order.amountPaid || 0);
  const balanceVal = Math.max(0, displayTotal - paidVal);

  const totalQuantity = (order.itemDetails || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  const customerIdDisplay = order.customerNo && order.customerNo !== 'Auto-generated'
    ? order.customerNo
    : (order.customerId && order.customerId !== 'Auto-generated' ? order.customerId : 'N/A');

  const customerPhoneDisplay = order.customerPhone || order.contactNumber || order.phone || 'N/A';

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-3 flex flex-col items-center justify-center font-sans text-gray-900">
      {/* Top Floating Controls */}
      <div className="w-full max-w-md flex justify-between items-center mb-3 px-1 print:hidden">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-bold text-gray-300">Live Verified Receipt</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-md shadow transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / طباعة
        </button>
      </div>

      {/* Main Receipt Card */}
      <div className="bg-white w-full max-w-md border border-gray-300 shadow-2xl rounded-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Header with Logo */}
        <div className="p-5 border-b-2 border-black text-center bg-amber-50/40 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="text-left flex-1">
              <div className="text-sm font-black text-black uppercase leading-tight">Tuhama Laundry Co.</div>
              <div className="text-[10px] text-gray-700 font-bold leading-tight">Cleaning, Ironing &amp; Wash in K.</div>
            </div>
            <div className="flex-shrink-0 mx-2">
              <img src="/logo.png" alt="Tuhama Logo" className="w-14 h-14 object-contain rounded-xl shadow-sm border border-gray-200" />
            </div>
            <div className="text-right flex-1" dir="rtl">
              <div className="text-sm font-black text-black leading-tight">شركة مصابغ تهامة</div>
              <div className="text-[10px] text-gray-700 font-bold leading-tight">تنظيف وكي وغسيل</div>
            </div>
          </div>
          
          <div className="text-xs font-bold text-gray-800 tracking-wide mb-1">
            Tel: 222 03 222
          </div>
          <div className="text-xs font-black text-black uppercase tracking-wider border-t border-b border-black py-1 px-4 mt-1">
            Invoice - فاتورة
          </div>
        </div>

        {/* Invoice Number Badge & Live Status */}
        <div className="p-4 border-b border-dashed border-gray-300 space-y-2.5">
          <div className="flex justify-between items-center bg-gray-100 p-2.5 rounded-lg border border-gray-300">
            <div>
              <span className="text-xs text-gray-500 font-bold block">Invoice Number / رقم الفاتورة</span>
              <span className="text-base font-black text-black">{order.number || 'N/A'}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 font-bold block">Status / الحالة</span>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
                order.status === 'Delivered' ? 'bg-green-100 text-green-800 border border-green-300' :
                order.status === 'Ready' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                order.status === 'In Process' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {order.status || 'Waiting'}
              </span>
            </div>
          </div>

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Date / التاريخ:</span>
            <span className="text-black font-semibold">{formatInvoiceDateTime(order)}</span>
          </div>

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Branch / الفرع:</span>
            <span className="text-black font-semibold text-right">
              {translatedBranch.en}
              {translatedBranch.ar && translatedBranch.ar.toLowerCase() !== translatedBranch.en.toLowerCase() && (
                <> / <span dir="rtl">{translatedBranch.ar}</span></>
              )}
            </span>
          </div>

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Customer / العميل:</span>
            <span className="text-black font-extrabold">{order.customerName || 'N/A'}</span>
          </div>

          {order.isSubscriber && (
            <div className="flex justify-between items-center text-xs bg-amber-100 border border-amber-400 p-1.5 rounded-md text-amber-950 font-black">
              <span>Subscriber Status / الاشتراك:</span>
              <span className="text-amber-800 font-black text-sm">⭐ VIP Subscriber</span>
            </div>
          )}

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Customer ID / رقم العميل:</span>
            <span className="text-black font-semibold">{customerIdDisplay}</span>
          </div>

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Phone / الهاتف:</span>
            <span className="text-black font-semibold">{customerPhoneDisplay}</span>
          </div>

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Staff / الموظف:</span>
            <span className="text-black font-semibold">{order.staffName || order.createdBy || 'N/A'}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
            <span>Service Type / نوع الخدمة:</span>
            <span className="text-right font-black">
              {/express|urgent|مستعجل/i.test(translatedService.en || '') ? (
                <span className="inline-block bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[11px]">
                  ⚡ {translatedService.en} / {translatedService.ar}
                </span>
              ) : (
                <span>
                  {translatedService.en === translatedService.ar ? translatedService.en : `${translatedService.en} / ${translatedService.ar}`}
                </span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
            <span>Payment Status / الدفع:</span>
            <span className={`px-2 py-0.5 rounded font-black text-xs ${
              order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
              order.paymentStatus === 'Partial' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {translatedPayment.en} / {translatedPayment.ar}
            </span>
          </div>

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Delivery Type / نوع التوصيل:</span>
            <span className="text-black font-semibold">{order.deliveryType || 'Branch Pickup'}</span>
          </div>

          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Exp. Delivery / التسليم المتوقع:</span>
            <span className="text-black font-semibold text-right">
              {expectedDeliveryInfo.date ? `${expectedDeliveryInfo.date} ` : ''}
              <span>({expectedDeliveryInfo.timeEn === expectedDeliveryInfo.timeAr ? expectedDeliveryInfo.timeEn : `${expectedDeliveryInfo.timeEn} / ${expectedDeliveryInfo.timeAr}`})</span>
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 text-[11px] font-black uppercase text-black w-1/2">Item<br/><span className="text-[10px]">الصنف</span></th>
                <th className="py-2 text-[11px] font-black uppercase text-black text-center w-1/6">Qty<br/><span className="text-[10px]">الكمية</span></th>
                <th className="py-2 text-[11px] font-black uppercase text-black text-right w-1/6">Price<br/><span className="text-[10px]">السعر</span></th>
                <th className="py-2 text-[11px] font-black uppercase text-black text-right w-1/6">Total<br/><span className="text-[10px]">الإجمالي</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(order.itemDetails || []).map((it, idx) => {
                const translatedItem = translateGarment(it.name);
                const itemEn = it.name || translatedItem.en || '';
                let itemAr = it.nameAr || '';
                if (!itemAr || !/[\u0600-\u06FF]/.test(itemAr)) {
                  itemAr = translatedItem.ar || '';
                }
                if (itemEn.toLowerCase() === itemAr.toLowerCase() || !/[\u0600-\u06FF]/.test(itemAr)) {
                  itemAr = '';
                }
                return (
                  <tr key={idx} className="text-xs">
                    <td className="py-2.5">
                      {itemEn && <div className="font-extrabold text-black">{itemEn}</div>}
                      {itemAr && <div className="text-[11px] text-gray-700 font-bold" dir="rtl">{itemAr}</div>}
                      {it.notes && (
                        <div className="text-[10px] text-gray-500 italic mt-0.5">Note: {it.notes}</div>
                      )}
                    </td>
                    <td className="py-2.5 text-center font-bold text-black">{it.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-black font-semibold">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-2.5 text-right font-mono font-black text-black">{formatCurrency(it.quantity * it.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="p-4 bg-gray-50 border-t-2 border-black space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Total Qty / إجمالي الكمية:</span>
            <span className="font-mono text-black">{totalQuantity}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-gray-700">
            <span>Subtotal / المجموع الفرعي:</span>
            <span className="font-mono text-black">{formatCurrency(order.amount || 0)}</span>
          </div>
          {discountVal > 0 && (
            <div className="flex justify-between text-xs font-black text-red-600">
              <span>Discount / الخصم:</span>
              <span className="font-mono">-{formatCurrency(discountVal)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Tax ({order.taxRate || 0}%) / الضريبة:</span>
              <span className="font-mono text-black">{formatCurrency(order.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-black border-t-2 border-b-2 border-black py-2 mt-2">
            <span>Total Amount / إجمالي السعر:</span>
            <span className="font-mono">{formatCurrency(displayTotal)}</span>
          </div>
          <div className="flex justify-between text-xs font-black text-green-700 pt-1">
            <span>Paid Amount / المبلغ المدفوع:</span>
            <span className="font-mono">{formatCurrency(paidVal)}</span>
          </div>
          <div className="flex justify-between text-xs font-black text-red-600">
            <span>Remaining Balance / المتبقي:</span>
            <span className="font-mono">{formatCurrency(balanceVal)}</span>
          </div>
        </div>

        {/* Live QR Verification Badge & Footer */}
        <div className="p-5 text-center bg-white border-t border-dashed border-gray-300">
          <div className="mb-3 inline-block p-2 bg-white rounded-xl shadow-md border border-gray-200">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getReceiptUrl(order.number || '', order))}`} 
              alt="Invoice QR" 
              className="w-28 h-28 mx-auto block" 
            />
            <div className="text-[10px] font-black text-gray-700 mt-1">Scan to View Live / امسح للعرض</div>
          </div>
          <p className="font-black text-black text-xs">Thank you for choosing Tuhama laundry co.!</p>
          <p className="font-black text-black text-xs mt-0.5" dir="rtl">شكراً لاختياركم تهامة برو!</p>
        </div>
      </div>
    </div>
  );
};

export default PublicReceipt;
