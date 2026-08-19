import React, { useContext, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiTrash2, FiSave, FiLogOut, FiTruck, FiUsers } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../../Components/Modal';

const labels = {
  en: {
    title: "Drivers Management",
    subtitle: "Manage dispatch riders and their operational details",
    driverNo: "Driver No",
    driverName: "Driver Name",
    mobile: "Mobile",
    tel: "Tel",
    area: "Area",
    areas: "Service Areas",
    street: "Street",
    part: "Part",
    jadda: "Jadda",
    houseNo: "House No / Unit",
    floor: "Floor",
    flat: "Flat",
    addressNotes: "Address Notes",
    carNo: "Car No",
    civilId: "Civil ID",
    nationality: "Nationality",
    branch: "Branch",
    status: "Status",
    new: "New",
    save: "Save",
    delete: "Delete",
    exit: "Exit",
    search: "Search",
    byName: "By Name",
    byPhone: "By Phone",
    byArea: "By Area",
    driversList: "Drivers List",
    phone1: "Phone 1",
    exitDrivers: "Exit Drivers",
    prepareDrivers: "Prepare Drivers",
    selectArea: "Select Area",
    selectBranch: "Select Branch",
    statusAvailable: "Available",
    statusAssigned: "Assigned",
    statusOnDelivery: "On Delivery",
    statusOffDuty: "Off Duty",
  },
  ar: {
    title: "إدارة السائقين",
    subtitle: "إدارة سائقي التوصيل وتفاصيلهم التشغيلية",
    driverNo: "رقم السائق",
    driverName: "اسم السائق",
    mobile: "موبايل",
    tel: "تليفون",
    area: "منطقة",
    areas: "مناطق الخدمة",
    street: "شارع",
    part: "قطعة",
    jadda: "جادة",
    houseNo: "المنزل / الوحدة",
    floor: "الدور",
    flat: "الشقة",
    addressNotes: "ملاحظات العنوان",
    carNo: "رقم السيارة",
    civilId: "الرقم المدني",
    nationality: "الجنسية",
    branch: "الفرع",
    status: "الحالة",
    new: "جديد",
    save: "حفظ",
    delete: "حذف",
    exit: "خروج",
    search: "بحث",
    byName: "بالاسم",
    byPhone: "برقم الهاتف",
    byArea: "بالمنطقة",
    driversList: "قائمة السائقين",
    phone1: "هاتف 1",
    exitDrivers: "خروج السائقين",
    prepareDrivers: "تحضير السائقين",
    selectArea: "اختر المنطقة",
    selectBranch: "اختر الفرع",
    statusAvailable: "متوفر",
    statusAssigned: "مكلّف",
    statusOnDelivery: "بالتوصيل",
    statusOffDuty: "خارج الخدمة",
  }
};

const emptyDriverForm = {
  id: '',
  driverNo: '',
  driverName: '',
  mobile: '',
  tel: '',
  areas: [],
  street: '',
  part: '',
  jadda: '',
  houseNo: '',
  floor: '',
  flat: '',
  addressNotes: '',
  carNo: '',
  civilId: '',
  nationality: '',
  branch: '',
  status: 'Available',
};

