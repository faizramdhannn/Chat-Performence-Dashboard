'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function StockPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stockData, setStockData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [grades, setGrades] = useState([]);
  const [hpjValues, setHpjValues] = useState([]);
  
  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState({
    shopify: null,
    javelin: null,
    threshold: null
  });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Last update
  const [lastUpdate, setLastUpdate] = useState({
    shopify: null,
    javelin: null,
    threshold: null
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    category: 'all',
    grade: 'all',
    hpj: 'all',
    search: '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    checkPermission();
  }, [session]);

  const checkPermission = async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/user/permissions');
      const result = await response.json();
      
      if (!result.permissions?.stock) {
        alert('Anda tidak memiliki akses ke fitur Stock. Hubungi Faiz jika ingin mengakses.');
        router.push('/dashboard');
        return;
      }
      
      fetchStockData();
      fetchLastUpdate();
    } catch (error) {
      console.error('Error checking permission:', error);
      setLoading(false);
    }
  };

  const fetchStockData = async () => {
    try {
      const response = await fetch('/api/stock');
      const result = await response.json();
      
      // Filter out items with empty Product_name
      const validData = (result.data || []).filter(item => 
        item.Product_name && item.Product_name.trim() !== ''
      );
      
      setStockData(validData);
      
      // Extract unique values for filters
      const uniqueCategories = [...new Set(validData.map(item => item.Category).filter(Boolean))].sort();
      const uniqueGrades = [...new Set(validData.map(item => item.Grade).filter(Boolean))].sort();
      const uniqueHpj = [...new Set(validData.map(item => item.HPJ).filter(Boolean))].sort();
      
      setCategories(uniqueCategories);
      setGrades(uniqueGrades);
      setHpjValues(uniqueHpj);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    }
  };

  const fetchLastUpdate = async () => {
    try {
      const response = await fetch('/api/stock/last-update');
      const result = await response.json();
      setLastUpdate(result.lastUpdate || {});
    } catch (error) {
      console.error('Error fetching last update:', error);
    }
  };

  const openImportModal = () => {
    setImportFiles({
      shopify: null,
      javelin: null,
      threshold: null
    });
    setShowImportModal(true);
  };

  const handleFileSelect = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (!validTypes.includes(file.type)) {
        alert('File harus berformat Excel (.xlsx, .xls) atau CSV');
        return;
      }
      setImportFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleImport = async () => {
    const filesToImport = Object.entries(importFiles).filter(([_, file]) => file !== null);
    
    if (filesToImport.length === 0) {
      alert('Pilih minimal 1 file untuk diimport');
      return;
    }

    setImporting(true);

    try {
      for (const [type, file] of filesToImport) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await fetch('/api/stock/import', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(`Import ${type} gagal: ` + (result.error || 'Unknown error'));
        }
      }

      alert(`Import berhasil! ${filesToImport.length} file diimport.`);
      setShowImportModal(false);
      setImportFiles({ shopify: null, javelin: null, threshold: null });
      fetchStockData();
      fetchLastUpdate();
    } catch (error) {
      console.error('Error importing:', error);
      alert('Gagal import data: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const response = await fetch('/api/stock/export', {
        method: 'POST',
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stock ${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Gagal export data');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      category: 'all',
      grade: 'all',
      hpj: 'all',
      search: '',
    });
    setCurrentPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter and sort data
  const filteredData = stockData.filter(item => {
    if (filters.category !== 'all' && item.Category !== filters.category) return false;
    if (filters.grade !== 'all' && item.Grade !== filters.grade) return false;
    if (filters.hpj !== 'all' && item.HPJ !== filters.hpj) return false;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const sku = String(item.SKU || '').toLowerCase();
      const productName = String(item.Product_name || '').toLowerCase();
      if (!sku.includes(searchLower) && !productName.includes(searchLower)) return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by Grade A-Z
    const gradeCompare = String(a.Grade || '').localeCompare(String(b.Grade || ''));
    if (gradeCompare !== 0) return gradeCompare;
    
    // Then by PCA (descending - dari besar ke kecil)
    const pcaA = parseFloat(a.PCA) || 0;
    const pcaB = parseFloat(b.PCA) || 0;
    return pcaB - pcaA;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div>
      <Header title="Stock Management" />

      {/* Import/Export Section - COMPACT */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center gap-4">
          <div className="flex gap-3">
            <button
              onClick={openImportModal}
              className="btn-primary text-sm px-4 py-2"
            >
              📥 Import Data
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : '📤 Export Stock'}
            </button>
          </div>

          {/* Last Update Info */}
          <div className="text-right text-xs text-gray-600">
            <div className="font-semibold mb-1">Last Update:</div>
            <div className="space-y-0.5">
              <div>Shopify: {formatDate(lastUpdate.shopify)}</div>
              <div>Javelin: {formatDate(lastUpdate.javelin)}</div>
              <div>Threshold: {formatDate(lastUpdate.threshold)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - COMPACT */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-primary">Filters</h2>
          <button onClick={resetFilters} className="btn-secondary text-xs px-3 py-1">
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Grade</label>
            <select
              value={filters.grade}
              onChange={(e) => handleFilterChange('grade', e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All Grades</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">HPJ</label>
            <select
              value={filters.hpj}
              onChange={(e) => handleFilterChange('hpj', e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All HPJ</option>
              {hpjValues.map((hpj) => (
                <option key={hpj} value={hpj}>{hpj}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="SKU atau Product Name"
              className="input-field text-sm py-2"
            />
          </div>
        </div>
      </div>

      {/* Summary - COMPACT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card-accent p-3">
          <h3 className="text-xs text-center font-semibold text-primary/80 mb-1 uppercase">Total Items</h3>
          <div className="text-2xl font-bold text-center text-primary">{filteredData.length}</div>
        </div>
        <div className="stat-card p-3">
          <h3 className="text-xs text-center font-semibold text-gray-600 mb-1 uppercase">Current Page</h3>
          <div className="text-2xl font-bold text-center text-primary">{currentPage} / {totalPages || 1}</div>
        </div>
        <div className="stat-card p-3">
          <h3 className="text-xs text-center font-semibold text-gray-600 mb-1 uppercase">Showing</h3>
          <div className="text-2xl font-bold text-center text-primary">{paginatedData.length} of {filteredData.length}</div>
        </div>
      </div>

      {/* Stock Table - COMPACT */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-primary">Stock Data</h2>
          <p className="text-xs text-gray-600 mt-1">Sorted by Grade (A-Z), then PCA (High to Low)</p>
        </div>

        {paginatedData.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Found</h3>
            <p className="text-sm text-gray-500">Try adjusting your filters or import data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-2 py-2 text-center font-semibold">SKU</th>
                    <th className="px-2 py-2 text-center font-semibold">Product Name</th>
                    <th className="px-2 py-2 text-center font-semibold">Category</th>
                    <th className="px-2 py-2 text-center font-semibold">Grade</th>
                    <th className="px-2 py-2 text-center font-semibold">PCA</th>
                    <th className="px-2 py-2 text-center font-semibold">Shopify</th>
                    <th className="px-2 py-2 text-center font-semibold">Threshold</th>
                    <th className="px-2 py-2 text-center font-semibold">HPP</th>
                    <th className="px-2 py-2 text-center font-semibold">HPT</th>
                    <th className="px-2 py-2 text-center font-semibold">HPJ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                    >
                      <td className="px-2 text-center py-2 font-medium">{item.SKU}</td>
                      <td className="px-2 py-2">{item.Product_name}</td>
                      <td className="px-2 text-center py-2">{item.Category}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          {item.Grade}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-semibold">{item.PCA}</td>
                      <td className="px-2 py-2 text-center">{item.Shopify}</td>
                      <td className="px-2 py-2 text-center">{item.Threshold}</td>
                      <td className="px-2 py-2 text-center">{item.HPP}</td>
                      <td className="px-2 py-2 text-center">{item.HPT}</td>
                      <td className="px-2 py-2 text-center font-semibold text-green-700">{item.HPJ}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination - COMPACT */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            currentPage === pageNum
                              ? 'bg-accent text-primary'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="px-1 text-xs">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Import Modal - 3 File Choosers */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
            <div className="bg-primary text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">Import Data</h2>
              <p className="text-sm mt-1">Upload Excel (.xlsx, .xls) atau CSV</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Shopify Upload */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  📦 Shopify Data
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect('shopify', e)}
                  className="input-field text-sm"
                />
                {importFiles.shopify && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {importFiles.shopify.name}
                  </p>
                )}
              </div>

              {/* Javelin Upload */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  🎯 Javelin Data
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect('javelin', e)}
                  className="input-field text-sm"
                />
                {importFiles.javelin && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {importFiles.javelin.name}
                  </p>
                )}
              </div>

              {/* Threshold Upload */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  ⚡ Threshold Data
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect('threshold', e)}
                  className="input-field text-sm"
                />
                {importFiles.threshold && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {importFiles.threshold.name}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Warning:</strong> Data lama di sheet akan dihapus dan diganti dengan data baru.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFiles({ shopify: null, javelin: null, threshold: null });
                  }}
                  className="btn-secondary flex-1"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || (
                    !importFiles.shopify && !importFiles.javelin && !importFiles.threshold
                  )}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}