'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';

export default function CreatePage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Preview states
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Chat_Performance_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Gagal download template');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (!validTypes.includes(file.type)) {
        setUploadError('File harus berformat Excel (.xlsx atau .xls)');
        setUploadFile(null);
        return;
      }
      setUploadFile(file);
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handlePreview = async () => {
    if (!uploadFile) {
      setUploadError('Pilih file terlebih dahulu');
      return;
    }

    setPreviewing(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPreviewData(result);
        setShowPreview(true);
      } else {
        setUploadError('Failed to preview: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error previewing:', error);
      setUploadError('Gagal preview file: ' + error.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (previewData.hasErrors) {
      alert('Cannot upload file with errors. Please fix the errors first.');
      return;
    }

    setUploading(true);
    setShowPreview(false);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadSuccess(result.message);
        setUploadFile(null);
        setPreviewData(null);
        document.getElementById('fileInput').value = '';
        
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 2000);
      } else {
        setUploadError('Upload failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading:', error);
      setUploadError('Gagal upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Header title="Upload Data Chat" />

      {/* Upload Section */}
      <div className="card p-8 max-w-full mx-auto">
        <h2 className="text-2xl text-center font-bold text-primary mb-6">Bulk Upload via Excel</h2>
        
        <div className="bg-gray-100 border border-black rounded-lg p-4 mb-6">
          <p className="text-sm text-black mb-2">
            <strong>Cara Upload:</strong>
          </p>
          <ol className="text-sm text-black list-decimal list-inside space-y-1">
            <li>Download template Excel</li>
            <li>Isi data sesuai format (gunakan dropdown yang tersedia)</li>
            <li>Upload file yang sudah diisi</li>
            <li>Preview data untuk melihat hasil dan validasi</li>
            <li>Konfirmasi upload jika tidak ada error</li>
          </ol>
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={handleDownloadTemplate} className="btn-secondary">
            📄 Download Template
          </button>
        </div>

        {uploadError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 whitespace-pre-wrap">
            {uploadError}
          </div>
        )}

        {uploadSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            {uploadSuccess}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Pilih File Excel
            </label>
            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="input-field"
            />
            {uploadFile && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handlePreview}
            disabled={!uploadFile || previewing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {previewing ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Previewing...
              </div>
            ) : (
              '🔍 Preview Data'
            )}
          </button>
        </div>
      </div>

      {/* Loading Overlay for Upload */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <svg className="animate-spin h-16 w-16 mx-auto mb-4 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-xl font-bold text-primary mb-2">Uploading Data...</h3>
              <p className="text-gray-600">Mohon tunggu, sedang mengupload data Anda</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-primary text-white p-6">
              <h2 className="text-2xl font-bold">📋 Preview Import Data</h2>
              <p className="text-sm mt-1">Review your data before uploading</p>
            </div>

            {/* Summary */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Rows</p>
                  <p className="text-3xl font-bold text-primary">{previewData.totalRows}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Valid Rows</p>
                  <p className="text-3xl font-bold text-green-600">{previewData.validRows}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Error Rows</p>
                  <p className="text-3xl font-bold text-red-600">{previewData.errorRows}</p>
                </div>
              </div>
            </div>

            {/* Errors List */}
            {previewData.hasErrors && (
              <div className="p-6 bg-red-50 border-b border-red-200">
                <h3 className="font-bold text-red-800 mb-3">
                  ❌ Validation Errors ({previewData.errors.length})
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {previewData.errors.slice(0, 20).map((error, idx) => (
                    <p key={idx} className="text-sm text-red-700">• {error}</p>
                  ))}
                  {previewData.errors.length > 20 && (
                    <p className="text-sm text-red-700 font-semibold">
                      ... and {previewData.errors.length - 20} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="flex-1 overflow-auto p-6">
              <h3 className="font-bold text-primary mb-3">First 10 Rows Preview:</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left border">#</th>
                      <th className="px-3 py-2 text-left border">Status</th>
                      <th className="px-3 py-2 text-left border">Date</th>
                      <th className="px-3 py-2 text-left border">Shift</th>
                      <th className="px-3 py-2 text-left border">CS</th>
                      <th className="px-3 py-2 text-left border">Channel</th>
                      <th className="px-3 py-2 text-left border">Name</th>
                      <th className="px-3 py-2 text-left border">Closing Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={row.status === 'error' ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}
                      >
                        <td className="px-3 py-2 border">{row.rowNumber}</td>
                        <td className="px-3 py-2 border">
                          {row.status === 'valid' ? (
                            <span className="text-green-600 font-semibold">✓ Valid</span>
                          ) : (
                            <span className="text-red-600 font-semibold">✗ Error</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 border ${row.dateStatus === 'error' ? 'text-red-600 font-semibold' : ''}`}>
                          {row.data.date}
                        </td>
                        <td className="px-3 py-2 border">{row.data.shift}</td>
                        <td className="px-3 py-2 border">{row.data.cs}</td>
                        <td className="px-3 py-2 border">{row.data.channel}</td>
                        <td className="px-3 py-2 border">{row.data.name}</td>
                        <td className="px-3 py-2 border">{row.data.closing_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewData.preview.length > 0 && previewData.preview[0].errors && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Row-level Errors:</h4>
                  {previewData.preview.filter(r => r.errors.length > 0).map((row) => (
                    <div key={row.rowNumber} className="mb-2 text-sm">
                      <span className="font-semibold text-red-600">Row {row.rowNumber}:</span>
                      <ul className="list-disc list-inside ml-4 text-red-700">
                        {row.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={previewData.hasErrors || uploading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </div>
                ) : (
                  `✅ Confirm Upload (${previewData.validRows} rows)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}