import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { formatCurrency, getDisplayTotal, getReceiptUrl, findReceiptOrder, decodeReceiptData, getExpectedDeliveryInfo, formatInvoiceDateTime } from '../../utils/exportUtils';
import { getBilingualGarmentNames } from '../../utils/garmentTranslations';

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
    const urlData = decodeReceiptData(location.search, location.hash);
    if (urlData && urlData.number) {
      setOrder(urlData);
      setLoading(false);
      return;
    }
    const foundOrder = findReceiptOrder(id, []);
    setOrder(foundOrder);
    setLoading(false);
  }, [id, location.search, location.hash]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><p className="text-gray-500">Loading invoice...</p></div>;
  }

  if (!order) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Invoice Not Found</h2>
        <p className="text-gray-600 mb-6 max-w-sm">
          We couldn't find an invoice with the number <strong>{id}</strong>.
          If you just scanned this, the order data might only be saved on the shop's local computer.
        </p>
        <Link to="/" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium">Go to Homepage</Link>
      </div>
    );
  }

  const translatedPayment = translatePaymentStatus(order.paymentStatus);
  const translatedBranch = translateBranch(order.branchId || order.branch);
  const translatedService = translateService(order.serviceType);
  const expectedDeliveryInfo = getExpectedDeliveryInfo(order);
  const displayTotal = getDisplayTotal(order);

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 flex justify-center font-sans text-gray-900">
      <div className="bg-white w-full max-w-md border-2 border-black shadow-lg rounded-xl overflow-hidden print:shadow-none print:w-full print:max-w-none">
        {/* Header */}
        <div className="p-6 border-b-2 border-blue-600 text-center bg-blue-50/30 flex flex-col items-center">
          <img src="/logo.png" alt="Tuhama Logo" className="w-16 h-16 object-contain rounded-2xl mb-3 shadow-md" />
          <h1 className="text-2xl font-black text-blue-600 tracking-wide uppercase m-0">Tuhama laundry co.</h1>
          <h2 className="text-xl font-bold text-blue-600 mt-1 mb-2">تهامة برو</h2>
          <div className="text-xs font-bold text-gray-800 uppercase tracking-widest">
            Invoice - فاتورة
          </div>
        </div>

        {/* Info Section */}
        <div className="p-5 border-b border-dashed border-gray-300 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Invoice / رقم الفاتورة:</span>
            <span className="font-semibold text-gray-900">{order.number || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Date / التاريخ:</span>
            <span className="font-semibold text-gray-900">{formatInvoiceDateTime(order)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Branch / الفرع:</span>
            <span className="font-semibold text-gray-900 text-right">
              {translatedBranch.en}
              {translatedBranch.ar && translatedBranch.ar.toLowerCase() !== translatedBranch.en.toLowerCase() && (
                <> <br/> <span dir="rtl" className="text-gray-600 text-xs">{translatedBranch.ar}</span></>
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Customer / العميل:</span>
            <span className="font-semibold text-gray-900">{order.customerName || 'N/A'}</span>
          </div>
          {order.isSubscriber && (
            <div className="flex justify-between text-sm bg-amber-100 border border-amber-400 p-2 rounded-lg my-1 text-amber-900 font-extrabold">
              <span>Subscriber Status / الاشتراك:</span>
              <span className="text-amber-800 font-extrabold text-base">⭐</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Staff / الموظف:</span>
            <span className="font-semibold text-gray-900">{order.staffName || order.createdBy || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Service Type / نوع الخدمة:</span>
            <span className="font-semibold text-gray-900 text-right">
              {translatedService.en} <br/> <span dir="rtl" className="text-gray-600 text-xs">{translatedService.ar}</span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Expected Delivery / التسليم المتوقع:</span>
            <span className="font-semibold text-gray-900 text-right">
              {expectedDeliveryInfo.date ? (
                <>
                  {expectedDeliveryInfo.date} <br/>
                </>
              ) : null}
              <span dir="rtl" className="text-gray-600 text-xs">({expectedDeliveryInfo.timeEn} / {expectedDeliveryInfo.timeAr})</span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Status / الدفع:</span>
            <span className={`font-semibold text-right ${order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>
              {translatedPayment.en} <br/> <span dir="rtl" className="text-xs">{translatedPayment.ar}</span>
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="py-2 text-xs font-bold uppercase text-gray-800 w-1/2">Item<br/>الصنف</th>
                <th className="py-2 text-xs font-bold uppercase text-gray-800 text-center w-1/6">Qty<br/>الكمية</th>
                <th className="py-2 text-xs font-bold uppercase text-gray-800 text-right w-1/6">Price<br/>السعر</th>
                <th className="py-2 text-xs font-bold uppercase text-gray-800 text-right w-1/6">Total<br/>الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
                  <tr key={idx} className="text-sm">
                    <td className="py-3">
                      {itemEn && <div className="font-bold text-gray-900">{itemEn}</div>}
                      {itemAr && <div className="text-xs text-gray-500 text-right pr-2" dir="rtl">{itemAr}</div>}
                      {it.notes && (
                        <div className="text-[10px] text-gray-500 italic mt-0.5">Note: {it.notes}</div>
                      )}
                    </td>
                    <td className="py-3 text-center font-bold text-gray-700">{it.quantity}</td>
                    <td className="py-3 text-right font-mono text-gray-600 text-xs">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-3 text-right font-mono font-bold text-gray-900">{formatCurrency(it.quantity * it.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-5 bg-gray-50 border-t border-dashed border-gray-300">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Subtotal / المجموع الفرعي:</span>
            <span className="font-mono">{formatCurrency(order.amount || 0)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm font-bold text-red-500 mb-2">
              <span>Discount / الخصم:</span>
              <span className="font-mono">-{formatCurrency(order.discount)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600 mb-3">
              <span>Tax ({order.taxRate || 0}%) / الضريبة:</span>
              <span className="font-mono">{formatCurrency(order.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-black text-gray-900 border-t-2 border-gray-800 pt-3 mt-1">
            <span>Total Amount / إجمالي السعر:</span>
            <span className="font-mono">{formatCurrency(displayTotal)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center bg-white">
          <div className="mb-6 inline-block p-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getReceiptUrl(order.number || '', order))}`} 
              alt="Invoice QR" 
              className="w-32 h-32 mx-auto" 
            />
          </div>
          <p className="font-bold text-gray-800 text-sm">Thank you for choosing Tuhama laundry co.!</p>
          <p className="font-bold text-gray-800 text-sm mt-1" dir="rtl">شكراً لاختياركم تهامة برو!</p>
        </div>
      </div>
    </div>
  );
};

export default PublicReceipt;
