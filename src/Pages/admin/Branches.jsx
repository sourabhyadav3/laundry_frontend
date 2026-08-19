import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiEdit2, FiEye, FiUser, FiCheckCircle } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import Modal from '../../Components/Modal';

const Branches = () => {
  const { branches } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchForView, setSelectedBranchForView] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Get logged-in user details to identify their branch
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userBranchId = storedUser?.branchId;

  const handleViewBranch = (branch) => {
    setSelectedBranchForView(branch);
    setShowViewModal(true);
  };

  const filteredBranches = [...branches]
    .sort((a, b) => {
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
          <p className="text-secondary text-sm mt-1">View your laundry branch locations</p>
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
                const isOwnBranch = String(branch.id || branch._id || '') === String(userBranchId || '');
                return (
                  <tr
                    key={branch.id}
                    onClick={(e) => {
                      if (!e.target.closest('button, a, input, select, textarea')) {
                        handleViewBranch(branch);
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
                          <p className="font-semibold text-primary">
                            {branch.name} {isOwnBranch && <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/15 text-blue-400">My Branch</span>}
                          </p>
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
                    <td className="p-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        {isOwnBranch ? (
                          <Link 
                            to={`/admin/branches/${branch.id}/edit`} 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
                            title="Edit branch details"
                          >
                            <FiEdit2 size={12} />
                            <span>Edit</span>
                          </Link>
                        ) : (
                          <button 
                            onClick={() => handleViewBranch(branch)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
                            title="View branch details"
                          >
                            <FiEye size={12} />
                            <span>View</span>
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

      {/* View Branch Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedBranchForView(null); }}
        title="Branch Details"
        size="md"
      >
        {selectedBranchForView && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-border pb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xl shadow-sm shrink-0">
                <FiMapPin />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">{selectedBranchForView.name}</h3>
                <p className="text-xs text-secondary mt-0.5">Laundry Branch Profile</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1.5">
                <span className="text-secondary text-xs uppercase tracking-wider block font-semibold">Address</span>
                <span className="text-primary font-medium">{selectedBranchForView.address}</span>
              </div>

              <div className="space-y-1.5">
                <span className="text-secondary text-xs uppercase tracking-wider block font-semibold">Contact Phone</span>
                <span className="text-primary font-medium flex items-center gap-2">
                  <FiPhone size={14} className="text-blue-500" />
                  {selectedBranchForView.phone}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-secondary text-xs uppercase tracking-wider block font-semibold">Branch Admin</span>
                <span className="text-primary font-medium flex items-center gap-2">
                  <FiUser size={14} className="text-blue-500" />
                  {selectedBranchForView.manager || 'Not Assigned'}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-secondary text-xs uppercase tracking-wider block font-semibold">Branch Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedBranchForView.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <FiCheckCircle size={12} className="mr-1.5" />
                  {selectedBranchForView.status}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => { setShowViewModal(false); setSelectedBranchForView(null); }}
                className="px-5 py-2 rounded-xl border border-border bg-surface font-semibold text-primary hover:bg-surface-alt transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Branches;
