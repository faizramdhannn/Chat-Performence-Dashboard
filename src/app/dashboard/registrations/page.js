'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function RegistrationsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  
  const [permissions, setPermissions] = useState({
    dashboard: false,
    chat_creation: false,
    analytics: false,
    warranty: false,
    stock: false,
    registrations: false,
    user_management: false,
    settings: false,
  });

  const permissionLabels = {
    dashboard: 'Dashboard',
    chat_creation: 'Chat Creation',
    analytics: 'Analytics',
    warranty: 'Warranty',
    stock: 'Stock',
    registrations: 'Registration Requests',
    user_management: 'User Management',
    settings: 'Settings',
  };

  useEffect(() => {
    // PERBAIKAN: Pakai permission check, bukan role check
    checkPermission();
  }, [session]);

  const checkPermission = async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/user/permissions');
      const result = await response.json();
      
      if (!result.permissions?.registrations) {
        alert('Anda tidak memiliki akses ke Registration Requests. Hubungi admin untuk akses.');
        router.push('/dashboard');
        return;
      }
      
      // Jika punya permission, fetch registrations
      fetchRegistrations();
    } catch (error) {
      console.error('Error checking permission:', error);
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/registrations');
      const result = await response.json();
      setRegistrations(result.registrations || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPermissionsModal = (registration) => {
    setSelectedRegistration(registration);
    // Set default permissions (all false)
    setPermissions({
      dashboard: false,
      chat_creation: false,
      analytics: false,
      warranty: false,
      stock: false,
      registrations: false,
      user_management: false,
      settings: false,
    });
    setShowPermissionsModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRegistration) return;

    // Check if at least one permission is selected
    const hasPermissions = Object.values(permissions).some(p => p === true);
    if (!hasPermissions) {
      alert('Please select at least one permission');
      return;
    }

    if (!confirm(`Approve registration for ${selectedRegistration.name}?`)) return;

    setProcessing(selectedRegistration.id);

    try {
      const response = await fetch(`/api/registrations/${selectedRegistration.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: 'user', // Legacy field, tidak dipakai lagi
          ...permissions // Send all permissions
        }),
      });

      if (response.ok) {
        alert('Registration approved successfully!');
        setShowPermissionsModal(false);
        setSelectedRegistration(null);
        fetchRegistrations();
      } else {
        alert('Failed to approve registration');
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Terjadi kesalahan');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (registrationId) => {
    if (!confirm('Reject this registration request?')) return;

    setProcessing(registrationId);

    try {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Registration rejected');
        fetchRegistrations();
      } else {
        alert('Failed to reject registration');
      }
    } catch (error) {
      console.error('Error rejecting registration:', error);
      alert('Terjadi kesalahan');
    } finally {
      setProcessing(null);
    }
  };

  const selectAllPermissions = () => {
    setPermissions({
      dashboard: true,
      chat_creation: true,
      analytics: true,
      warranty: true,
      stock: true,
      registrations: false, // Usually don't give this to new users
      user_management: false, // Usually don't give this to new users
      settings: false, // Usually don't give this to new users
    });
  };

  const clearAllPermissions = () => {
    setPermissions({
      dashboard: false,
      chat_creation: false,
      analytics: false,
      warranty: false,
      stock: false,
      registrations: false,
      user_management: false,
      settings: false,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Registration Requests" />

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">Pending Registrations</h2>
            <p className="text-sm text-gray-600 mt-1">
              {registrations.length} pending request{registrations.length !== 1 ? 's' : ''}
            </p>
          </div>
          {registrations.length > 0 && (
            <div className="bg-accent/20 px-4 py-2 rounded-lg">
              <span className="text-primary font-semibold">{registrations.length} New</span>
            </div>
          )}
        </div>

        {registrations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Pending Registrations</h3>
            <p className="text-gray-500">All registration requests have been processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Username</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Requested At</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr
                    key={registration.id}
                    className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium">{registration.username}</td>
                    <td className="px-6 py-4 text-sm">{registration.name}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(registration.requestedAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openPermissionsModal(registration)}
                          disabled={processing === registration.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold disabled:opacity-50"
                        >
                          {processing === registration.id ? 'Processing...' : 'Set Permissions & Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(registration.id)}
                          disabled={processing === registration.id}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold disabled:opacity-50"
                        >
                          Reject
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

      {/* Permissions Modal */}
      {showPermissionsModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-primary mb-4">
              Set Permissions
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>User:</strong> {selectedRegistration.name} ({selectedRegistration.username})
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={selectAllPermissions}
                className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Select All (Basic)
              </button>
              <button
                onClick={clearAllPermissions}
                className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                    className="w-5 h-5 text-accent border-gray-300 rounded focus:ring-accent"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 block">{label}</span>
                    {(key === 'registrations' || key === 'user_management' || key === 'settings') && (
                      <span className="text-xs text-red-600">Admin only</span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Note:</strong> User will only see menu items they have permission to access.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedRegistration(null);
                }}
                className="btn-secondary flex-1"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {processing ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6 mt-8">
        <h3 className="text-lg font-bold text-primary mb-4">Permission Descriptions</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold whitespace-nowrap">Dashboard</span>
            <p className="text-sm text-gray-600">View chat performance data and statistics</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold whitespace-nowrap">Chat Creation</span>
            <p className="text-sm text-gray-600">Create and import chat performance data</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold whitespace-nowrap">Analytics</span>
            <p className="text-sm text-gray-600">View analytics reports and pivot tables</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold whitespace-nowrap">Warranty</span>
            <p className="text-sm text-gray-600">Access warranty management features</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold whitespace-nowrap">Stock</span>
            <p className="text-sm text-gray-600">Access stock management features</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold whitespace-nowrap">Registrations</span>
            <p className="text-sm text-gray-600">⚠️ Admin only - Approve/reject new user registrations</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold whitespace-nowrap">User Management</span>
            <p className="text-sm text-gray-600">⚠️ Admin only - Create, edit, delete users and manage permissions</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold whitespace-nowrap">Settings</span>
            <p className="text-sm text-gray-600">⚠️ Admin only - Manage system settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}