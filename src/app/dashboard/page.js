'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    totalChats: 0,
    closedChats: 0,
    openChats: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const result = await response.json();
      setStats(result.stats || { totalChats: 0, closedChats: 0, openChats: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (rowIndex) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
      const response = await fetch(`/api/data/${rowIndex}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
        fetchStats();
      } else {
        alert('Gagal menghapus data');
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Gagal menghapus data');
    }
  };

  const filteredData = data.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const canEdit = session?.user?.role === 'super_admin' || session?.user?.role === 'admin';
  const canDelete = session?.user?.role === 'super_admin' || session?.user?.role === 'admin';

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
      <Header title="Dashboard" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card-accent">
          <h3 className="text-sm font-semibold text-primary/80 mb-2 uppercase">Total Chats</h3>
          <div className="text-4xl font-bold text-primary">{stats.totalChats}</div>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase">Closed Status</h3>
          <div className="text-4xl font-bold text-primary">{stats.closedChats}</div>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase">Open Status</h3>
          <div className="text-4xl font-bold text-primary">{stats.openChats}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-primary">Chat Performance Data</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Cari data..."
              className="input-field w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={() => router.push('/dashboard/create')}
              className="btn-primary"
            >
              + Tambah Data
            </button>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Data</h3>
            <p className="text-gray-500 mb-6">Mulai dengan menambahkan data chat performance pertama Anda</p>
            <button
              onClick={() => router.push('/dashboard/create')}
              className="btn-primary"
            >
              Tambah Data Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Shift</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">CS</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Channel</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Order Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  {(canEdit || canDelete) && (
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">{item.date}</td>
                    <td className="px-6 py-4 text-sm">{item.shift}</td>
                    <td className="px-6 py-4 text-sm">{item.cs}</td>
                    <td className="px-6 py-4 text-sm">{item.channel}</td>
                    <td className="px-6 py-4 text-sm">{item.cust}</td>
                    <td className="px-6 py-4 text-sm">{item.order_number}</td>
                    <td className="px-6 py-4 text-sm">
                      {item.closing_status === 'Closed' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Closed
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                          Open
                        </span>
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              onClick={() => router.push(`/dashboard/edit/${item.rowIndex}`)}
                              className="bg-primary text-white px-3 py-1 rounded-lg hover:bg-[#164d6e] transition-colors text-xs font-semibold"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.rowIndex)}
                              className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
