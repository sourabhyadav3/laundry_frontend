import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiPhone } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import Modal from '../../Components/Modal';

const Branches = () => {
  const navigate = useNavigate();
  const { branches, deleteBranch } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  const handleDelete = (id) => {
    setBranchToDelete(id);
    setShowDeleteModal(true);
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
        <Link 
          to="/superadmin/branches/add" 
          className="btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          <FiPlus />
          Add Branch
        </Link>
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
              {filteredBranches.map(branch => (
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
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <FiMapPin />
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{branch.name}</p>
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${branch.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {branch.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/superadmin/branches/${branch.id}/edit`} className="icon-button text-blue-600 hover:bg-blue-50">
                        <FiEdit2 size={16} />
                      </Link>
                      <button onClick={() => handleDelete(branch.id)} className="icon-button text-red-600 hover:bg-red-50">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
