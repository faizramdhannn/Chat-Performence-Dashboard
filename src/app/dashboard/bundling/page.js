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

  // Form state (REMOVED stock from form)
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
    // NO stock field here
    status: 'Active',
  });

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('master'); // master, ready, oos

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
    let nonGWPTotal = 0; // Total for Option 1 & 2 (will be affected by discount)
    let gwpTotal = 0;    // Total for Option 3-6 (NOT affected by discount)

    // Calculate Option 1 & 2 (Non-GWP products)
    if (formData.option_1 && prices[formData.option_1]) {
      nonGWPTotal += prices[formData.option_1].HPJ || 0;
    }
    if (formData.option_2 && prices[formData.option_2]) {
      nonGWPTotal += prices[formData.option_2].HPJ || 0;
    }

    // Calculate Option 3-6 (GWP products - no discount)
    if (formData.option_3 && prices[formData.option_3]) {
      gwpTotal += prices[formData.option_3].HPT || 0;
    }
    if (formData.option_4 && prices[formData.option_4]) {
      gwpTotal += prices[formData.option_4].HPT || 0;
    }
    if (formData.option_5 && prices[formData.option_5]) {
      gwpTotal += prices[formData.option_5].HPT || 0;
    }
    if (formData.option_6 && prices[formData.option_6]) {
      gwpTotal += prices[formData.option_6].HPT || 0;
    }

    const totalBeforeDiscount = nonGWPTotal + gwpTotal;

    setFormData(prev => {
      // Calculate discount only on Non-GWP products
      const discountOnNonGWP = (nonGWPTotal * prev.discount_percentage) / 100;
      const finalValue = (nonGWPTotal - discountOnNonGWP) + gwpTotal;

      return {
        ...prev,
        total_value: totalBeforeDiscount,
        discount_value: discountOnNonGWP,
        value: finalValue,
      };
    });
  };

  const handleFormChange = (key, value) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: value };

      // Calculate Non-GWP total (Option 1 & 2)
      let nonGWPTotal = 0;
      const opt1 = key === 'option_1' ? value : prev.option_1;
      const opt2 = key === 'option_2' ? value : prev.option_2;
      
      if (opt1 && prices[opt1]) {
        nonGWPTotal += prices[opt1].HPJ || 0;
      }
      if (opt2 && prices[opt2]) {
        nonGWPTotal += prices[opt2].HPJ || 0;
      }

      // Calculate GWP total (Option 3-6)
      let gwpTotal = 0;
      const opt3 = key === 'option_3' ? value : prev.option_3;
      const opt4 = key === 'option_4' ? value : prev.option_4;
      const opt5 = key === 'option_5' ? value : prev.option_5;
      const opt6 = key === 'option_6' ? value : prev.option_6;

      if (opt3 && prices[opt3]) {
        gwpTotal += prices[opt3].HPT || 0;
      }
      if (opt4 && prices[opt4]) {
        gwpTotal += prices[opt4].HPT || 0;
      }
      if (opt5 && prices[opt5]) {
        gwpTotal += prices[opt5].HPT || 0;
      }
      if (opt6 && prices[opt6]) {
        gwpTotal += prices[opt6].HPT || 0;
      }

      if (key === 'discount_percentage') {
        const percentage = parseFloat(value) || 0;
        const discountVal = (nonGWPTotal * percentage) / 100; // Only discount Non-GWP
        updated.discount_value = discountVal;
        updated.discount_percentage = percentage;
        updated.value = (nonGWPTotal - discountVal) + gwpTotal; // Non-GWP after discount + GWP full price
      } else if (key === 'discount_value') {
        const discountVal = parseFloat(value) || 0;
        const percentage = nonGWPTotal > 0 ? (discountVal / nonGWPTotal) * 100 : 0;
        updated.discount_percentage = percentage;
        updated.discount_value = discountVal;
        updated.value = (nonGWPTotal - discountVal) + gwpTotal;
      } else if (key === 'value') {
        const finalValue = parseFloat(value) || 0;
        const nonGWPAfterDiscount = finalValue - gwpTotal; // Remove GWP from final value
        const discountVal = nonGWPTotal - nonGWPAfterDiscount;
        const percentage = nonGWPTotal > 0 ? (discountVal / nonGWPTotal) * 100 : 0;
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
      // NO stock
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
      // NO stock
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
    
    // View mode filtering
    let matchesView = true;
    const stock = parseInt(item.stock) || 0;
    if (viewMode === 'ready') {
      matchesView = stock >= 3;
    } else if (viewMode === 'oos') {
      matchesView = stock < 3;
    }
    // viewMode === 'master' shows all
    
    return matchesSearch && matchesStatus && matchesView;
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

      <div className="card p-4 mb-4">
        {/* Compact Header with View Selector */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-primary">Bundling List</h2>
          
          {/* View Mode Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('master')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                viewMode === 'master'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📋 Master
            </button>
            <button
              onClick={() => setViewMode('ready')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                viewMode === 'ready'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✅ Ready (≥3)
            </button>
            <button
              onClick={() => setViewMode('oos')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                viewMode === 'oos'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ⚠️ OOS (&lt;3)
            </button>
          </div>

          <button onClick={openCreateModal} className="btn-primary text-sm">
            + Create
          </button>
        </div>

        {/* Compact Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or product..."
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="stat-card-accent py-3">
          <h3 className="text-xs text-center font-semibold text-primary/80 mb-1 uppercase">
            Total
          </h3>
          <div className="text-2xl text-center font-bold text-primary">
            {filteredData.length}
          </div>
        </div>

        <div className="stat-card py-3">
          <h3 className="text-xs text-center font-semibold text-gray-600 mb-1 uppercase">
            Active
          </h3>
          <div className="text-2xl text-center font-bold text-green-600">
            {filteredData.filter(item => item.status === 'Active').length}
          </div>
        </div>

        <div className="stat-card py-3">
          <h3 className="text-xs text-center font-semibold text-gray-600 mb-1 uppercase">
            Inactive
          </h3>
          <div className="text-2xl text-center font-bold text-red-600">
            {filteredData.filter(item => item.status === 'Inactive').length}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {viewMode === 'ready' ? 'No Ready Stock' : viewMode === 'oos' ? 'No Low Stock' : 'No Bundling Found'}
            </h3>
            <p className="text-sm text-gray-500">
              {viewMode === 'master' ? 'Create your first bundling to get started' : 'No items match this filter'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-xs">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Bundling Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Products</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs">Total</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs">Discount</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs">Final</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Stock</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Status</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => {
                  const stock = parseInt(item.stock) || 0;
                  const stockColor = stock >= 3 ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium text-xs">{item.id}</td>
                      <td className="px-3 py-2 font-semibold text-primary">{item.bundling_name}</td>
                      <td className="px-3 py-2">
                        <div className="text-xs space-y-0.5">
                          {[item.option_1, item.option_2, item.option_3, item.option_4, item.option_5, item.option_6]
                            .filter(Boolean)
                            .map((opt, i) => (
                              <div key={i} className="text-gray-600 truncate max-w-xs">• {opt}</div>
                            ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-xs">
                        Rp {item.total_value.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 text-xs">
                        {item.discount_percentage.toFixed(1)}%
                        <div className="text-xs text-gray-500">
                          (Rp {item.discount_value.toLocaleString('id-ID')})
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-green-600">
                        Rp {item.value.toLocaleString('id-ID')}
                      </td>
                      <td className={`px-3 py-2 text-center font-bold ${stockColor}`}>
                        {item.stock}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

                {/* Options 3-6 in ONE ROW */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Option 3 (GWP)
                    </label>
                    <select
                      value={formData.option_3}
                      onChange={(e) => handleFormChange('option_3', e.target.value)}
                      className="input-field text-xs"
                    >
                      <option value="">Select</option>
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
                      className="input-field text-xs"
                    >
                      <option value="">Select</option>
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
                      className="input-field text-xs"
                    >
                      <option value="">Select</option>
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
                      className="input-field text-xs"
                    >
                      <option value="">Select</option>
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

                {/* Discount Percentage, Discount Value, Final Value, and Status in ONE ROW */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Discount (%)
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
                      Discount (Rp)
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