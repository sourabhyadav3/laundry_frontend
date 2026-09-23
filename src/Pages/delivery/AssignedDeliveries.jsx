import React, { useContext, useMemo, useState } from 'react';
import { FiSearch, FiPrinter } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../utils/exportUtils';
import DeliveryTable from '../../Components/delivery/DeliveryTable';
import DeliveryDetailsModal from '../../Components/delivery/DeliveryDetailsModal';

const formatDeliveryAddress = (row, isAr) => {
  const parts = [];
  if (isAr) {
    if (row.areaName) parts.push(`المنطقة: ${row.areaName}`);
    if (row.partNo) parts.push(`قطعة: ${row.partNo}`);
    if (row.street) parts.push(`الشارع: ${row.street}`);
    if (row.jadda) parts.push(`الجادة: ${row.jadda}`);
    if (row.houseNo) parts.push(`المنزل: ${row.houseNo}`);
    if (row.levelNo) parts.push(`الطابق: ${row.levelNo}`);
    if (row.flatNo) parts.push(`الشقة: ${row.flatNo}`);
    if (row.paciNo) parts.push(`الرقم الآلي (PACI): ${row.paciNo}`);
    if (parts.length === 0 && row.address) parts.push(row.address);
    return parts.join(' | ') || 'Salmiya';
  }

  if (row.areaName) parts.push(`Area: ${row.areaName}`);
  if (row.partNo) parts.push(`Block: ${row.partNo}`);
  if (row.street) parts.push(`S: ${row.street}`);
  if (row.jadda) parts.push(`Jadah: ${row.jadda}`);
  if (row.houseNo) parts.push(`House: ${row.houseNo}`);
  if (row.levelNo) parts.push(`F: ${row.levelNo}`);
  if (row.flatNo) parts.push(`Flat: ${row.flatNo}`);
  if (row.paciNo) parts.push(`PACI: ${row.paciNo}`);
  if (parts.length === 0 && row.address) parts.push(row.address);
  return parts.join(' | ') || 'Salmiya';
};

