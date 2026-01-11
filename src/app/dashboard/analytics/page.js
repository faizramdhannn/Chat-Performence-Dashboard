"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    intentions: [],
    cases: [],
    channels: [],
    shifts: [],
    cs: [],
    closingStatus: [],
  });

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    shift: "all",
    cs: "all",
    channel: "all",
    closingStatus: "all",
  });

  // State untuk view selector
  const [selectedView, setSelectedView] = useState("intention");
  const [pivotData, setPivotData] = useState({
    rows: [],
    columns: [],
    matrix: {},
    totals: {},
  });

  // ===== STORE ANALYTICS STATES =====
  const [storePivotData, setStorePivotData] = useState({
    rows: [],
    stores: [],
    matrix: {},
    columnTotals: {},
    grandTotal: 0,
  });
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeCsList, setStoreCsList] = useState([]);
  const [storeChannelList, setStoreChannelList] = useState([]);

  const handleExport = async () => {
    setExporting(true);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Chat_Performance_Export_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Gagal export data");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [session]);

  useEffect(() => {
    if (selectedView === "intention" || selectedView === "case") {
      processPivotData();
    } else if (selectedView === "intensi-store" || selectedView === "case-store") {
      fetchStoreAnalytics();
    }
  }, [filters, data, selectedView]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics");
      const result = await response.json();

      setData(result.data || []);
      setFilterOptions(
        result.filterOptions || {
          intentions: [],
          cases: [],
          channels: [],
          shifts: [],
          cs: [],
          closingStatus: [],
        }
      );
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // ===== STORE ANALYTICS FETCH FUNCTION =====
  const fetchStoreAnalytics = async () => {
    setStoreLoading(true);
    try {
      const view = selectedView === "intensi-store" ? "intensi" : "case";
      const params = new URLSearchParams({
        view,
        startDate: filters.dateFrom,
        endDate: filters.dateTo,
        cs: filters.cs,
        channel: filters.channel,
      });

      const response = await fetch(`/api/analytics/store?${params}`);
      const result = await response.json();

      if (result.pivotMap && result.stores && result.rows) {
        const grandTotal = result.columnTotals?.total || 0;

        setStorePivotData({
          rows: result.rows,
          stores: result.stores,
          matrix: result.pivotMap,
          rowTotals: result.rows.reduce((acc, row) => {
            acc[row] = result.pivotMap[row]?.total || 0;
            return acc;
          }, {}),
          columnTotals: result.columnTotals,
          grandTotal: grandTotal,
        });

        // Set filter options
        setStoreCsList(result.csList || []);
        setStoreChannelList(result.stores || []);
      } else {
        setStorePivotData({
          rows: [],
          stores: [],
          matrix: {},
          rowTotals: {},
          columnTotals: {},
          grandTotal: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching store analytics:", error);
      setStorePivotData({
        rows: [],
        stores: [],
        matrix: {},
        rowTotals: {},
        columnTotals: {},
        grandTotal: 0,
      });
    } finally {
      setStoreLoading(false);
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const processPivotData = () => {
    let filtered = [...data];

    if (filters.dateFrom) {
      filtered = filtered.filter((item) => {
        const itemDate = parseDate(item.date);
        return itemDate && itemDate >= filters.dateFrom;
      });
    }
    if (filters.dateTo) {
      filtered = filtered.filter((item) => {
        const itemDate = parseDate(item.date);
        return itemDate && itemDate <= filters.dateTo;
      });
    }
    if (filters.shift !== "all") {
      filtered = filtered.filter((item) => item.shift === filters.shift);
    }
    if (filters.channel !== "all") {
      filtered = filtered.filter((item) => item.channel === filters.channel);
    }
    if (filters.cs !== "all") {
      filtered = filtered.filter((item) => item.cs === filters.cs);
    }
    if (filters.closingStatus !== "all") {
      filtered = filtered.filter(
        (item) => item.closing_status === filters.closingStatus
      );
    }

    const uniqueChannels = [
      ...new Set(filtered.map((item) => item.channel).filter(Boolean)),
    ].sort();
    const fieldName = selectedView === "intention" ? "intention" : "case";
    const uniqueRows = [
      ...new Set(filtered.map((item) => item[fieldName]).filter(Boolean)),
    ].sort();

    const matrix = {};
    const rowTotals = {};
    const columnTotals = {};
    let grandTotal = 0;

    uniqueRows.forEach((row) => {
      matrix[row] = {};
      rowTotals[row] = 0;
      uniqueChannels.forEach((col) => {
        matrix[row][col] = 0;
      });
    });

    uniqueChannels.forEach((col) => {
      columnTotals[col] = 0;
    });

    filtered.forEach((item) => {
      const row = item[fieldName];
      const col = item.channel;

      if (row && col && matrix[row] && matrix[row][col] !== undefined) {
        matrix[row][col]++;
        rowTotals[row]++;
        columnTotals[col]++;
        grandTotal++;
      }
    });

    setPivotData({
      rows: uniqueRows,
      columns: uniqueChannels,
      matrix: matrix,
      rowTotals: rowTotals,
      columnTotals: columnTotals,
      grandTotal: grandTotal,
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      shift: "all",
      channel: "all",
      cs: "all",
      closingStatus: "all",
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
          <p className="text-gray-600">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  const maxRowValue = Math.max(...Object.values(pivotData.rowTotals || {}), 1);
  const maxStoreRowValue = Math.max(...Object.values(storePivotData.rowTotals || {}), 1);

  // Tentukan apakah sedang di Store view
  const isStoreView = selectedView === "intensi-store" || selectedView === "case-store";

  return (
    <div>
      <Header title="Analytics Dashboard" />

      {/* Filters */}
      <div className="card p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary">Filters</h2>
          <button onClick={resetFilters} className="btn-secondary text-sm">
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
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
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              {isStoreView ? "Shift (N/A)" : "Shift"}
            </label>
            <select
              value={filters.shift}
              onChange={(e) => handleFilterChange("shift", e.target.value)}
              className="input-field"
              disabled={isStoreView}
            >
              <option value="all">All Shifts</option>
              {filterOptions.shifts.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Customer Service
            </label>
            <select
              value={filters.cs}
              onChange={(e) => handleFilterChange("cs", e.target.value)}
              className="input-field"
            >
              <option value="all">All CS</option>
              {(isStoreView ? storeCsList : filterOptions.cs).map((cs) => (
                <option key={cs} value={cs}>
                  {cs}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              {isStoreView ? "Store" : "Channel"}
            </label>
            <select
              value={filters.channel}
              onChange={(e) => handleFilterChange("channel", e.target.value)}
              className="input-field"
            >
              <option value="all">{isStoreView ? "All Stores" : "All Channels"}</option>
              {(isStoreView ? storeChannelList : filterOptions.channels).map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              {isStoreView ? "Closing Status (N/A)" : "Closing Status"}
            </label>
            <select
              value={filters.closingStatus}
              onChange={(e) =>
                handleFilterChange("closingStatus", e.target.value)
              }
              className="input-field"
              disabled={isStoreView}
            >
              <option value="all">All Status</option>
              {filterOptions.closingStatus.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "📥 Export to Excel"}
        </button>
      </div>

      {/* Summary - Dinamis berdasarkan view */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {isStoreView ? (
          <>
            {/* Store Analytics Summary */}
            <div className="stat-card-accent">
              <h3 className="text-sm text-center font-semibold text-primary/80 mb-2 uppercase">
                Total {selectedView === "intensi-store" ? "Products/Intensi" : "Status/Case"}
              </h3>
              <div className="text-4xl text-center font-bold text-primary">
                {storePivotData.rows?.length || 0}
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
                Total Stores
              </h3>
              <div className="text-4xl text-center font-bold text-primary">
                {storePivotData.stores?.length || 0}
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
                Total Records
              </h3>
              <div className="text-4xl text-center font-bold text-primary">
                {storePivotData.grandTotal || 0}
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
                Date Range
              </h3>
              <div className="text-sm text-center font-bold text-primary">
                {filters.dateFrom
                  ? new Date(filters.dateFrom).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "All"}
                {" → "}
                {filters.dateTo
                  ? new Date(filters.dateTo).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "All"}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Normal Pivot Summary */}
            <div className="stat-card-accent">
              <h3 className="text-sm text-center font-semibold text-primary/80 mb-2 uppercase">
                Total {selectedView === "intention" ? "Intentions" : "Cases"}
              </h3>
              <div className="text-4xl text-center font-bold text-primary">
                {pivotData.rows?.length || 0}
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
                Total Channels
              </h3>
              <div className="text-4xl text-center font-bold text-primary">
                {pivotData.columns?.length || 0}
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
                Total Records
              </h3>
              <div className="text-4xl text-center font-bold text-primary">
                {pivotData.grandTotal || 0}
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-sm text-center font-semibold text-gray-600 mb-2 uppercase">
                Date Range
              </h3>
              <div className="text-sm text-center font-bold text-primary">
                {filters.dateFrom
                  ? new Date(filters.dateFrom).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "All"}
                {" → "}
                {filters.dateTo
                  ? new Date(filters.dateTo).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "All"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Selector */}
      <div className="card p-6 mb-8">
        <h2 className="text-2xl font-bold text-primary mb-4">Select View</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setSelectedView("intention")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedView === "intention"
                ? "bg-accent text-primary shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Intention
          </button>
          <button
            onClick={() => setSelectedView("case")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedView === "case"
                ? "bg-accent text-primary shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Case
          </button>
          <button
            onClick={() => setSelectedView("intensi-store")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedView === "intensi-store"
                ? "bg-accent text-primary shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Intensi Store
          </button>
          <button
            onClick={() => setSelectedView("case-store")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedView === "case-store"
                ? "bg-accent text-primary shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Case Store
          </button>
        </div>
      </div>

      {/* Table Section - Dinamis berdasarkan view */}
      {isStoreView ? (
        // ===== STORE ANALYTICS PIVOT TABLE =====
        <div className="card overflow-hidden">
          {storeLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Store Data...</p>
            </div>
          ) : storePivotData.rows?.length === 0 ? (
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
                      {selectedView === "intensi-store" ? "By Intensi" : "By Case"}
                    </th>
                    {storePivotData.stores?.map((store, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 bg-primary text-white text-center font-bold border border-gray-300 min-w-[80px]"
                      >
                        {store}
                      </th>
                    ))}
                    <th className="px-4 py-3 bg-accent text-primary text-center font-bold border border-gray-300 min-w-[100px]">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {storePivotData.rows?.map((rowName, rowIdx) => {
                    const rowData = storePivotData.matrix[rowName] || {};
                    const rowTotal = storePivotData.rowTotals?.[rowName] || 0;
                    const rowColor = getCellColor(rowTotal, maxStoreRowValue);

                    return (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border border-gray-300 font-semibold text-gray-800 sticky left-0 bg-white z-10">
                          {rowName}
                        </td>
                        {storePivotData.stores?.map((store, colIdx) => {
                          const value = rowData[store] || 0;
                          return (
                            <td
                              key={colIdx}
                              className={`px-4 py-3 border border-gray-300 text-center ${
                                value > 0 ? "text-gray-800" : "text-gray-400"
                              }`}
                            >
                              {value > 0 ? value : "0"}
                            </td>
                          );
                        })}
                        <td className={`px-4 py-3 border border-gray-300 text-center font-bold ${rowColor}`}>
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-yellow-100 font-bold">
                    <td className="px-4 py-3 border border-gray-300 text-gray-800 sticky left-0 z-10 bg-yellow-100">
                      Total
                    </td>
                    {storePivotData.stores?.map((store, idx) => (
                      <td
                        key={idx}
                        className="px-4 py-3 border border-gray-300 text-center text-gray-800"
                      >
                        {storePivotData.columnTotals?.[store] || 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 border border-gray-300 text-center bg-red-600 text-white text-lg">
                      {storePivotData.grandTotal || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // ===== NORMAL PIVOT TABLE =====
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
                      {selectedView === "intention" ? "By Intensi" : "By Case"}
                    </th>
                    {pivotData.columns?.map((channel, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 bg-primary text-white text-center font-bold border border-gray-300 min-w-[80px]"
                      >
                        {channel}
                      </th>
                    ))}
                    <th className="px-4 py-3 bg-accent text-primary text-center font-bold border border-gray-300 min-w-[100px]">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pivotData.rows?.map((row, rowIdx) => {
                    const rowTotal = pivotData.rowTotals?.[row] || 0;
                    const rowColor = getCellColor(rowTotal, maxRowValue);

                    return (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border border-gray-300 font-semibold text-gray-800 sticky left-0 bg-white z-10">
                          {row}
                        </td>
                        {pivotData.columns?.map((col, colIdx) => {
                          const value = pivotData.matrix?.[row]?.[col] || 0;
                          return (
                            <td
                              key={colIdx}
                              className={`px-4 py-3 border border-gray-300 text-center ${
                                value > 0 ? "text-gray-800" : "text-gray-400"
                              }`}
                            >
                              {value > 0 ? value : "0"}
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
                      Total
                    </td>
                    {pivotData.columns?.map((col, idx) => (
                      <td
                        key={idx}
                        className="px-4 py-3 border border-gray-300 text-center text-gray-800"
                      >
                        {pivotData.columnTotals?.[col] || 0}
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

      {/* Top Items - Hanya untuk Intention/Case view */}
      {!isStoreView && pivotData.rows?.length > 0 && (
        <div className="card p-6 mt-8">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Top 5 {selectedView === "intention" ? "Intentions" : "Cases"} by
            Volume
          </h2>
          <div className="space-y-4">
            {pivotData.rows
              ?.slice()
              .sort(
                (a, b) =>
                  (pivotData.rowTotals?.[b] || 0) -
                  (pivotData.rowTotals?.[a] || 0)
              )
              .slice(0, 5)
              .map((row, idx) => {
                const total = pivotData.rowTotals?.[row] || 0;
                const percentage =
                  pivotData.grandTotal > 0
                    ? ((total / pivotData.grandTotal) * 100).toFixed(1)
                    : 0;

                return (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg text-primary">
                        #{idx + 1} {row}
                      </h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent">
                          {total}
                        </div>
                        <div className="text-sm text-gray-600">
                          {percentage}% of total
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {pivotData.columns?.map((channel, cIdx) => {
                        const count = pivotData.matrix?.[row]?.[channel] || 0;
                        if (count === 0) return null;
                        return (
                          <span
                            key={cIdx}
                            className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold"
                          >
                            {channel}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}