const Drivers = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const tLocal = labels[language] || labels.en;

  const { drivers, addDriver, updateDriver, deleteDriver, branches, areas } = useContext(AdminStateContext);

  const loggedInUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  }, []);
  const isDeliveryStaff = loggedInUser.role === 'Delivery Staff';
  const isSuperAdmin = loggedInUser.role === 'Super Admin';
  const isHomeServices = useMemo(() => {
    return loggedInUser.branchName && loggedInUser.branchName.toLowerCase().includes('home service');
  }, [loggedInUser]);
  const adminBranchObj = useMemo(() => {
    if (!loggedInUser.branchId || !branches) return null;
    return branches.find(b => (b.id || b._id)?.toString() === loggedInUser.branchId.toString());
  }, [loggedInUser.branchId, branches]);

  const [form, setForm] = useState(emptyDriverForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchType, setSearchType] = useState('name'); // 'name', 'phone', or 'area'

  useEffect(() => {
    if (!isSuperAdmin && adminBranchObj && !form.branch && !form.id) {
      setForm(prev => ({
        ...prev,
        branch: adminBranchObj.name
      }));
    }
  }, [adminBranchObj, isSuperAdmin, form.branch, form.id]);

  const filteredDrivers = useMemo(() => {
    return drivers
      .filter((d) => {
        if (!searchQuery) return true;
        if (searchType === 'name') {
          return d.driverName.toLowerCase().includes(searchQuery.toLowerCase());
        } else if (searchType === 'phone') {
          return d.mobile.includes(searchQuery) || d.tel.includes(searchQuery);
        } else if (searchType === 'area') {
          const rawAreas = d.areas || (d.area ? [d.area] : []);
          const driverAreas = rawAreas
            .flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()) : a)
            .filter(a => a && a !== '...' && a !== '…');
          return driverAreas.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return true;
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        const numA = Number(a.id);
        const numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }, [drivers, searchQuery, searchType]);

  const handleSelectDriver = (drv) => {
    const rawAreas = drv.areas || (drv.area ? [drv.area] : []);
    const cleanAreas = rawAreas
      .flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()) : a)
      .filter(a => a && a !== '...' && a !== '…');

    setForm({
      ...emptyDriverForm,
      ...drv,
      areas: cleanAreas
    });
  };

  const handleNew = () => {
    const nextNum = drivers.length
      ? Math.max(...drivers.map((d) => parseInt(String(d.driverNo).replace(/\D/g, ''), 10) || 0)) + 1
      : 101;
    setForm({
      ...emptyDriverForm,
      driverNo: `DRV-${nextNum}`,
      branch: (!isSuperAdmin && adminBranchObj) ? adminBranchObj.name : '',
    });
  };

  const handleSave = () => {
    if (!form.driverName.trim()) {
      toast.error(language === 'ar' ? 'اسم السائق مطلوب' : 'Driver Name is required');
      return;
    }
    if (!form.mobile.trim()) {
      toast.error(language === 'ar' ? 'رقم الموبايل مطلوب' : 'Mobile number is required');
      return;
    }

    if (form.id) {
      updateDriver(form);
      toast.success(language === 'ar' ? 'تم تحديث بيانات السائق بنجاح' : 'Driver details updated successfully');
    } else {
      const newId = Date.now();
      addDriver({ ...form, id: newId });
      toast.success(language === 'ar' ? 'تم إضافة السائق بنجاح' : 'Driver added successfully');
      setForm(emptyDriverForm);
    }
  };

  const handleDelete = () => {
    if (!form.id) {
      toast.warning(language === 'ar' ? 'يرجى تحديد سائق لحذفه' : 'Please select a driver to delete');
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteDriver(form.id);
    toast.success(language === 'ar' ? 'تم حذف السائق بنجاح' : 'Driver deleted successfully');
    setForm(emptyDriverForm);
    setShowDeleteModal(false);
  };

  const handleExit = () => {
    if (isDeliveryStaff) {
      navigate('/delivery/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="surface-card overflow-hidden border border-border shadow-xl rounded-2xl">
        <div className="dashboard-hero p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {language === 'ar' ? 'الخدمات اللوجستية' : 'Logistics Operations'}
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-primary">{tLocal.title}</h1>
          <p className="mt-1 text-sm text-secondary">{tLocal.subtitle}</p>
        </div>
      </section>

      {/* Main Grid: Form Left, Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Driver Profile Form Card */}
        {!isDeliveryStaff && (
          <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-5 shadow-lg space-y-6">
          <div className="border-b border-border/80 pb-3 flex justify-between items-center">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <FiTruck className="text-blue-500" />
              {language === 'ar' ? 'بيانات السائق' : 'Driver Information'}
            </h3>
            <span className="text-xs font-semibold text-secondary font-mono bg-surface-alt px-2.5 py-0.5 rounded-full">
              {form.driverNo || 'NEW'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Driver Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.driverName} *</label>
              <input
                type="text"
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.status}</label>
              <select
                value={form.status || 'Available'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              >
                <option value="Available">{tLocal.statusAvailable}</option>
                <option value="Assigned">{tLocal.statusAssigned}</option>
                <option value="On Delivery">{tLocal.statusOnDelivery}</option>
                <option value="Off Duty">{tLocal.statusOffDuty}</option>
              </select>
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.mobile} *</label>
              <input
                type="text"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Tel */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.tel}</label>
              <input
                type="text"
                value={form.tel}
                onChange={(e) => setForm({ ...form, tel: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Car No */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.carNo}</label>
              <input
                type="text"
                value={form.carNo}
                onChange={(e) => setForm({ ...form, carNo: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>



            {/* Street */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.street}</label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Part */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.part}</label>
              <input
                type="text"
                value={form.part}
                onChange={(e) => setForm({ ...form, part: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Jadda */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.jadda}</label>
              <input
                type="text"
                value={form.jadda}
                onChange={(e) => setForm({ ...form, jadda: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* House No */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.houseNo}</label>
              <input
                type="text"
                value={form.houseNo}
                onChange={(e) => setForm({ ...form, houseNo: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Floor */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.floor}</label>
              <input
                type="text"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Flat */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.flat}</label>
              <input
                type="text"
                value={form.flat}
                onChange={(e) => setForm({ ...form, flat: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Civil ID */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.civilId}</label>
              <input
                type="text"
                value={form.civilId}
                onChange={(e) => setForm({ ...form, civilId: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.nationality}</label>
              <input
                type="text"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.branch}</label>
              {!isSuperAdmin && adminBranchObj ? (
                <div className="mt-1 w-full text-sm rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-secondary font-semibold">
                  {form.branch || adminBranchObj.name}
                </div>
              ) : (
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
                >
                  <option value="">{tLocal.selectBranch}</option>
                  {branches?.map?.(b => (
                    <option key={b.id || b._id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Service Areas (Multi-Select Checklist) */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold text-secondary uppercase mb-2">
                {tLocal.areas}
              </label>
              <div className="border border-border rounded-lg bg-surface max-h-[160px] overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {areas.map((area) => {
                  const isChecked = form.areas?.includes(area) || false;
                  return (
                    <label key={area} className="flex items-center gap-2 text-xs text-primary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const currentAreas = form.areas || [];
                          const nextAreas = checked 
                            ? [...currentAreas, area]
                            : currentAreas.filter(a => a !== area);
                          setForm({ ...form, areas: nextAreas });
                        }}
                        className="rounded border-border text-blue-500 focus:ring-blue-400 h-4 w-4"
                      />
                      {area}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Address Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-secondary uppercase">{tLocal.addressNotes}</label>
              <textarea
                rows="2"
                value={form.addressNotes}
                onChange={(e) => setForm({ ...form, addressNotes: e.target.value })}
                className="mt-1 w-full text-sm rounded-lg border border-border bg-surface px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-primary"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="border-t border-border pt-4 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={handleNew}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              <FiPlus />
              {tLocal.new}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              <FiSave />
              {tLocal.save}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!form.id}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiTrash2 />
              {tLocal.delete}
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border bg-surface hover:bg-surface-alt text-primary transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              <FiLogOut />
              {tLocal.exit}
            </button>
          </div>
        </div>
      )}

        {/* Right Side: Search Filters + Searchable Drivers List */}
        <div className={`${isDeliveryStaff ? 'lg:col-span-12' : 'lg:col-span-5'} bg-surface border border-border rounded-2xl p-5 shadow-lg space-y-4`}>
          <div className="border-b border-border/80 pb-3">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <FiUsers className="text-blue-500" />
              {tLocal.driversList}
            </h3>
          </div>

          {/* Search Widgets */}
          <div className="bg-surface-alt/50 border border-border/50 rounded-xl p-3 space-y-3">
            {/* Search Type Radios */}
            <div className="flex gap-4 text-xs font-semibold text-secondary">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === 'name'}
                  onChange={() => setSearchType('name')}
                  className="text-blue-500 focus:ring-blue-400"
                />
                {tLocal.byName}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === 'phone'}
                  onChange={() => setSearchType('phone')}
                  className="text-blue-500 focus:ring-blue-400"
                />
                {tLocal.byPhone}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === 'area'}
                  onChange={() => setSearchType('area')}
                  className="text-blue-500 focus:ring-blue-400"
                />
                {tLocal.byArea}
              </label>
            </div>

            {/* Input and Search Button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder={tLocal.search + "..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
              </div>
              <button
                type="button"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow flex items-center gap-1"
              >
                {tLocal.search}
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-border/50 rounded-xl max-h-[350px] overflow-y-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-surface-alt/75 text-secondary border-b border-border font-bold">
                  <th className="p-3">{tLocal.status}</th>
                  <th className="p-3">{tLocal.driverName}</th>
                  <th className="p-3">{tLocal.areas}</th>
                  <th className="p-3">{tLocal.mobile}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-secondary font-medium">
                      {language === 'ar' ? 'لا يوجد سائقين مطابقين' : 'No drivers matching filters'}
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((drv) => {
                    const currentStatus = drv.status || 'Available';
                    let pillStyle = "bg-rose-500/10 text-rose-600 border-rose-500/15";
                    let statusLabel = tLocal.statusOffDuty;
                    
                    if (currentStatus === 'Available') {
                      pillStyle = "bg-emerald-500/10 text-emerald-600 border-emerald-500/15";
                      statusLabel = tLocal.statusAvailable;
                    } else if (currentStatus === 'Assigned') {
                      pillStyle = "bg-amber-500/10 text-amber-600 border-amber-500/15";
                      statusLabel = tLocal.statusAssigned;
                    } else if (currentStatus === 'On Delivery') {
                      pillStyle = "bg-blue-500/10 text-blue-600 border-blue-500/15";
                      statusLabel = tLocal.statusOnDelivery;
                    }

                    const rowSelected = String(drv.id) === String(form.id);
                    const rawAreas = drv.areas || (drv.area ? [drv.area] : []);
                    const driverAreas = rawAreas
                      .flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()) : a)
                      .filter(a => a && a !== '...' && a !== '…');

                    return (
                      <tr
                        key={drv.id}
                        onClick={!isDeliveryStaff ? () => handleSelectDriver(drv) : undefined}
                        className={`border-b border-border/30 transition-colors ${
                          !isDeliveryStaff 
                            ? 'hover:bg-surface-alt/30 cursor-pointer select-none' 
                            : ''
                        } ${rowSelected && !isDeliveryStaff ? 'bg-blue-500/10 hover:bg-blue-500/15' : ''}`}
                      >
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${pillStyle}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-primary">{isHomeServices ? `${drv.driverName} (${drv.branch || 'No Branch'})` : drv.driverName}</td>
                        <td className="p-3 text-secondary" title={driverAreas.join(', ')}>
                          <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                            {driverAreas.map((area) => (
                              <span key={area} className="bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded text-[10px] text-indigo-600 font-semibold whitespace-nowrap">
                                {area}
                              </span>
                            ))}
                            {driverAreas.length === 0 && '—'}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-secondary">{drv.mobile}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right Bottom Action Bar */}
          <div className="flex gap-2 justify-end border-t border-border pt-4">
            {!isDeliveryStaff && (
              <button
                type="button"
                onClick={() => toast.info(language === 'ar' ? 'جاري تحضير السائقين...' : 'Preparing drivers list...')}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all"
              >
                {tLocal.prepareDrivers}
              </button>
            )}
            <button
              type="button"
              onClick={handleExit}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border bg-surface hover:bg-surface-alt text-primary transition-all"
            >
              {tLocal.exitDrivers}
            </button>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={language === 'ar' ? 'حذف السائق' : 'Delete Driver'}
        size="sm"
      >
        <div className="space-y-6 text-center">
          <p className="text-secondary text-sm">
            {language === 'ar' 
              ? `هل أنت متأكد من حذف السائق "${form.driverName}"؟` 
              : `Are you sure you want to delete driver "${form.driverName}"?`}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 rounded-xl border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="flex-1 rounded-xl bg-rose-600 py-2 font-semibold text-white transition hover:bg-rose-700"
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Drivers;
