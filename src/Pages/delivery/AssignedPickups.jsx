import React, { useContext, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import PickupTable from '../../Components/delivery/PickupTable';
import DeliveryDetailsModal from '../../Components/delivery/DeliveryDetailsModal';

const AssignedPickups = () => {
  const { pickups, orders, customers = [], updatePickupStatus } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const staffName = storedUser?.name || '';
  const staffUsername = storedUser?.username || '';

  const filtered = useMemo(
    () =>
      pickups
        .filter((p) => {
          const assigned = (p.assignedStaff || '').trim().toLowerCase();
          if (!assigned) return false;
          const targetName = staffName.trim().toLowerCase();
          const targetUsername = staffUsername.trim().toLowerCase();
          return (
            (targetName && (assigned === targetName || assigned.includes(targetName) || targetName.includes(assigned))) ||
            (targetUsername && (assigned === targetUsername || assigned.includes(targetUsername) || targetUsername.includes(assigned)))
          );
        })
        .filter(
          (p) =>
            p.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.pickupId || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(p => {
          const order = p.orderNumber ? orders.find(o => o.number === p.orderNumber) : null;
          const customerMatch = customers.find(c => 
            (c.name && p.customer && c.name.trim().toLowerCase() === p.customer.trim().toLowerCase()) ||
            (c.phone && p.contactNumber && c.phone === p.contactNumber) ||
            (order && (c._id === order.customer || c.id === order.customer || c.id === order.customerId || c._id === order.customerId))
          );

          return {
            ...p,
            areaName: p.areaName || customerMatch?.areaName || order?.areaName || '',
            partNo: p.partNo || customerMatch?.partNo || order?.partNo || '',
            street: p.street || customerMatch?.street || order?.street || '',
            jadda: p.jadda || customerMatch?.jadda || order?.jadda || '',
            houseNo: p.houseNo || customerMatch?.houseNo || order?.houseNo || '',
            levelNo: p.levelNo || customerMatch?.levelNo || order?.levelNo || '',
            flatNo: p.flatNo || customerMatch?.flatNo || order?.flatNo || '',
            paciNo: p.paciNo || customerMatch?.paciNo || order?.paciNo || '',
            serviceType: order ? order.serviceType : p.serviceType
          };
        })
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return String(b.pickupId || '').localeCompare(String(a.pickupId || ''), undefined, { numeric: true, sensitivity: 'base' });
        }),
    [pickups, orders, customers, searchTerm, staffName, staffUsername]
  );

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Delivery Staff</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Assigned Pickups</h1>
          <p className="mt-2 text-sm text-secondary">View details and update pickup status.</p>
        </div>
      </section>

      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Search pickups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary"
        />
      </div>

      <section className="surface-card border border-border overflow-hidden">
        <PickupTable
          pickups={filtered}
          onView={(p) => {
            setSelected(p);
            setShowModal(true);
          }}
          onUpdateStatus={(p) => {
            setSelected(p);
            setShowModal(true);
          }}
        />
      </section>

      <DeliveryDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        job={selected}
        type="pickup"
        onUpdateStatus={(id, status) => {
          updatePickupStatus(id, status);
          toast.success('Pickup status updated');
        }}
      />
    </div>
  );
};

export default AssignedPickups;