const AssignedDeliveries = () => {
  const { deliveries, orders, customers = [], updateDeliveryStatus } = useContext(AdminStateContext);
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const staffName = storedUser?.name || '';
  const staffUsername = storedUser?.username || '';
  const isAr = language === 'ar';

  const filtered = useMemo(
    () =>
      deliveries
        .filter((d) => {
          const assigned = (d.assignedStaff || '').trim().toLowerCase();
          if (!assigned) return false;
          const targetName = staffName.trim().toLowerCase();
          const targetUsername = staffUsername.trim().toLowerCase();
          return (
            (targetName && (assigned === targetName || assigned.includes(targetName) || targetName.includes(assigned))) ||
            (targetUsername && (assigned === targetUsername || assigned.includes(targetUsername) || targetUsername.includes(assigned)))
          );
        })
        .filter(
          (d) =>
            d.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.deliveryId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(d => {
          const order = d.orderNumber ? orders.find(o => o.number === d.orderNumber) : null;
          const customerMatch = customers.find(c => 
            (c.name && d.customer && c.name.trim().toLowerCase() === d.customer.trim().toLowerCase()) ||
            (c.phone && d.contactNumber && c.phone === d.contactNumber) ||
            (order && (c._id === order.customer || c.id === order.customer || c.id === order.customerId || c._id === order.customerId))
          );

          return {
            ...d,
            areaName: d.areaName || customerMatch?.areaName || order?.areaName || '',
            partNo: d.partNo || customerMatch?.partNo || order?.partNo || '',
            street: d.street || customerMatch?.street || order?.street || '',
            jadda: d.jadda || customerMatch?.jadda || order?.jadda || '',
            houseNo: d.houseNo || customerMatch?.houseNo || order?.houseNo || '',
            levelNo: d.levelNo || customerMatch?.levelNo || order?.levelNo || '',
            flatNo: d.flatNo || customerMatch?.flatNo || order?.flatNo || '',
            paciNo: d.paciNo || customerMatch?.paciNo || order?.paciNo || '',
            serviceType: order ? order.serviceType : d.serviceType
          };
        })
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return String(b.deliveryId || '').localeCompare(String(a.deliveryId || ''), undefined, { numeric: true, sensitivity: 'base' });
        }),
    [deliveries, orders, customers, searchTerm, staffName, staffUsername]
  );

  const handlePrintList = () => {
    if (filtered.length === 0) {
      toast.warning(t('delivery.noDeliveriesToPrint') || 'No deliveries to print');
      return;
    }

    const rowsHtml = filtered
      .map(
        (d, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${d.deliveryId || 'N/A'}</td>
          <td>${d.orderNumber || 'N/A'}</td>
          <td>${d.customer || 'N/A'}</td>
          <td class="address">${formatDeliveryAddress(d, isAr)}</td>
          <td>${d.contactNumber || 'N/A'}</td>
          <td>${formatDate(d.deliveryDate) || 'N/A'}</td>
          <td>${d.status || 'Assigned'}</td>
        </tr>
      `
      )
      .join('');

    const title = t('delivery.assignedDeliveriesList') || 'Assigned Deliveries List';
    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; color: #1e3a8a; }
            .header-meta { margin-top: 10px; font-size: 13px; display: flex; flex-wrap: wrap; gap: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #eff6ff; color: #1e3a8a; font-weight: 700; }
            tr:nth-child(even) { background: #f8fafc; }
            .address { max-width: 280px; line-height: 1.4; }
            @media print {
              body { padding: 0; }
              @page { margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <div class="header-meta">
              <span><strong>${isAr ? 'الفرع' : 'Branch'}:</strong> ${storedUser.branchName || 'All'}</span>
              <span><strong>${isAr ? 'المندوب' : 'Staff'}:</strong> ${staffName}</span>
              <span><strong>${isAr ? 'الإجمالي' : 'Total'}:</strong> ${filtered.length}</span>
              <span><strong>${isAr ? 'التاريخ' : 'Date'}:</strong> ${new Date().toLocaleDateString(isAr ? 'ar-KW' : 'en-GB')}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${isAr ? 'رقم التوصيل' : 'Delivery ID'}</th>
                <th>${isAr ? 'رقم الفاتورة' : 'Invoice No.'}</th>
                <th>${isAr ? 'اسم العميل' : 'Customer Name'}</th>
                <th>${isAr ? 'العنوان' : 'Address'}</th>
                <th>${isAr ? 'رقم الاتصال' : 'Contact Number'}</th>
                <th>${isAr ? 'تاريخ التوصيل' : 'Delivery Date'}</th>
                <th>${isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
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

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Delivery Staff</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">
            {t('delivery.assignedDeliveries') || 'Assigned Deliveries'}
          </h1>
          <p className="mt-2 text-sm text-secondary">View details and update delivery status.</p>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search deliveries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary"
          />
        </div>
        <button
          type="button"
          onClick={handlePrintList}
          className="flex items-center justify-center gap-2 shrink-0 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold transition shadow-sm"
        >
          <FiPrinter size={18} />
          {t('delivery.printList') || 'Print List'}
        </button>
      </div>

      <section className="surface-card border border-border overflow-hidden">
        <DeliveryTable
          deliveries={filtered}
          onView={(d) => {
            setSelected(d);
            setShowModal(true);
          }}
          onUpdateStatus={(d) => {
            setSelected(d);
            setShowModal(true);
          }}
        />
      </section>

      <DeliveryDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        job={selected}
        type="delivery"
        onUpdateStatus={(id, status, extra) => {
          updateDeliveryStatus(id, status, extra);
          toast.success('Delivery status updated');
        }}
      />
    </div>
  );
};

export default AssignedDeliveries;
