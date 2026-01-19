"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { QRCodeCanvas } from "qrcode.react";

export default function StockPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState({});
  const barcodeRef = useRef(null);

  // View selector: 'stock' atau 'master'
  const [selectedView, setSelectedView] = useState("stock");

  // Data states
  const [stockData, setStockData] = useState([]);
  const [masterStockData, setMasterStockData] = useState([]);

  const [categories, setCategories] = useState([]);
  const [grades, setGrades] = useState([]);
  const [hpjValues, setHpjValues] = useState([]);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState({
    shopify: null,
    javelin: null,
    threshold: null,
  });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Edit/Add Master Stock
  const [editingMaster, setEditingMaster] = useState(null);
  const [showMasterForm, setShowMasterForm] = useState(false);
  const [masterForm, setMasterForm] = useState({
    SKU: "",
    Product_name: "",
    Category: "",
    Grade: "",
    HPP: "",
    HPJ: "",
    image_url: "",
  });
  const [savingMaster, setSavingMaster] = useState(false);

  // Barcode modal states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState(null);

  // Last update
  const [lastUpdate, setLastUpdate] = useState({
    shopify: null,
    javelin: null,
    threshold: null,
  });

  // Filter states
  const [filters, setFilters] = useState({
    category: "all",
    grade: "all",
    hpj: "all",
    search: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    checkPermission();
  }, [session]);

  useEffect(() => {
    if (selectedView === "stock") {
      fetchStockData();
    } else {
      fetchMasterStockData();
    }
  }, [selectedView]);

  const checkPermission = async () => {
    if (!session) return;

    try {
      const response = await fetch("/api/user/permissions");
      const result = await response.json();

      if (!result.permissions?.stock) {
        alert(
          "Anda tidak memiliki akses ke fitur Stock. Hubungi Faiz jika ingin mengakses.",
        );
        router.push("/dashboard");
        return;
      }

      setPermissions(result.permissions || {});
      fetchStockData();
      fetchLastUpdate();
    } catch (error) {
      console.error("Error checking permission:", error);
    }
  };

  const fetchStockData = async () => {
    try {
      const response = await fetch("/api/stock");
      const result = await response.json();

      const validData = (result.data || []).filter(
        (item) => item.Product_name && item.Product_name.trim() !== "",
      );

      setStockData(validData);
      updateFilterOptions(validData);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }
  };

  const fetchMasterStockData = async () => {
    try {
      const response = await fetch("/api/stock/master");
      const result = await response.json();
      setMasterStockData(result.data || []);
      updateFilterOptions(result.data || []);
    } catch (error) {
      console.error("Error fetching master stock data:", error);
    }
  };

  const updateFilterOptions = (data) => {
    const uniqueCategories = [
      ...new Set(data.map((item) => item.Category).filter(Boolean)),
    ].sort();
    const uniqueGrades = [
      ...new Set(data.map((item) => item.Grade).filter(Boolean)),
    ].sort();
    const uniqueHpj = [
      ...new Set(data.map((item) => item.HPJ).filter(Boolean)),
    ].sort();

    setCategories(uniqueCategories);
    setGrades(uniqueGrades);
    setHpjValues(uniqueHpj);
  };

  const fetchLastUpdate = async () => {
    try {
      const response = await fetch("/api/stock/last-update");
      const result = await response.json();
      setLastUpdate(result.lastUpdate || {});
    } catch (error) {
      console.error("Error fetching last update:", error);
    }
  };

  const openImportModal = () => {
    setImportFiles({
      shopify: null,
      javelin: null,
      threshold: null,
    });
    setShowImportModal(true);
  };

  const handleFileSelect = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (!validTypes.includes(file.type)) {
        alert("File harus berformat Excel (.xlsx, .xls) atau CSV");
        return;
      }
      setImportFiles((prev) => ({ ...prev, [type]: file }));
    }
  };

  const handleImport = async () => {
    const filesToImport = Object.entries(importFiles).filter(
      ([_, file]) => file !== null,
    );

    if (filesToImport.length === 0) {
      alert("Pilih minimal 1 file untuk diimport");
      return;
    }

    setImporting(true);

    try {
      for (const [type, file] of filesToImport) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const response = await fetch("/api/stock/import", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            `Import ${type} gagal: ` + (result.error || "Unknown error"),
          );
        }
      }

      alert(`Import berhasil! ${filesToImport.length} file diimport.`);
      setShowImportModal(false);
      setImportFiles({ shopify: null, javelin: null, threshold: null });
      fetchStockData();
      fetchLastUpdate();
    } catch (error) {
      console.error("Error importing:", error);
      alert("Gagal import data: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const response = await fetch("/api/stock/export", {
        method: "POST",
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Stock ${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const handleAddNew = () => {
    setEditingMaster(null);
    setMasterForm({
      SKU: "",
      Product_name: "",
      Category: "",
      Grade: "",
      HPP: "",
      HPJ: "",
      image_url: "",
    });
    setShowMasterForm(true);
  };

  const handleEdit = (item) => {
    setEditingMaster(item);
    setMasterForm({
      SKU: item.SKU || "",
      Product_name: item.Product_name || "",
      Category: item.Category || "",
      Grade: item.Grade || "",
      HPP: item.HPP || "",
      HPJ: item.HPJ || "",
      image_url: item.image_url || "",
    });
    setShowMasterForm(true);
  };

  const handleSaveMaster = async () => {
    if (!masterForm.SKU || !masterForm.Product_name) {
      alert("SKU dan Product Name wajib diisi");
      return;
    }

    setSavingMaster(true);

    try {
      const url = editingMaster
        ? `/api/stock/master/${editingMaster.rowIndex}`
        : "/api/stock/master";

      const method = editingMaster ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(masterForm),
      });

      if (response.ok) {
        alert(
          editingMaster
            ? "Data berhasil diupdate"
            : "Data berhasil ditambahkan",
        );
        setShowMasterForm(false);
        setEditingMaster(null);
        setMasterForm({
          SKU: "",
          Product_name: "",
          Category: "",
          Grade: "",
          HPP: "",
          HPJ: "",
          image_url: "",
        });
        fetchMasterStockData();
      } else {
        alert("Gagal menyimpan data");
      }
    } catch (error) {
      console.error("Error saving master stock:", error);
      alert("Gagal menyimpan data");
    } finally {
      setSavingMaster(false);
    }
  };

  const handleDeleteMaster = async (rowIndex) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

    try {
      const response = await fetch(`/api/stock/master/${rowIndex}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Data berhasil dihapus");
        fetchMasterStockData();
      } else {
        alert("Gagal menghapus data");
      }
    } catch (error) {
      console.error("Error deleting master stock:", error);
      alert("Gagal menghapus data");
    }
  };

  const openBarcodeModal = (item) => {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const year = now.getFullYear();

    setSelectedItemForBarcode({
      ...item,
      quarter: `Q${quarter}`,
      year: year,
    });
    setShowBarcodeModal(true);
  };

  const handleDownloadBarcode = () => {
    if (!barcodeRef.current) return;

    // Ambil QR Code canvas
    const qrCanvas = barcodeRef.current.querySelector("canvas");
    if (!qrCanvas) return;

    // Create final canvas dengan ukuran label
    const canvas = document.createElement("canvas");
    const dpi = 300;
    const widthCm = 3.5;
    const heightCm = 2;
    const widthPx = (widthCm * dpi) / 2.54;
    const heightPx = (heightCm * dpi) / 2.54;

    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Draw outer border (KOTAK)
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, widthPx - 10, heightPx - 10);

    const padding = 25;

    // Left side - Quarter & Year
    ctx.fillStyle = "black";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "left";
    ctx.fillText(selectedItemForBarcode.quarter, padding, padding + 35);
    ctx.fillText(selectedItemForBarcode.year, padding, padding + 70);

    // Right side - SKU, Product Name, HPJ
    const rightX = widthPx - padding;
    const lineHeight = 26;
    let currentY = padding + 25;

    ctx.textAlign = "right";
    ctx.font = "bold 15px Arial";
    ctx.fillText(`SKU: ${selectedItemForBarcode.SKU}`, rightX, currentY);

    currentY += lineHeight;
    ctx.font = "13px Arial";
    const productName =
      selectedItemForBarcode.Product_name.length > 16
        ? selectedItemForBarcode.Product_name.substring(0, 16) + "..."
        : selectedItemForBarcode.Product_name;
    ctx.fillText(productName, rightX, currentY);

    currentY += lineHeight;
    ctx.font = "bold 15px Arial";
    ctx.fillText(selectedItemForBarcode.HPJ, rightX, currentY);

    // Bottom - QR Code (KOTAK PERSEGI seperti QRIS)
    const qrSize = 120; // Ukuran QR Code
    const qrX = (widthPx - qrSize) / 2; // Center horizontal
    const qrY = heightPx - qrSize - 20; // 20px dari bawah

    // Draw QR Code
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `barcode_${selectedItemForBarcode.SKU}_${selectedItemForBarcode.quarter}_${selectedItemForBarcode.year}.png`;
      link.click();
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      category: "all",
      grade: "all",
      hpj: "all",
      search: "",
    });
    setCurrentPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const currentData = selectedView === "stock" ? stockData : masterStockData;

  const filteredData = currentData
    .filter((item) => {
      if (filters.category !== "all" && item.Category !== filters.category)
        return false;
      if (filters.grade !== "all" && item.Grade !== filters.grade) return false;
      if (filters.hpj !== "all" && item.HPJ !== filters.hpj) return false;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const sku = String(item.SKU || "").toLowerCase();
        const productName = String(item.Product_name || "").toLowerCase();
        if (!sku.includes(searchLower) && !productName.includes(searchLower))
          return false;
      }

      return true;
    })
    .sort((a, b) => {
      const gradeCompare = String(a.Grade || "").localeCompare(
        String(b.Grade || ""),
      );
      if (gradeCompare !== 0) return gradeCompare;

      const pcaA = parseFloat(a.PCA) || 0;
      const pcaB = parseFloat(b.PCA) || 0;
      return pcaB - pcaA;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const canViewStock = permissions.stock;
  const canViewMaster = permissions.stock;
  const canManageMaster = permissions.registrations;
  return (
    <div>
      <Header title="Stock Management" />

      {/* Import/Export Section */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center gap-4">
          <div className="flex gap-3">
            {canManageMaster && (
              <button
                onClick={openImportModal}
                className="btn-primary text-sm px-4 py-2"
              >
                📥 Import Data
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "📤 Export Stock"}
            </button>
          </div>

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

      {/* View Selector */}
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">
              Select Data Source
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedView("stock");
                  setCurrentPage(1);
                  setShowMasterForm(false);
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedView === "stock"
                    ? "bg-accent text-primary shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                📦 Stock
              </button>
              {canViewMaster && (
                <button
                  onClick={() => {
                    setSelectedView("master");
                    setCurrentPage(1);
                    setShowMasterForm(false);
                  }}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedView === "master"
                      ? "bg-accent text-primary shadow-lg"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  🔧 Master Stock
                </button>
              )}
            </div>
          </div>

          {selectedView === "master" && canManageMaster && (
            <button onClick={handleAddNew} className="btn-primary">
              + Add New Master Stock
            </button>
          )}
        </div>
      </div>

      {selectedView === "master" && !canManageMaster && (
        <div className="card p-4 mb-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">
                View Only Mode
              </h3>
              <p className="text-sm text-blue-700">
                Anda dapat melihat data Master Stock, tetapi tidak dapat
                mengedit, menghapus, atau menambah data. Hubungi admin untuk
                mendapatkan akses penuh.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedView === "master" && showMasterForm && canManageMaster && (
        <div className="card p-6 mb-6 bg-purple-50 border-2 border-purple-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-primary">
              {editingMaster
                ? "✏️ Edit Master Stock"
                : "➕ Add New Master Stock"}
            </h3>
            <button
              onClick={() => {
                setShowMasterForm(false);
                setEditingMaster(null);
              }}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                SKU *
              </label>
              <input
                type="text"
                value={masterForm.SKU}
                onChange={(e) =>
                  setMasterForm({ ...masterForm, SKU: e.target.value })
                }
                className="input-field"
                placeholder="SKU"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={masterForm.Product_name}
                onChange={(e) =>
                  setMasterForm({ ...masterForm, Product_name: e.target.value })
                }
                className="input-field"
                placeholder="Product Name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Category
              </label>
              <input
                type="text"
                value={masterForm.Category}
                onChange={(e) =>
                  setMasterForm({ ...masterForm, Category: e.target.value })
                }
                className="input-field"
                placeholder="Category"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Grade
              </label>
              <input
                type="text"
                value={masterForm.Grade}
                onChange={(e) =>
                  setMasterForm({ ...masterForm, Grade: e.target.value })
                }
                className="input-field"
                placeholder="Grade"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                HPP
              </label>
              <input
                type="text"
                value={masterForm.HPP}
                onChange={(e) =>
                  setMasterForm({ ...masterForm, HPP: e.target.value })
                }
                className="input-field"
                placeholder="HPP"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                HPJ
              </label>
              <input
                type="text"
                value={masterForm.HPJ}
                onChange={(e) =>
                  setMasterForm({ ...masterForm, HPJ: e.target.value })
                }
                className="input-field"
                placeholder="HPJ"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-primary mb-2">
                Image URL
              </label>
              <input
                type="text"
                value={masterForm.image_url}
                onChange={(e) =>
                  setMasterForm({ ...masterForm, image_url: e.target.value })
                }
                className="input-field"
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Link gambar produk (opsional)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowMasterForm(false);
                setEditingMaster(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMaster}
              disabled={savingMaster}
              className="btn-primary disabled:opacity-50"
            >
              {savingMaster ? "Saving..." : editingMaster ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-primary">Filters</h2>
          <button
            onClick={resetFilters}
            className="btn-secondary text-xs px-3 py-1"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Grade
            </label>
            <select
              value={filters.grade}
              onChange={(e) => handleFilterChange("grade", e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All Grades</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              HPJ
            </label>
            <select
              value={filters.hpj}
              onChange={(e) => handleFilterChange("hpj", e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All HPJ</option>
              {hpjValues.map((hpj) => (
                <option key={hpj} value={hpj}>
                  {hpj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="SKU atau Product Name"
              className="input-field text-sm py-2"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card-accent p-3">
          <h3 className="text-xs text-center font-semibold text-primary/80 mb-1 uppercase">
            Total Items
          </h3>
          <div className="text-2xl font-bold text-center text-primary">
            {filteredData.length}
          </div>
        </div>
        <div className="stat-card p-3">
          <h3 className="text-xs text-center font-semibold text-gray-600 mb-1 uppercase">
            Current Page
          </h3>
          <div className="text-2xl font-bold text-center text-primary">
            {currentPage} / {totalPages || 1}
          </div>
        </div>
        <div className="stat-card p-3">
          <h3 className="text-xs text-center font-semibold text-gray-600 mb-1 uppercase">
            Showing
          </h3>
          <div className="text-2xl font-bold text-center text-primary">
            {paginatedData.length} of {filteredData.length}
          </div>
        </div>
      </div>
      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-primary">
            {selectedView === "stock"
              ? "📦 Stock Data"
              : "🔧 Master Stock Data"}
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            {selectedView === "stock"
              ? "Data from stock sheet - Sorted by Grade (A-Z), then PCA (High to Low)"
              : `Master data untuk SKU, Product, Category, Grade, HPP, HPJ ${!canManageMaster ? "(View Only)" : ""}`}
          </p>
        </div>

        {paginatedData.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Data Found
            </h3>
            <p className="text-sm text-gray-500">
              {selectedView === "master" && canManageMaster
                ? 'Click "Add New Master Stock" to add data'
                : "Try adjusting your filters or import data"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-2 py-2 text-center font-semibold">SKU</th>
                    <th className="px-2 py-2 text-center font-semibold">
                      Product Name
                    </th>
                    <th className="px-2 py-2 text-center font-semibold">
                      Category
                    </th>
                    <th className="px-2 py-2 text-center font-semibold">
                      Grade
                    </th>
                    {selectedView === "stock" && (
                      <>
                        <th className="px-2 py-2 text-center font-semibold">
                          PCA
                        </th>
                        <th className="px-2 py-2 text-center font-semibold">
                          Shopify
                        </th>
                        <th className="px-2 py-2 text-center font-semibold">
                          Threshold
                        </th>
                        <th className="px-2 py-2 text-center font-semibold">
                          HPP
                        </th>
                        <th className="px-2 py-2 text-center font-semibold">
                          HPT
                        </th>
                      </>
                    )}
                    {selectedView === "master" && (
                      <th className="px-2 py-2 text-center font-semibold">
                        HPP
                      </th>
                    )}
                    <th className="px-2 py-2 text-center font-semibold">HPJ</th>
                    {selectedView === "master" && (
                      <th className="px-2 py-2 text-center font-semibold">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                    >
                      <td className="px-2 text-center py-2 font-medium">
                        {item.SKU}
                      </td>
                      <td className="px-2 py-2">{item.Product_name}</td>
                      <td className="px-2 text-center py-2">{item.Category}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          {item.Grade}
                        </span>
                      </td>
                      {selectedView === "stock" && (
                        <>
                          <td className="px-2 py-2 text-center font-semibold">
                            {item.PCA}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {item.Shopify}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {item.Threshold}
                          </td>
                          <td className="px-2 py-2 text-center">{item.HPP}</td>
                          <td className="px-2 py-2 text-center">{item.HPT}</td>
                        </>
                      )}
                      {selectedView === "master" && (
                        <td className="px-2 py-2 text-center">{item.HPP}</td>
                      )}
                      <td className="px-2 py-2 text-center font-semibold text-green-700">
                        {item.HPJ}
                      </td>
                      {selectedView === "master" && (
                        <td className="px-2 py-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => openBarcodeModal(item)}
                              className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                            >
                              🏷️ View
                            </button>
                            {canManageMaster && (
                              <>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteMaster(item.rowIndex)
                                  }
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                >
                                  Del
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
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
                              ? "bg-accent text-primary"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return (
                        <span key={pageNum} className="px-1 text-xs">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
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

      {/* Barcode Modal */}
      {showBarcodeModal && selectedItemForBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
            <div className="bg-primary text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-2xl font-bold">Product Barcode</h2>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-white hover:text-accent text-3xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Product Image */}
              {selectedItemForBarcode.image_url && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={selectedItemForBarcode.image_url}
                    alt={selectedItemForBarcode.Product_name}
                    className="w-48 h-48 object-contain border-2 border-gray-200 rounded-lg"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Product Info */}
              <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm font-semibold text-gray-600">
                    SKU:
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {selectedItemForBarcode.SKU}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm font-semibold text-gray-600">
                    Product:
                  </span>
                  <span className="text-sm font-medium text-gray-800 max-w-xs text-right">
                    {selectedItemForBarcode.Product_name}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm font-semibold text-gray-600">
                    Price (HPJ):
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {selectedItemForBarcode.HPJ}
                  </span>
                </div>
              </div>

              {/* QR Code Preview dengan Border KOTAK */}
              <div
                className="bg-white border-4 border-gray-800 rounded p-3 mb-4"
                style={{ width: "350px", height: "200px", margin: "0 auto" }}
                ref={barcodeRef}
              >
                <div className="h-full flex flex-col justify-between">
                  {/* Top Section - Quarter/Year di kiri, Info di kanan */}
                  <div className="flex justify-between items-start">
                    {/* Left - Quarter & Year */}
                    <div className="text-left">
                      <div className="text-xs font-bold text-gray-800">
                        {selectedItemForBarcode.quarter}
                      </div>
                      <div className="text-xs font-bold text-gray-800">
                        {selectedItemForBarcode.year}
                      </div>
                    </div>

                    {/* Right - SKU, Product, Price */}
                    <div className="text-center">
                      <div className="text-xs font-bold text-gray-800">
                        SKU: {selectedItemForBarcode.SKU}
                      </div>
                      <div
                        className="text-xs text-gray-700"
                        style={{ maxWidth: "150px" }}
                      >
                        {selectedItemForBarcode.Product_name.length > 16
                          ? selectedItemForBarcode.Product_name.substring(
                              0,
                              16,
                            ) + "..."
                          : selectedItemForBarcode.Product_name}
                      </div>
                      <div className="text-xs font-bold text-gray-800">
                        {selectedItemForBarcode.HPJ}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section - QR Code (KOTAK PERSEGI seperti QRIS) */}
                  <div className="flex justify-center items-end pb-2">
                    <QRCodeCanvas
                      value={selectedItemForBarcode.SKU}
                      size={100}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadBarcode}
                className="btn-primary w-full"
              >
                Download Barcode
              </button>

              <p className="text-xs text-gray-500 text-center mt-2">
                QR Code format: PNG, 300 DPI, Ready to print
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
            <div className="bg-primary text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">Import Data</h2>
              <p className="text-sm mt-1">
                Upload Excel (.xlsx, .xls) atau CSV
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  📦 Shopify Data
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect("shopify", e)}
                  className="input-field text-sm"
                />
                {importFiles.shopify && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {importFiles.shopify.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  🎯 Javelin Data
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect("javelin", e)}
                  className="input-field text-sm"
                />
                {importFiles.javelin && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {importFiles.javelin.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  ⚡ Threshold Data
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect("threshold", e)}
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
                  <strong>⚠️ Warning:</strong> Data lama di sheet akan dihapus
                  dan diganti dengan data baru.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFiles({
                      shopify: null,
                      javelin: null,
                      threshold: null,
                    });
                  }}
                  className="btn-secondary flex-1"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={
                    importing ||
                    (!importFiles.shopify &&
                      !importFiles.javelin &&
                      !importFiles.threshold)
                  }
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
