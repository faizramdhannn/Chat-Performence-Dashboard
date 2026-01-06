'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function WarrantyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedView, setSelectedView] = useState('warranty');
  const [channels, setChannels] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filters
  const [filters, setFilters] = useState({
    channel: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  // Report filters
  const [reportFilters, setReportFilters] = useState({
    monthFrom: '',
    monthTo: '',
  });

  // Pivot data for report - DITUKAR: Channel ke bawah, Year ke samping
  const [pivotData, setPivotData] = useState({
    rows: [],      // channels
    columns: [],   // years
    matrix: {},
    totals: {},
  });

  useEffect(() => {
    fetchWarrantyData();
  }, [selectedView]);

  useEffect(() => {
    if (selectedView === 'report') {
      processReportData();
    }
  }, [data, reportFilters, selectedView]);

  const fetchWarrantyData = async () => {
    setLoading(true);
    try {
      const type = selectedView === 'report' ? 'warranty' : selectedView;
      const response = await fetch(`/api/warranty?type=${type}`);
      const result = await response.json();
      setData(result.data || []);
      setChannels(result.channels || []);
    } catch (error) {
      console.error('Error fetching warranty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
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

  const getYear = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.getFullYear().toString();
    } catch (e) {
      return null;
    }
  };

  const processReportData = () => {
    let reportData = [...data];

    // Apply month filters
    if (reportFilters.monthFrom || reportFilters.monthTo) {
      reportData = reportData.filter(item => {
        const createdDate = item.created_at ? new Date(item.created_at) : null;
        if (!createdDate) return false;

        if (reportFilters.monthFrom) {
          const fromDate = new Date(reportFilters.monthFrom);
          fromDate.setDate(1);
          fromDate.setHours(0, 0, 0, 0);
          if (createdDate < fromDate) return false;
        }
        if (reportFilters.monthTo) {
          const toDate = new Date(reportFilters.monthTo);
          toDate.setMonth(toDate.getMonth() + 1);
          toDate.setDate(0);
          toDate.setHours(23, 59, 59, 999);
          if (createdDate > toDate) return false;
        }
        return true;
      });
    }

    // DITUKAR: Get unique channels (baris) dan years (kolom)
    const uniqueChannels = [...new Set(reportData.map(item => item.channel).filter(Boolean))].sort();
    const years = [...new Set(reportData.map(item => getYear(item.created_at)).filter(Boolean))];
    
    // Sort years chronologically
    const sortedYears = years.sort((a, b) => parseInt(a) - parseInt(b));

    // Build matrix - DITUKAR
    const matrix = {};
    const rowTotals = {}; // total per channel
    const columnTotals = {}; // total per year
    let grandTotal = 0;

    // Initialize matrix dengan channel sebagai baris
    uniqueChannels.forEach(channel => {
      matrix[channel] = {};
      rowTotals[channel] = 0;
      sortedYears.forEach(year => {
        matrix[channel][year] = 0;
      });
    });

    sortedYears.forEach(year => {
      columnTotals[year] = 0;
    });

    // Fill matrix
    reportData.forEach(item => {
      const channel = item.channel;
      const year = getYear(item.created_at);

      if (channel && year && matrix[channel] && matrix[channel][year] !== undefined) {
        matrix[channel][year]++;
        rowTotals[channel]++;
        columnTotals[year]++;
        grandTotal++;
      }
    });

    setPivotData({
      rows: uniqueChannels,        // channels sebagai baris
      columns: sortedYears,        // years sebagai kolom
      matrix: matrix,
      rowTotals: rowTotals,
      columnTotals: columnTotals,
      grandTotal: grandTotal,
    });
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/warranty/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filters: reportFilters,
          pivotData: pivotData 
        }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Warranty_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // Filter data for warranty and check-activation views
  const filteredData = data.filter(item => {
    // Channel filter
    if (filters.channel !== 'all' && item.channel !== filters.channel) {
      return false;
    }

    // Date filter
    if (filters.dateFrom || filters.dateTo) {
      const createdDate = item.created_at ? new Date(item.created_at) : null;
      if (createdDate) {
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (createdDate < fromDate) return false;
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (createdDate > toDate) return false;
        }
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchFields = selectedView === 'warranty'
        ? [item.order_number, item.full_name, item.whatsapp, item.email]
        : [item.so, item.nickname, item.whatsapp];
      
      return searchFields.some(field => 
        String(field || '').toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedView]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReportFilterChange = (key, value) => {
    setReportFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      channel: 'all',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  };

  const resetReportFilters = () => {
    setReportFilters({
      monthFrom: '',
      monthTo: '',
    });
  };

  const getCellColor = (value, maxValue) => {
    if (value === 0) return "bg-white";
    const intensity = value / maxValue;
    if (intensity > 0.7) return "bg-red-100 font-bold";
    if (intensity > 0.5) return "bg-orange-50";
    if (intensity > 0.3) return "bg-yellow-50";
    return "bg-green-50";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Warranty Data...</p>
        </div>
      </div>
    );
  }

  const maxRowValue = Math.max(...Object.values(pivotData.rowTotals || {}), 1);

  return (
    <div>
      <Header title="Warranty Management" />

      {/* View Selector */}
      <div className="card p-6 mb-6">
        <h2 className="text-2xl font-bold text-primary mb-4">Select View</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedView('warranty')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedView === 'warranty'
                ? 'bg-accent text-primary shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Data Warranty
          </button>
          <button
            onClick={() => setSelectedView('check-activation')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedView === 'check-activation'
                ? 'bg-accent text-primary shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Check Activation
          </button>
          <button
            onClick={() => setSelectedView('report')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedView === 'report'
                ? 'bg-accent text-primary shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Report
          </button>
        </div>
      </div>

      {/* Filters for Warranty and Check Activation */}
      {selectedView !== 'report' && (
        <div className="card p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Filters</h2>
            <button onClick={resetFilters} className="btn-secondary text-sm">
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Channel
              </label>
              <select
                value={filters.channel}
                onChange={(e) => handleFilterChange('channel', e.target.value)}
                className="input-field"
              >
                <option value="all">All Channels</option>
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={selectedView === 'warranty' ? 'Order, Name, WA, Email' : 'SO, Nickname, WA'}
                className="input-field"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters for Report */}
      {selectedView === 'report' && (
        <div className="card p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Report Filters</h2>
            <div className="flex gap-4">
              <button onClick={resetReportFilters} className="btn-secondary text-sm">
                Reset Filters
              </button>
              <button
                onClick={handleExportReport}
                disabled={exporting}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : '📥 Export to Excel'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Month From
              </label>
              <input
                type="month"
                value={reportFilters.monthFrom}
                onChange={(e) => handleReportFilterChange('monthFrom', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Month To
              </label>
              <input
                type="month"
                value={reportFilters.monthTo}
                onChange={(e) => handleReportFilterChange('monthTo', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary for data views */}
      {selectedView !== 'report' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="stat-card-accent">
            <h3 className="text-sm font-semibold text-primary/80 mb-2 uppercase">
              Total Records
            </h3>
            <div className="text-4xl font-bold text-primary">{filteredData.length}</div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase">
              Current Page
            </h3>
            <div className="text-4xl font-bold text-primary">{currentPage} / {totalPages || 1}</div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase">
              Showing
            </h3>
            <div className="text-4xl font-bold text-primary">
              {paginatedData.length} of {filteredData.length}
            </div>
          </div>
        </div>
      )}

      {/* Summary for report - UPDATED */}
      {selectedView === 'report' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="stat-card-accent">
            <h3 className="text-sm font-semibold text-primary/80 mb-2 uppercase">
              Total Channels
            </h3>
            <div className="text-4xl font-bold text-primary">{pivotData.rows?.length || 0}</div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase">
              Total Years
            </h3>
            <div className="text-4xl font-bold text-primary">{pivotData.columns?.length || 0}</div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase">
              Total Records
            </h3>
            <div className="text-4xl font-bold text-primary">{pivotData.grandTotal || 0}</div>
          </div>
        </div>
      )}

      {/* Data Table for Warranty and Check Activation */}
      {selectedView !== 'report' && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-primary">
              {selectedView === 'warranty' ? 'Warranty Data' : 'Check Activation Data'}
            </h2>
          </div>

          {paginatedData.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Found</h3>
              <p className="text-gray-500">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                {selectedView === 'warranty' ? (
                  <table className="w-full text-xs">
                    <thead className="bg-primary text-white">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Channel</th>
                        <th className="px-3 py-2 text-left font-semibold">Order Number</th>
                        <th className="px-3 py-2 text-left font-semibold">Full Name</th>
                        <th className="px-3 py-2 text-left font-semibold">WhatsApp</th>
                        <th className="px-3 py-2 text-left font-semibold">Email</th>
                        <th className="px-3 py-2 text-left font-semibold">Created At</th>
                        <th className="px-3 py-2 text-center font-semibold">Valid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                        >
                          <td className="px-3 py-2">{item.channel}</td>
                          <td className="px-3 py-2 font-medium">{item.order_number}</td>
                          <td className="px-3 py-2">{item.full_name}</td>
                          <td className="px-3 py-2">{item.whatsapp}</td>
                          <td className="px-3 py-2">{item.email}</td>
                          <td className="px-3 py-2">{formatDate(item.created_at)}</td>
                          <td className="px-3 py-2 text-center text-lg">
                            {String(item.valid_order).toUpperCase() === 'TRUE' ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-primary text-white">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold">Platform</th>
                        <th className="px-2 py-2 text-left font-semibold">SO</th>
                        <th className="px-2 py-2 text-left font-semibold">Nickname</th>
                        <th className="px-2 py-2 text-left font-semibold">WhatsApp</th>
                        <th className="px-2 py-2 text-left font-semibold">Date Order</th>
                        <th className="px-2 py-2 text-left font-semibold">SKU</th>
                        <th className="px-2 py-2 text-left font-semibold">Product Name</th>
                        <th className="px-2 py-2 text-center font-semibold">Expired</th>
                        <th className="px-2 py-2 text-center font-semibold">Claim</th>
                        <th className="px-2 py-2 text-left font-semibold">Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                        >
                          <td className="px-2 py-2">{item.platform}</td>
                          <td className="px-2 py-2 font-medium">{item.so}</td>
                          <td className="px-2 py-2">{item.nickname}</td>
                          <td className="px-2 py-2">{item.whatsapp}</td>
                          <td className="px-2 py-2">{item.date_order}</td>
                          <td className="px-2 py-2">{item.sku}</td>
                          <td className="px-2 py-2">{item.product_name}</td>
                          <td className="px-2 py-2 text-center text-lg">
                            {String(item.status_expired).toUpperCase() === 'TRUE' ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center text-lg">
                            {String(item.status_claim).toUpperCase() === 'TRUE' ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                          <td className="px-2 py-2">{formatDate(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-gray-200 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex gap-2">
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
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              currentPage === pageNum
                                ? 'bg-accent text-primary'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="px-2">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Report Pivot Table - DITUKAR */}
      {selectedView === 'report' && (
        <div className="card overflow-hidden">
          {pivotData.rows?.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Data Found
              </h3>
              <p className="text-gray-500">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-primary text-white text-left font-bold border border-gray-300 sticky left-0 z-10">
                      Channel
                    </th>
                    {pivotData.columns?.map((year, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 bg-primary text-white text-center font-bold border border-gray-300 min-w-[100px]"
                      >
                        {year}
                      </th>
                    ))}
                    <th className="px-4 py-3 bg-accent text-primary text-center font-bold border border-gray-300 min-w-[100px]">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pivotData.rows?.map((channel, rowIdx) => {
                    const rowTotal = pivotData.rowTotals?.[channel] || 0;
                    const rowColor = getCellColor(rowTotal, maxRowValue);

                    return (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border border-gray-300 font-semibold text-gray-800 sticky left-0 bg-white z-10">
                          {channel}
                        </td>
                        {pivotData.columns?.map((year, colIdx) => {
                          const value = pivotData.matrix?.[channel]?.[year] || 0;
                          return (
                            <td
                              key={colIdx}
                              className={`px-4 py-3 border border-gray-300 text-center ${
                                value > 0 ? 'text-gray-800' : 'text-gray-400'
                              }`}
                            >
                              {value > 0 ? value : '0'}
                            </td>
                          );
                        })}
                        <td
                          className={`px-4 py-3 border border-gray-300 text-center font-bold ${rowColor}`}
                        >
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-yellow-100 font-bold">
                    <td className="px-4 py-3 border border-gray-300 text-gray-800 sticky left-0 z-10 bg-yellow-100">
                      TOTAL
                    </td>
                    {pivotData.columns?.map((year, idx) => (
                      <td
                        key={idx}
                        className="px-4 py-3 border border-gray-300 text-center text-gray-800"
                      >
                        {pivotData.columnTotals?.[year] || 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 border border-gray-300 text-center bg-red-600 text-white text-lg">
                      {pivotData.grandTotal || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}