import React, { useContext, useState, useMemo } from 'react';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiChevronDown } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import ReusableTable from '../../Components/ReusableTable';
import Modal from '../../Components/Modal';
import { toast } from 'react-toastify';

const categories = ['Washing', 'Ironing', 'Dry Cleaning', 'Wash & Iron', 'Premium Care'];

const emptyServiceForm = {
  name: 'Normal',
  category: 'Washing',
  estimatedTime: '24 hours',
  status: 'Active',
  description: '',
};

const LaundryServices = () => {
  const { services, addService, updateService, deleteService } = useContext(AdminStateContext);
  
  // Role check to allow only Super Admin to Add, Edit, or Delete laundry services
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = storedUser?.role === 'Super Admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedService, setSelectedService] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(emptyServiceForm);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  const categoryOptions = ['All', ...categories];

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || service.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || service.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [services, searchTerm, categoryFilter, statusFilter]);

  const servicesWithDisplayId = useMemo(() => {
    return filteredServices.map((service, index) => ({
      ...service,
      displayId: index + 1
    }));
  }, [filteredServices]);

  const handleViewService = (service) => {
    setSelectedService(service);
    setShowModal(true);
  };

  const handleAddService = () => {
    setFormData(emptyServiceForm);
    setIsEditing(false);
    setShowFormModal(true);
  };

  const handleEdit = (service) => {
    let displayName = service.name;
    if (service.name.startsWith('Express ')) {
      displayName = 'Express';
    } else if (service.name.startsWith('Normal ')) {
      displayName = 'Normal';
    }
    setFormData({
      id: service.id,
      name: displayName,
      category: service.category,
      estimatedTime: service.estimatedTime,
      status: service.status,
      description: service.description || '',
    });
    setIsEditing(true);
    setShowFormModal(true);
    setShowModal(false);
  };

  const handleDelete = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (serviceToDelete) {
      const success = await deleteService(serviceToDelete.id);
      if (success) {
        setShowModal(false);
      }
      setShowDeleteModal(false);
      setServiceToDelete(null);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveService = async () => {
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    const finalServiceName = (formData.name === 'Express' || formData.name === 'Normal')
      ? `${formData.name} ${formData.category}`
      : formData.name;

    const existingService = isEditing ? services.find((s) => s.id === formData.id) : null;

    const payload = {
      name: finalServiceName.trim(),
      category: formData.category,
      price: existingService?.price ?? 0,
      estimatedTime: formData.estimatedTime,
      status: formData.status,
      description: formData.description,
    };

    if (isEditing) {
      await updateService(formData.id, payload);
    } else {
      await addService(payload);
    }

    setShowFormModal(false);
    setFormData(emptyServiceForm);
  };

  const tableColumns = [
    { header: 'ID', accessor: 'displayId' },
    { header: 'Service Name', accessor: 'name' },
    { header: 'Category', accessor: 'category' },
    { header: 'Est. Time', accessor: 'estimatedTime' },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusClass =
          row.status === 'Active'
            ? 'status-pill bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
            : 'status-pill bg-amber-500/10 text-amber-600 border-amber-500/15';
        return <span className={statusClass}>{row.status}</span>;
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button type="button" className="icon-button-small" onClick={() => handleViewService(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          {isSuperAdmin && (
            <>
              <button type="button" className="icon-button-small" onClick={() => handleEdit(row)} aria-label="Edit">
                <FiEdit2 size={16} />
              </button>
              <button
                type="button"
                className="icon-button-small text-rose-600"
                onClick={() => handleDelete(row)}
                aria-label="Delete"
              >
                <FiTrash2 size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Service Management</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">Laundry Services</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">Manage service categories and pricing.</p>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleAddService}
                className="dashboard-hero-pill btn-solid-primary flex w-full items-center justify-center gap-2 md:w-auto"
              >
                <FiPlus size={18} />
                <span className="font-semibold">Add Service</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">All Services</h2>
            <p className="text-sm text-secondary">Total: {filteredServices.length} services</p>
          </div>
        </div>
        <div className="mt-5">
          <ReusableTable columns={tableColumns} data={servicesWithDisplayId} onRowClick={handleViewService} />
        </div>
      </section>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Service Details" size="lg">
        {selectedService && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Service Name</p>
                <p className="mt-1 font-semibold text-primary">{selectedService.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Category</p>
                <p className="mt-1 font-semibold text-primary">{selectedService.category}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Estimated Time</p>
                <p className="mt-1 font-semibold text-primary">{selectedService.estimatedTime}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Description</p>
                <p className="mt-1 text-primary">{selectedService.description || 'N/A'}</p>
              </div>
            </div>
            <div className="flex gap-3 border-t border-border pt-4">
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => handleEdit(selectedService)}
                  className="btn-solid-primary flex-1 rounded-xl py-2 font-semibold transition"
                >
                  Edit Service
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-border bg-surface py-2 font-semibold text-primary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={isEditing ? 'Edit Service' : 'Add Service'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-primary">Service Name *</label>
              <select
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
                required
              >
                <option value="Normal">Normal</option>
                <option value="Express">Express</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Estimated Time</label>
              <input
                type="text"
                name="estimatedTime"
                value={formData.estimatedTime}
                onChange={handleFormChange}
                placeholder="e.g. 24 hours"
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-primary">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows={3}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary"
              />
            </div>
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleSaveService}
              className="btn-solid-primary flex-1 rounded-lg py-2 font-semibold transition"
            >
              {isEditing ? 'Update Service' : 'Add Service'}
            </button>
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="flex-1 rounded-lg border border-border bg-surface py-2 font-semibold text-primary hover:bg-surface-alt"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setServiceToDelete(null); }}
        title="Delete Service"
        size="sm"
      >
        <div className="space-y-6 text-center">
          <p className="text-secondary text-sm">
            Are you sure you want to delete <span className="font-semibold text-primary">{serviceToDelete?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setServiceToDelete(null); }}
              className="flex-1 rounded-xl border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="flex-1 rounded-xl bg-rose-600 py-2 font-semibold text-white transition hover:bg-rose-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LaundryServices;
