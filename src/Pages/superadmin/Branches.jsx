import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiPhone, FiLock, FiRefreshCw } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import Modal from '../../Components/Modal';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const Branches = () => {
  const navigate = useNavigate();
  const { branches, deleteBranch } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const isBranchProtected = (b) => {
    if (!b) return false;
    return Boolean(
      b.isSystemBranch ||
      (b.name && b.name.toLowerCase().includes('home service')) ||
      (b.name && b.name.toLowerCase().includes('main branch'))
    );
  };

  const handleDelete = (branch) => {
    if (isBranchProtected(branch)) {
      toast.error(`Protected Core System Branch "${branch.name}" cannot be deleted.`);
      return;
    }
    setBranchToDelete(branch.id);
    setShowDeleteModal(true);
  };

  const handleRestoreSystemBranches = async () => {
    try {
      setIsRestoring(true);
      let success = false;
      try {
        const res = await api.post('/branches/restore-system-branches');
        if (res && res.data) success = true;
      } catch (endpointErr) {
        // Fallback: standard POST /branches compatible with all deployed backends
        const currentBranchesRes = await api.get('/branches');
        const list = Array.isArray(currentBranchesRes.data) ? currentBranchesRes.data : (branches || []);
        
        const hasHomeService = list.some(b => b.name && b.name.toLowerCase().includes('home service'));
        if (!hasHomeService) {
          await api.post('/branches', {
            name: 'Home Service',
            address: 'Central Logistics & Home Delivery Hub',
            phone: '+965 2222 0000',
            email: 'homeservice@tuhama.com',
            status: 'Active'
          });
        }

        const hasMainBranch = list.some(b => b.name && b.name.toLowerCase().includes('main branch'));
        if (!hasMainBranch) {
          await api.post('/branches', {
            name: 'Main Branch',
            address: 'Headquarters & Central Processing Unit',
            phone: '+965 2222 1111',
            email: 'main@tuhama.com',
            status: 'Active'
          });
        }
        success = true;
      }

      if (success) {
        toast.success('Core system branches (Home Service, Main Branch) verified and restored!');
        setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to restore system branches');
    } finally {
      setIsRestoring(false);
    }
  };

  const confirmDelete = () => {
    if (branchToDelete) {
      deleteBranch(branchToDelete);
      setBranchToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const filteredBranches = [...branches]
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA;
      }
      return a.name.localeCompare(b.name);
    })
    .filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Branches</h1>
          <p className="text-secondary text-sm mt-1">Manage your laundry branch locations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestoreSystemBranches}
            disabled={isRestoring}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface-alt hover:bg-surface text-secondary hover:text-primary text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Auto-verify & restore missing core branches (Home Service, Main Branch)"
          >
            <FiRefreshCw className={isRestoring ? 'animate-spin' : ''} size={14} />
            <span>{isRestoring ? 'Restoring...' : 'Restore System Branches'}</span>
          </button>
          <Link 
            to="/superadmin/branches/add" 
            className="btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            <FiPlus />
            Add Branch
          </Link>
        </div>
      </div>

      <div className="surface-card p-4 sm:p-6 rounded-2xl border border-border">
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Search branches..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-md input-field rounded-xl border-border px-4 py-2 bg-surface-alt"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-sm font-semibold text-secondary uppercase tracking-wider">
                <th className="p-4">Branch Name</th>
                <th className="p-4 hidden md:table-cell">Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBranches.map(branch => {
                const isProtected = isBranchProtected(branch);
                return (
                  <tr
                    key={branch.id}
                    onClick={(e) => {
                      if (!e.target.closest('button, a, input, select, textarea')) {
                        navigate(`/superadmin/branches/${branch.id}/edit`);
                      }
                    }}
                    className="hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProtected ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {isProtected ? <FiLock size={18} /> : <FiMapPin size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-primary">{branch.name}</p>
                            {isProtected && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-200 dark:border-purple-800">
                                <FiLock size={10} /> System Core
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary">{branch.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm text-secondary">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2"><FiPhone size={12}/> {branch.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${branch.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'}`}>
                        {branch.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/superadmin/branches/${branch.id}/edit`} className="icon-button text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                          <FiEdit2 size={16} />
                        </Link>
                        {isProtected ? (
                          <button
                            disabled
                            title="Protected System Core Branch cannot be deleted"
                            className="icon-button text-gray-400 opacity-40 cursor-not-allowed"
                          >
                            <FiLock size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(branch)}
                            className="icon-button text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBranches.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-secondary">
                    No branches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setBranchToDelete(null); }}
        title="Delete Branch"
        size="sm"
      >
        <div className="space-y-6 text-center">
          <p className="text-secondary text-sm">
            Are you sure you want to delete this branch? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setBranchToDelete(null); }}
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

export default Branches;
