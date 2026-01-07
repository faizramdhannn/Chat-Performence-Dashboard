'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function UsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [userActivity, setUserActivity] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
  });
  
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
    checkPermission();
  }, [session]);

  // Auto-refresh user activity every 30 seconds
  useEffect(() => {
    if (users.length > 0) {
      fetchUserActivity();
      
      const interval = setInterval(() => {
        fetchUserActivity();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [users.length]);

  const checkPermission = async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/user/permissions');
      const result = await response.json();
      
      if (!result.permissions?.userManagement) {
        alert('Anda tidak memiliki akses ke User Management. Hubungi admin untuk akses.');
        router.push('/dashboard');
        return;
      }
      
      fetchUsers();
    } catch (error) {
      console.error('Error checking permission:', error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      setUsers(result.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async () => {
    try {
      const response = await fetch('/api/user/activity');
      const result = await response.json();
      
      // Convert array to object for easy lookup
      const activityMap = {};
      result.users?.forEach(user => {
        activityMap[user.username] = {
          isOnline: user.isOnline,
          minutesAgo: user.minutesAgo,
          lastActivity: user.lastActivity
        };
      });
      
      setUserActivity(activityMap);
    } catch (error) {
      console.error('Error fetching user activity:', error);
    }
  };

  const getOnlineStatus = (username) => {
    const activity = userActivity[username];
    if (!activity) return { status: 'unknown', text: 'Unknown', color: 'bg-gray-400' };
    
    if (activity.isOnline) {
      return { status: 'online', text: 'Online', color: 'bg-green-500' };
    }
    
    if (activity.minutesAgo === null) {
      return { status: 'never', text: 'Never logged in', color: 'bg-gray-400' };
    }
    
    if (activity.minutesAgo < 60) {
      return { 
        status: 'recent', 
        text: `${activity.minutesAgo}m ago`, 
        color: 'bg-yellow-500' 
      };
    }
    
    if (activity.minutesAgo < 1440) { // < 24 hours
      const hours = Math.floor(activity.minutesAgo / 60);
      return { 
        status: 'hours', 
        text: `${hours}h ago`, 
        color: 'bg-orange-500' 
      };
    }
    
    const days = Math.floor(activity.minutesAgo / 1440);
    return { 
      status: 'days', 
      text: `${days}d ago`, 
      color: 'bg-red-500' 
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const dataToSend = {
        ...formData,
        ...permissions
      };

      if (editingUser) {
        Object.assign(dataToSend, editingUser);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (response.ok) {
        fetchUsers();
        setShowModal(false);
        resetForm();
      } else {
        alert(result.error || 'Gagal menyimpan user');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionsSave = async () => {
    if (!selectedUserForPermissions) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedUserForPermissions.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedUserForPermissions,
          ...permissions
        }),
      });

      const result = await response.json();

      if (response.ok) {
        fetchUsers();
        setShowPermissionsModal(false);
        setSelectedUserForPermissions(null);
      } else {
        alert(result.error || 'Gagal menyimpan permissions');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Gagal menghapus user');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
    });
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
    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
    });
    setPermissions({
      dashboard: user.dashboard === 'TRUE' || user.dashboard === true,
      chat_creation: user.chat_creation === 'TRUE' || user.chat_creation === true,
      analytics: user.analytics === 'TRUE' || user.analytics === true,
      warranty: user.warranty === 'TRUE' || user.warranty === true,
      stock: user.stock === 'TRUE' || user.stock === true,
      registrations: user.registrations === 'TRUE' || user.registrations === true,
      user_management: user.user_management === 'TRUE' || user.user_management === true,
      settings: user.settings === 'TRUE' || user.settings === true,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openPermissionsModal = (user) => {
    setSelectedUserForPermissions(user);
    setPermissions({
      dashboard: user.dashboard === 'TRUE' || user.dashboard === true,
      chat_creation: user.chat_creation === 'TRUE' || user.chat_creation === true,
      analytics: user.analytics === 'TRUE' || user.analytics === true,
      warranty: user.warranty === 'TRUE' || user.warranty === true,
      stock: user.stock === 'TRUE' || user.stock === true,
      registrations: user.registrations === 'TRUE' || user.registrations === true,
      user_management: user.user_management === 'TRUE' || user.user_management === true,
      settings: user.settings === 'TRUE' || user.settings === true,
    });
    setShowPermissionsModal(true);
  };

  const getPermissionsSummary = (user) => {
    const activePermissions = [];
    if (user.dashboard === 'TRUE' || user.dashboard === true) activePermissions.push('Dashboard');
    if (user.chat_creation === 'TRUE' || user.chat_creation === true) activePermissions.push('Chat');
    if (user.analytics === 'TRUE' || user.analytics === true) activePermissions.push('Analytics');
    if (user.warranty === 'TRUE' || user.warranty === true) activePermissions.push('Warranty');
    if (user.stock === 'TRUE' || user.stock === true) activePermissions.push('Stock');
    if (user.registrations === 'TRUE' || user.registrations === true) activePermissions.push('Registrations');
    if (user.user_management === 'TRUE' || user.user_management === true) activePermissions.push('Users');
    if (user.settings === 'TRUE' || user.settings === true) activePermissions.push('Settings');
    
    return activePermissions.length > 0 ? activePermissions.join(', ') : 'No access';
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
      <Header title="User Management" />

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">Manage Users</h2>
            <p className="text-xs text-gray-500 mt-1">🟢 Online status updates every 30s</p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-primary"
          >
            + Create User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Username</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Permissions</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const status = getOnlineStatus(user.username);
                
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status.color} ${status.status === 'online' ? 'animate-pulse' : ''}`} />
                        <span className="text-xs font-medium text-gray-600">{status.text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{user.username}</td>
                    <td className="px-6 py-4 text-sm">{user.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-xs text-gray-600 max-w-xs truncate">
                        {getPermissionsSummary(user)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openPermissionsModal(user)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
                        >
                          Permissions
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="bg-primary text-white px-3 py-1 rounded-lg hover:bg-[#164d6e] transition-colors text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
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
      </div>

      {/* Create/Edit User Modal - Same as before */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-primary mb-6">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input-field"
                  required
                  disabled={editingUser !== null}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  required={!editingUser}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-primary mb-3">Permissions</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={permissions[key]}
                        onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                        className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal - Same as before */}
      {showPermissionsModal && selectedUserForPermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-primary mb-4">
              Manage Permissions
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              User: <strong>{selectedUserForPermissions.name}</strong> ({selectedUserForPermissions.username})
            </p>

            <div className="space-y-3 mb-6">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                    className="w-5 h-5 text-accent border-gray-300 rounded focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUserForPermissions(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handlePermissionsSave}
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}