'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function BundlingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingItem, setEditingItem] = useState(null);

  // Options from master-stock
  const [nonGWPOptions, setNonGWPOptions] = useState([]);
  const [GWPOptions, setGWPOptions] = useState([]);
  const [prices, setPrices] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    bundling_name: '',
    option_1: '',
    option_2: '',
    option_3: '',
    option_4: '',
    option_5: '',
    option_6: '',
    total_value: 0,
    discount_percentage: 0,
    discount_value: 0,
    value: 0,
    stock: 0,
    status: 'Active',
  });

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOptions();
    fetchBundling();
  }, []);

  useEffect(() => {
    calculateTotalValue();
  }, [
    formData.option_1,
    formData.option_2,
    formData.option_3,
    formData.option_4,
    formData.option_5,
    formData.option_6,
  ]);

  const fetchOptions = async () => {
    try {
      const response = await fetch('/api/bundling?action=options');
      const result = await response.json();
      setNonGWPOptions(result.nonGWP || []);
      setGWPOptions(result.GWP || []);
      setPrices(result.prices || {});
    } catch (error) {
      console.error('Error fetching options:', error);
      alert('Failed to fetch product options');
    }
  };

  const fetchBundling = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bundling');
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching bundling:', error);
      alert('Failed to fetch bundling data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalValue = () => {
    let total = 0;

    if (formData.option_1 && prices[formData.option_1]) {
      total += prices[formData.option_1].HPJ || 0;
    }
    if (formData.option_2 && prices[formData.option_2]) {
      total += prices[formData.option_2].HPJ || 0;
    }
    if (formData.option_3 && prices[formData.option_3]) {
      total += prices[formData.option_3].HPT || 0;
    }
    if (formData.option_4 && prices[formData.option_4]) {
      total += prices[formData.option_4].HPT || 0;
    }
    if (formData.option_5 && prices[formData.option_5]) {
      total += prices[formData.option_5].HPT || 0;
    }
    if (formData.option_6 && prices[formData.option_6]) {
      total += prices[formData.option_6].HPT || 0;
    }

    setFormData(prev => ({
      ...prev,
      total_value: total,
      value: total - prev.discount_value,
    }));
  };

  const handleFormChange = (key, value) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: value };

      if (key === 'discount_percentage') {
        const percentage = parseFloat(value) || 0;
        const discountVal = (prev.total_value * percentage) / 100;
        updated.discount_value = discountVal;
        updated.value = prev.total_value - discountVal;
      } else if (key === 'discount_value') {
        const discountVal = parseFloat(value) || 0;
        const percentage = prev.total_value > 0 ? (discountVal / prev.total_value) * 100 : 0;
        updated.discount_percentage = percentage;
        updated.value = prev.total_value - discountVal;
      } else if (key === 'value') {
        const finalValue = parseFloat(value) || 0;
        const discountVal = prev.total_value - finalValue;
        const percentage = prev.total_value > 0 ? (discountVal / prev.total_value) * 100 : 0;
        updated.discount_value = discountVal;
        updated.discount_percentage = percentage;
      }

      return updated;
    });
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      bundling_name: '',
      option_1: '',
      option_2: '',
      option_3: '',
      option_4: '',
      option_5: '',
      option_6: '',
      total_value: 0,
      discount_percentage: 0,
      discount_value: 0,
      value: 0,
      stock: 0,
      status: 'Active',
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormData({
      bundling_name: item.bundling_name,
      option_1: item.option_1,
      option_2: item.option_2,
      option_3: item.option_3,
      option_4: item.option_4,
      option_5: item.option_5,
      option_6: item.option_6,
      total_value: item.total_value,
      discount_percentage: item.discount_percentage,
      discount_value: item.discount_value,
      value: item.value,
      stock: item.stock,
      status: item.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = '/api/bundling';
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const payload = modalMode === 'edit' 
        ? { ...formData, id: editingItem.id, rowIndex: editingItem.rowIndex, created_at: editingItem.created_at }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchBundling();
        closeModal();
      } else {
        alert(result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete bundling "${item.bundling_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/bundling?rowIndex=${item.rowIndex}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchBundling();
      } else {
        alert(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete bundling');
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.bundling_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.option_1.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.option_2.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Bundling...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Bundling Management" />

      <div className="card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-primary">Bundling List</h2>
          <button onClick={openCreateModal} className="btn-primary">
            + Create Bundling
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or product..."
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="stat-card-accent">
          <h3 className="text-sm text-center font-semibold text-primary/80 mb-2 uppercase">
            Total Bundling
          </h3>
          <div className="text-4xl text-center font-bold text-primary">
            {filteredData.length}
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
            Active
          </h3>
          <div className="text-4xl text-center font-bold text-green-600">
            {filteredData.filter(item => item.status === 'Active').length}
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
            Inactive
          </h3>
          <div className="text-4xl text-center font-bold text-red-600">
            {filteredData.filter(item => item.status === 'Inactive').length}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Bundling Found</h3>
            <p className="text-gray-500">Create your first bundling to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Bundling Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Products</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Value</th>
                  <th className="px-4 py-3 text-right font-semibold">Discount</th>
                  <th className="px-4 py-3 text-right font-semibold">Final Value</th>
                  <th className="px-4 py-3 text-center font-semibold">Stock</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{item.id}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{item.bundling_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {[item.option_1, item.option_2, item.option_3, item.option_4, item.option_5, item.option_6]
                          .filter(Boolean)
                          .map((opt, i) => (
                            <div key={i} className="text-gray-600">• {opt}</div>
                          ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      Rp {item.total_value.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {item.discount_percentage.toFixed(1)}% (Rp {item.discount_value.toLocaleString('id-ID')})
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      Rp {item.value.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">{item.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-primary">
                {modalMode === 'create' ? 'Create New Bundling' : 'Edit Bundling'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Bundling Name *
                  </label>
                  <input
                    type="text"
                    value={formData.bundling_name}
                    onChange={(e) => handleFormChange('bundling_name', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Option 1 (Product - Non-GWP)
                    </label>
                    <select
                      value={formData.option_1}
                      onChange={(e) => handleFormChange('option_1', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Product</option>
                      {nonGWPOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Option 2 (Product - Non-GWP)
                    </label>
                    <select
                      value={formData.option_2}
                      onChange={(e) => handleFormChange('option_2', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Product</option>
                      {nonGWPOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Option 3 (GWP)
                    </label>
                    <select
                      value={formData.option_3}
                      onChange={(e) => handleFormChange('option_3', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select GWP</option>
                      {GWPOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Option 4 (GWP)
                    </label>
                    <select
                      value={formData.option_4}
                      onChange={(e) => handleFormChange('option_4', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select GWP</option>
                      {GWPOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Option 5 (GWP)
                    </label>
                    <select
                      value={formData.option_5}
                      onChange={(e) => handleFormChange('option_5', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select GWP</option>
                      {GWPOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Option 6 (GWP)
                    </label>
                    <select
                      value={formData.option_6}
                      onChange={(e) => handleFormChange('option_6', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select GWP</option>
                      {GWPOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Total Value (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    value={`Rp ${formData.total_value.toLocaleString('id-ID')}`}
                    className="input-field bg-gray-100"
                    readOnly
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Discount Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_percentage}
                      onChange={(e) => handleFormChange('discount_percentage', e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Discount Value (Rp)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => handleFormChange('discount_value', e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Final Value (Rp)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => handleFormChange('value', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => handleFormChange('stock', e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      className="input-field"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Bundling' : 'Update Bundling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}