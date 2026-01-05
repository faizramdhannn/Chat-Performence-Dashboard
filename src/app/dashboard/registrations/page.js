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
  const [selectedRole, setSelectedRole] = useState({});

  useEffect(() => {
    // Check if user is super admin
    if (session && session.user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchRegistrations();
  }, [session]);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/registrations');
      const result = await response.json();
      setRegistrations(result.registrations || []);
      
      // Initialize selected roles
      const roles = {};
      result.registrations?.forEach(reg => {
        roles[reg.id] = 'cs'; // Default role
      });
      setSelectedRole(roles);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registrationId) => {
    const role = selectedRole[registrationId];
    if (!role) {
      alert('Please select a role');
      return;
    }

    if (!confirm(`Approve this registration as ${role}?`)) return;

    setProcessing(registrationId);

    try {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        alert('Registration approved successfully!');
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
                  <th className="px-6 py-4 text-left text-sm font-semibold">Assign Role</th>
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
                      <select
                        value={selectedRole[registration.id] || 'cs'}
                        onChange={(e) => setSelectedRole({
                          ...selectedRole,
                          [registration.id]: e.target.value
                        })}
                        className="input-field py-2"
                        disabled={processing === registration.id}
                      >
                        <option value="cs">CS</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(registration.id)}
                          disabled={processing === registration.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold disabled:opacity-50"
                        >
                          {processing === registration.id ? 'Processing...' : 'Approve'}
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

      <div className="card p-6 mt-8">
        <h3 className="text-lg font-bold text-primary mb-4">Role Descriptions</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">Super Admin</span>
            <p className="text-sm text-gray-600">Full access including user management and system settings</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Admin</span>
            <p className="text-sm text-gray-600">Can view, create, edit, and delete chat data. No access to settings.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">CS</span>
            <p className="text-sm text-gray-600">Can view and create chat data only. Cannot edit or delete.</p>
          </div>
        </div>
      </div>
    </div>
  );
}