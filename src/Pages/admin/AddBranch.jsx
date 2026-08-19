import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import { toast } from 'react-toastify';

const AddBranch = () => {
  const navigate = useNavigate();
  const { addBranch } = useContext(AdminStateContext);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    addBranch(formData);
    toast.success('Branch added successfully!');
    navigate('/admin/branches');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="icon-button text-secondary">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-primary">Add New Branch</h1>
          <p className="text-sm text-secondary">Register a new branch location</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="surface-card p-6 rounded-2xl border border-border space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Branch Name *</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full input-field rounded-xl border border-border px-4 py-2 bg-surface-alt"
              placeholder="e.g. Downtown Branch"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Phone Number *</label>
            <input 
              type="text" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full input-field rounded-xl border border-border px-4 py-2 bg-surface-alt"
              placeholder="e.g. +1 234 567 8900"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-primary">Full Address *</label>
            <textarea 
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              className="w-full input-field rounded-xl border border-border px-4 py-2 bg-surface-alt resize-none"
              placeholder="Enter complete physical address"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Email Address</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full input-field rounded-xl border border-border px-4 py-2 bg-surface-alt"
              placeholder="branch@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Status</label>
            <select 
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full input-field rounded-xl border border-border px-4 py-2 bg-surface-alt"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="px-6 py-2 rounded-xl text-secondary hover:bg-surface-hover font-medium transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium transition flex items-center gap-2"
          >
            <FiSave size={18} />
            Save Branch
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBranch;
