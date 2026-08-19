import React, { useContext, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import PickupTable from '../../Components/delivery/PickupTable';
import DeliveryDetailsModal from '../../Components/delivery/DeliveryDetailsModal';

const DEFAULT_STAFF = 'Frank Brown';

const AssignedPickups = () => {
  const { pickups, orders, updatePickupStatus } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const staffName = storedUser?.name || DEFAULT_STAFF;

  const filtered = useMemo(
    () =>
      pickups
        .filter((p) => {
          if (!staffName) return true;
          const assigned = (p.assignedStaff || '').toLowerCase();
          const target = (staffName || '').toLowerCase();
          return !assigned || assigned === target || assigned.includes(target) || target.includes(assigned);
        })
        .filter(
          (p) =>
            p.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.pickupId || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(p => {
          // If pickup has an orderNumber, find the order to get serviceType
          const order = p.orderNumber ? orders.find(o => o.number === p.orderNumber) : null;
          return {
            ...p,
            serviceType: order ? order.serviceType : p.serviceType
          };
        })
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return String(b.pickupId || '').localeCompare(String(a.pickupId || ''), undefined, { numeric: true, sensitivity: 'base' });
        }),
    [pickups, orders, searchTerm, staffName]
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
