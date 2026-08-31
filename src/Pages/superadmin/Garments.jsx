import React, { useContext, useState, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../../Components/Modal';
import { formatCurrency } from '../../utils/exportUtils';

const CATEGORIES = [
  { id: 'all', label: 'All Categories / جميع الأصناف' },
  { id: 'traditional', label: 'Traditional / أزياء تقليدية' },
  { id: 'casual', label: 'Casual & Daily / ملابس يومية' },
  { id: 'outerwear', label: 'Jackets & Outerwear / جاكيتات ومعاطف' },
  { id: 'household', label: 'Household & Bedding / مفروشات' },
  { id: 'special', label: 'Special & Formal / فساتين ومناسبات' },
  { id: 'custom', label: 'Custom / مخصص' },
];

const POPULAR_ICONS = ['👕', '🥋', '👔', '👖', '👗', '🧥', '👘', '👚', '🧕', '👳', '🧣', '🧢', '🧹', '🪟', '🛏️', '👰', '🎖️', '🤵', '🧤', '🧦'];

const EMPTY_GARMENT_FORM = {
  name: '',
  nameAr: '',
  key: '',
  category: 'casual',
  icon: '👕',
  color: '#3b82f6',
  price: '',
  prices: {
    normalService: '',
    ironOnlyService: '',
    urgentService: '',
    expressIronService: '',
    dryCleanService: '',
  },
  image: null,
  hasSizes: false,
  sizes: [],
};

const SuperAdminGarments = () => {
  const { catalog, services, addCatalogItem, updateCatalogItem, deleteCatalogItem } = useContext(AdminStateContext);
  const { language } = useLanguage();

  // Active Laundry Services from Laundry Services menu
  const activeServices = useMemo(() => {
    if (Array.isArray(services) && services.length > 0) {
      const active = services.filter((s) => s.status !== 'Inactive');
      if (active.length > 0) return active;
    }
    return [
      { id: '1', name: 'Wash & Fold', category: 'Washing', status: 'Active' },
      { id: '2', name: 'Express Ironing', category: 'Ironing', status: 'Active' },
      { id: '3', name: 'Express Wash & Iron', category: 'Wash & Iron', status: 'Active' },
      { id: '4', name: 'Wash & Iron', category: 'Wash & Iron', status: 'Active' },
    ];
  }, [services]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentGarment, setCurrentGarment] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_GARMENT_FORM });

  // Price helper function to extract distinct price for each specific service name
  const getServicePriceValue = (prices, serviceName) => {
    if (!prices || typeof prices !== 'object') return '';
    // 1. Exact match with service name key
    if (prices[serviceName] !== undefined && prices[serviceName] !== '') return prices[serviceName];
    
    // 2. Case-insensitive / trimmed match
    const target = String(serviceName || '').trim().toLowerCase();
    const matchKey = Object.keys(prices).find((k) => k.trim().toLowerCase() === target);
    if (matchKey && prices[matchKey] !== undefined && prices[matchKey] !== '') {
      return prices[matchKey];
    }

    // 3. Exact service mapping (strict, non-colliding)
    if (target === 'wash & fold' || target.includes('fold')) {
      return prices['Wash & Fold'] !== undefined && prices['Wash & Fold'] !== ''
        ? prices['Wash & Fold']
        : (prices.washFold ?? prices.washAndFold ?? '');
    }
    if (target === 'wash & iron') {
      return prices['Wash & Iron'] !== undefined && prices['Wash & Iron'] !== ''
        ? prices['Wash & Iron']
        : (prices.normalWashIron ?? prices.normalService ?? '');
    }
    if (target === 'express wash & iron') {
      return prices['Express Wash & Iron'] !== undefined && prices['Express Wash & Iron'] !== ''
        ? prices['Express Wash & Iron']
        : (prices.expressWashIron ?? prices.urgentService ?? '');
    }
    if (target === 'express ironing') {
      return prices['Express Ironing'] !== undefined && prices['Express Ironing'] !== ''
        ? prices['Express Ironing']
        : (prices.expressIroning ?? prices.expressIronService ?? prices.ironOnlyService ?? '');
    }
    if (target.includes('dry clean')) {
      return prices['Dry Clean'] ?? prices['Dry Cleaning'] ?? prices.dryCleanService ?? '';
    }

    return prices[serviceName] || '';
  };

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return (catalog || []).filter((g) => {
      const matchSearch =
        !searchTerm ||
        (g.name && g.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (g.nameAr && g.nameAr.includes(searchTerm)) ||
        (g.key && g.key.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || g.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [catalog, searchTerm, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const list = catalog || [];
    const withImages = list.filter((g) => !!g.image).length;
    const uniqueCategories = new Set(list.map((g) => g.category || 'other')).size;
    return {
      total: list.length,
      withImages,
      categories: uniqueCategories,
    };
  }, [catalog]);

  const handleOpenAdd = () => {
    const initialPrices = {};
    activeServices.forEach((svc) => {
      initialPrices[svc.name] = '';
    });
    setFormData({
      ...EMPTY_GARMENT_FORM,
      prices: initialPrices,
      sizes: [],
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (g) => {
    setCurrentGarment(g);
    const existingPrices = {};
    activeServices.forEach((svc) => {
      const val = getServicePriceValue(g.prices, svc.name);
      existingPrices[svc.name] = val !== '' ? val : (g.price !== undefined && g.price !== '' ? g.price : '');
    });

    setFormData({
      name: g.name || '',
      nameAr: g.nameAr || '',
      key: g.key || '',
      category: g.category || 'casual',
      icon: g.icon || '👕',
      color: g.color || '#3b82f6',
      price: g.price || '',
      prices: {
        ...(g.prices || {}),
        ...existingPrices,
      },
      image: g.image || null,
      hasSizes: Boolean(g.hasSizes),
      sizes: Array.isArray(g.sizes) ? [...g.sizes] : [],
    });
    setShowEditModal(true);
  };

  const handleOpenDelete = (g) => {
    setCurrentGarment(g);
    setShowDeleteModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePriceChange = (serviceName, value) => {
    setFormData((prev) => ({
      ...prev,
      prices: {
        ...prev.prices,
        [serviceName]: value,
      },
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('Image is too large. Please select an image under 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSize = () => {
    setFormData((prev) => ({
      ...prev,
      sizes: [...(prev.sizes || []), { label: '', price: '' }],
    }));
  };

  const handleRemoveSize = (idx) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== idx),
    }));
  };

  const handleSizeChange = (idx, field, value) => {
    setFormData((prev) => {
      const copy = [...prev.sizes];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, sizes: copy };
    });
  };

  const handleSaveAdd = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const name = formData.name?.trim();
    if (!name) {
      toast.error('Garment English Name is required');
      return;
    }

    const firstPriceVal = Object.values(formData.prices || {}).find(v => v !== '' && Number(v) > 0);
    const basePrice = Number(firstPriceVal || formData.price || 0);
    const key = (formData.key?.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now());

    // Build unified prices object keeping every service distinct
    const syncedPrices = { ...formData.prices };
    activeServices.forEach(svc => {
      const val = formData.prices?.[svc.name];
      if (val !== undefined && val !== '') {
        syncedPrices[svc.name] = Number(val);
      }
    });

    // Provide legacy fallbacks for standard services
    if (formData.prices?.['Wash & Iron'] !== undefined && formData.prices?.['Wash & Iron'] !== '') {
      syncedPrices.normalWashIron = Number(formData.prices['Wash & Iron']);
      syncedPrices.normalService = Number(formData.prices['Wash & Iron']);
    }
    if (formData.prices?.['Wash & Fold'] !== undefined && formData.prices?.['Wash & Fold'] !== '') {
      syncedPrices.washFold = Number(formData.prices['Wash & Fold']);
    }
    if (formData.prices?.['Express Wash & Iron'] !== undefined && formData.prices?.['Express Wash & Iron'] !== '') {
      syncedPrices.expressWashIron = Number(formData.prices['Express Wash & Iron']);
      syncedPrices.urgentService = Number(formData.prices['Express Wash & Iron']);
    }
    if (formData.prices?.['Express Ironing'] !== undefined && formData.prices?.['Express Ironing'] !== '') {
      syncedPrices.expressIroning = Number(formData.prices['Express Ironing']);
      syncedPrices.expressIronService = Number(formData.prices['Express Ironing']);
      syncedPrices.normalIroning = Number(formData.prices['Express Ironing']);
      syncedPrices.ironOnlyService = Number(formData.prices['Express Ironing']);
    }

    const payload = {
      ...formData,
      name,
      nameAr: formData.nameAr?.trim() || '',
      key,
      price: basePrice,
      prices: syncedPrices,
      sizes: formData.hasSizes ? formData.sizes.filter((s) => s.label.trim()) : [],
    };

    try {
      const res = await addCatalogItem(payload);
      if (res !== false) {
        toast.success(`Garment "${name}" added to catalog successfully`);
        setShowAddModal(false);
      }
    } catch (err) {
      toast.error('Failed to add garment');
    }
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentGarment) return;
    const name = formData.name?.trim();
    if (!name) {
      toast.error('Garment Name is required');
      return;
    }

    const firstPriceVal = Object.values(formData.prices || {}).find(v => v !== '' && Number(v) > 0);
    const basePrice = Number(firstPriceVal || formData.price || 0);

    // Build unified prices object keeping every service distinct
    const syncedPrices = { ...(currentGarment.prices || {}), ...formData.prices };
    activeServices.forEach(svc => {
      const val = formData.prices?.[svc.name];
      if (val !== undefined && val !== '') {
        syncedPrices[svc.name] = Number(val);
      }
    });

    // Provide legacy fallbacks for standard services
    if (formData.prices?.['Wash & Iron'] !== undefined && formData.prices?.['Wash & Iron'] !== '') {
      syncedPrices.normalWashIron = Number(formData.prices['Wash & Iron']);
      syncedPrices.normalService = Number(formData.prices['Wash & Iron']);
    }
    if (formData.prices?.['Wash & Fold'] !== undefined && formData.prices?.['Wash & Fold'] !== '') {
      syncedPrices.washFold = Number(formData.prices['Wash & Fold']);
    }
    if (formData.prices?.['Express Wash & Iron'] !== undefined && formData.prices?.['Express Wash & Iron'] !== '') {
      syncedPrices.expressWashIron = Number(formData.prices['Express Wash & Iron']);
      syncedPrices.urgentService = Number(formData.prices['Express Wash & Iron']);
    }
    if (formData.prices?.['Express Ironing'] !== undefined && formData.prices?.['Express Ironing'] !== '') {
      syncedPrices.expressIroning = Number(formData.prices['Express Ironing']);
      syncedPrices.expressIronService = Number(formData.prices['Express Ironing']);
      syncedPrices.normalIroning = Number(formData.prices['Express Ironing']);
      syncedPrices.ironOnlyService = Number(formData.prices['Express Ironing']);
    }

    const payload = {
      ...formData,
      name,
      nameAr: formData.nameAr?.trim() || '',
      price: basePrice,
      prices: syncedPrices,
      sizes: formData.hasSizes ? formData.sizes.filter((s) => s.label.trim()) : [],
    };

    try {
      const targetKey = currentGarment.key || currentGarment.name;
      const res = await updateCatalogItem(targetKey, payload);
      if (res !== false) {
        toast.success(`Garment "${name}" updated successfully`);
        setShowEditModal(false);
      }
    } catch (err) {
      toast.error('Failed to update garment');
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentGarment) return;
    const targetKey = currentGarment.key || currentGarment.name;
    try {
      const res = await deleteCatalogItem(targetKey);
      if (res !== false) {
        toast.success(`Garment "${currentGarment.name}" deleted`);
        setShowDeleteModal(false);
      }
    } catch (err) {
      toast.error('Failed to delete garment');
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <section className="surface-card overflow-hidden border border-border shadow-xl rounded-3xl">
        <div className="dashboard-hero p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary font-bold">
                {language === 'ar' ? 'إدارة الكتالوج المركزي' : 'Super Admin Catalog Control'}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-primary flex items-center gap-3">
                <span>🥋</span>
                <span>{language === 'ar' ? 'إدارة الملابس والأسعار' : 'Garments & Catalog Management'}</span>
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs md:text-sm text-secondary">
                {language === 'ar'
                  ? 'إضافة وتعديل وحذف الملابس والأسعار والألوان والمقاسات للمغسلة وفروعها.'
                  : 'Centrally manage all laundry garment items, service rates, colors, multi-sizes, and custom icons.'}
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="btn-solid-primary flex items-center justify-center gap-2 px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/20 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FiPlus size={18} />
              <span>{language === 'ar' ? 'إضافة قطعة جديدة' : 'Add New Garment'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-card p-4 rounded-2xl border border-border flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl font-bold">
            👕
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-secondary tracking-wider">Total Garments</p>
            <p className="text-2xl font-extrabold text-primary">{stats.total}</p>
          </div>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-border flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl font-bold">
            🏷️
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-secondary tracking-wider">Categories</p>
            <p className="text-2xl font-extrabold text-primary">{stats.categories}</p>
          </div>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-border flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl font-bold">
            🖼️
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-secondary tracking-wider">Custom Photos</p>
            <p className="text-2xl font-extrabold text-primary">{stats.withImages}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="surface-card p-4 rounded-2xl border border-border space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" size={16} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث عن قطعة بالاسم أو الرمز...' : 'Search garment by name, arabic name, or code...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-secondary w-full md:w-auto justify-end">
            <span>Showing {filteredCatalog.length} of {catalog?.length || 0} items</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-surface-alt text-secondary hover:text-primary hover:bg-surface-alt/80 border border-border/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Garments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCatalog.map((garment, idx) => {
          const itemColor = garment.color || '#3b82f6';

          return (
            <div
              key={garment.key || garment.name || idx}
              className="surface-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-400/50 flex flex-col justify-between group relative overflow-hidden"
              style={{ borderTop: `4px solid ${itemColor}` }}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    {garment.image ? (
                      <img
                        src={garment.image}
                        alt={garment.name}
                        className="w-14 h-14 object-cover rounded-xl border border-border shadow-xs"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-xs"
                        style={{ backgroundColor: `${itemColor}15`, border: `1px solid ${itemColor}40` }}
                      >
                        {garment.icon || '👕'}
                      </div>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface shadow-xs"
                      style={{ backgroundColor: itemColor }}
                      title={`Color: ${itemColor}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary text-sm truncate" title={garment.name}>
                      {garment.name}
                    </h3>
                    {garment.nameAr && (
                      <p className="text-xs text-secondary font-arabic truncate" dir="rtl">
                        {garment.nameAr}
                      </p>
                    )}
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-alt text-secondary border border-border/50 uppercase">
                      {garment.category || 'casual'}
                    </span>
                  </div>
                </div>

                {/* Pricing Grid */}
                <div className="space-y-1.5 bg-surface-alt/70 p-2.5 rounded-xl border border-border/50 text-[11px] mb-3">
                  {activeServices.slice(0, 4).map((svc) => {
                    const priceVal = getServicePriceValue(garment.prices, svc.name);
                    const finalDisplayPrice = priceVal !== '' ? Number(priceVal) : (Number(garment.price) || 0);
                    return (
                      <div key={svc.id || svc.name} className="flex justify-between items-center">
                        <span className="text-secondary font-medium truncate max-w-[130px]" title={svc.name}>
                          {svc.name}:
                        </span>
                        <span className="font-mono font-bold text-primary">{formatCurrency(finalDisplayPrice)}</span>
                      </div>
                    );
                  })}
                  {activeServices.length > 4 && (
                    <div className="text-[10px] text-blue-500 font-bold text-right pt-0.5">
                      +{activeServices.length - 4} more services
                    </div>
                  )}
                  {garment.hasSizes && garment.sizes?.length > 0 && (
                    <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] text-blue-500 font-bold">
                      <span>Multi-Sizes ({garment.sizes.length}):</span>
                      <span>{garment.sizes.map((s) => s.label).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(garment)}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-surface-alt hover:bg-blue-500/10 text-primary hover:text-blue-500 border border-border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FiEdit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDelete(garment)}
                  className="py-1.5 px-2.5 rounded-xl bg-surface-alt hover:bg-rose-500/10 text-secondary hover:text-rose-500 border border-border text-xs font-bold transition flex items-center justify-center cursor-pointer"
                  title="Delete Garment"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCatalog.length === 0 && (
        <div className="text-center py-16 surface-card rounded-3xl border border-dashed border-border space-y-3">
          <span className="text-5xl">👕</span>
          <h3 className="text-base font-bold text-primary">No garments match your search</h3>
          <p className="text-xs text-secondary">Try adjusting the filter or add a new garment item.</p>
        </div>
      )}

      {/* ===== ADD / EDIT GARMENT MODAL ===== */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showEditModal ? 'Edit Garment / تعديل القطعة' : 'Add New Garment / إضافة قطعة جديدة'}
        size="lg"
      >
        <form onSubmit={showEditModal ? handleSaveEdit : handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">English Name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Dishdasha, Shirt, Military Suit"
                value={formData.name}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">Arabic Name (الاسم بالعربي)</label>
              <input
                type="text"
                name="nameAr"
                dir="rtl"
                placeholder="مثال: دشداشة، قميص، بدلة عسكرية"
                value={formData.nameAr}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-arabic"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-primary text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">Select Brand / Tag Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="color"
                  value={formData.color || '#3b82f6'}
                  onChange={handleFormChange}
                  className="w-10 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  name="color"
                  value={formData.color || '#3b82f6'}
                  onChange={handleFormChange}
                  className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Icon and Custom Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-surface-alt border border-border">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1.5">Pick Emoji / Icon</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-surface rounded-xl border border-border">
                {POPULAR_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition ${
                      formData.icon === icon ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-surface-alt'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">Custom Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {formData.image && (
                <div className="mt-2 relative inline-block">
                  <img src={formData.image} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-border" />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: null }))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Service Prices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-secondary uppercase">
                Service Prices / أسعار الخدمات (KWD)
              </label>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
                ⚡ Synced with Laundry Services ({activeServices.length} Active)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {activeServices.map((svc) => {
                const svcVal = formData.prices?.[svc.name] !== undefined ? formData.prices[svc.name] : getServicePriceValue(formData.prices, svc.name);
                return (
                  <div key={svc.id || svc.name} className="p-2.5 rounded-xl bg-surface-alt/70 border border-border/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-primary truncate" title={svc.name}>
                        {svc.name}
                      </label>
                      {svc.category && (
                        <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-surface text-secondary border border-border/40">
                          {svc.category}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.050"
                      min="0"
                      placeholder="0.000"
                      value={svcVal ?? ''}
                      onChange={(e) => handlePriceChange(svc.name, e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1 text-primary text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multiple Sizes */}
          <div className="border border-border rounded-2xl p-3 bg-surface-alt/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasSizesToggle"
                  name="hasSizes"
                  checked={formData.hasSizes}
                  onChange={handleFormChange}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="hasSizesToggle" className="text-xs font-bold text-primary cursor-pointer select-none">
                  Item Has Multiple Sizes (e.g. Small, Medium, Large, King, 2x3m)
                </label>
              </div>
              {formData.hasSizes && (
                <button
                  type="button"
                  onClick={handleAddSize}
                  className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  + Add Size
                </button>
              )}
            </div>

            {formData.hasSizes && (
              <div className="space-y-2 pt-2 border-t border-border">
                {formData.sizes?.map((size, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Size Label (e.g. Small, King, 3x4m)"
                      value={size.label}
                      onChange={(e) => handleSizeChange(idx, 'label', e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-primary"
                    />
                    <input
                      type="number"
                      step="0.050"
                      placeholder="Price (KWD)"
                      value={size.price}
                      onChange={(e) => handleSizeChange(idx, 'price', Number(e.target.value))}
                      className="w-28 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-mono text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSize(idx)}
                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-md transition"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex gap-3 pt-3 border-t border-border">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {showEditModal ? 'Save & Update Garment' : 'Create Garment'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
              className="px-5 py-2.5 rounded-xl border border-border bg-surface text-secondary hover:text-primary font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Garment / حذف القطعة"
        size="sm"
      >
        {currentGarment && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
              <span className="text-4xl">⚠️</span>
              <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Are you sure you want to delete "{currentGarment.name}"?
              </h4>
              <p className="text-xs text-secondary">
                This item will be removed from the active catalog across all admin and counter screens.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Yes, Delete Garment
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border bg-surface text-secondary hover:text-primary font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SuperAdminGarments;
