'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Schedule states
  const [schedule, setSchedule] = useState({
    today: null,
    tomorrow: null,
    dayAfterTomorrow: null,
    allSchedule: []
  });
  
  // Pagination for schedule
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Online users
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Nilai CS states
  const [nilaiSummary, setNilaiSummary] = useState([]);
  const [uniqueCS, setUniqueCS] = useState([]);
  const [uniqueChannels, setUniqueChannels] = useState([]);
  const [uniqueSOP, setUniqueSOP] = useState([]);
  const [nilaiFilters, setNilaiFilters] = useState({
    dateFrom: '',
    dateTo: '',
    cs: 'all',
    channel: 'all',
    sop: 'all'
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
    fetchOnlineUsers();
    fetchNilaiData();
  }, []);

  useEffect(() => {
    fetchNilaiData();
  }, [nilaiFilters]);

  const fetchSchedule = async () => {
    try {
      const response = await fetch('/api/schedule');
      const result = await response.json();
      setSchedule(result);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await fetch('/api/user/activity');
      const result = await response.json();
      
      const online = (result.users || [])
        .filter(u => u.isOnline)
        .map(u => u.name);
      
      setOnlineUsers(online);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  const fetchNilaiData = async () => {
    try {
      const params = new URLSearchParams();
      if (nilaiFilters.dateFrom) params.append('dateFrom', nilaiFilters.dateFrom);
      if (nilaiFilters.dateTo) params.append('dateTo', nilaiFilters.dateTo);
      if (nilaiFilters.cs) params.append('cs', nilaiFilters.cs);
      if (nilaiFilters.channel) params.append('channel', nilaiFilters.channel);
      if (nilaiFilters.sop) params.append('sop', nilaiFilters.sop);
      
      const response = await fetch(`/api/nilai?${params.toString()}`);
      const result = await response.json();
      
      console.log('Nilai data received:', result);
      
      setNilaiSummary(result.summary || []);
      setUniqueCS(result.uniqueCS || []);
      setUniqueChannels(result.uniqueChannels || []);
      setUniqueSOP(result.uniqueSOP || []);
    } catch (error) {
      console.error('Error fetching nilai data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNilaiFilterChange = (key, value) => {
    setNilaiFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetNilaiFilters = () => {
    setNilaiFilters({
      dateFrom: '',
      dateTo: '',
      cs: 'all',
      channel: 'all',
      sop: 'all'
    });
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'E': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Schedule pagination
  const totalPages = Math.ceil(schedule.allSchedule.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSchedule = schedule.allSchedule.slice(startIndex, endIndex);

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
    <div className="max-h-screen overflow-hidden">
      <Header title="Dashboard" />

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className="card p-3 mb-4">
          <h3 className="text-xs font-semibold text-primary mb-2">🟢 Online Sekarang</h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((name, idx) => (
              <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Cards - HORIZONTAL VERSION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Today */}
        <div className="card p-3 bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-center mb-2">
            <h3 className="text-xs font-bold text-primary">📅 Hari Ini</h3>
            <div className="text-xs font-semibold text-gray-700">{schedule.today?.date}</div>
          </div>
          {schedule.today ? (
            <div className="space-y-1.5 text-xs">
              {/* Horizontal Layout - 3 columns */}
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌅 Pagi</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.today.morning_web} & {schedule.today.morning_mp}
                  </div>
                </div>
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌞 Siang</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.today.afternoon_web} & {schedule.today.afternoon_mp}
                  </div>
                </div>
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌙 Malam</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.today.night_web} & {schedule.today.night_mp}
                  </div>
                </div>
              </div>
              {/* Admin below */}
              <div className="bg-white/80 p-1 rounded text-center">
                <span className="text-gray-500 text-xs">👤 Admin: </span>
                <span className="font-semibold text-gray-700 text-xs">{schedule.today.admin}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center">Tidak ada jadwal</div>
          )}
        </div>

        {/* Tomorrow */}
        <div className="card p-3 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center mb-2">
            <h3 className="text-xs font-bold text-primary">📅 Besok</h3>
            <div className="text-xs font-semibold text-gray-700">{schedule.tomorrow?.date}</div>
          </div>
          {schedule.tomorrow ? (
            <div className="space-y-1.5 text-xs">
              {/* Horizontal Layout - 3 columns */}
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌅 Pagi</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.tomorrow.morning_web} & {schedule.tomorrow.morning_mp}
                  </div>
                </div>
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌞 Siang</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.tomorrow.afternoon_web} & {schedule.tomorrow.afternoon_mp}
                  </div>
                </div>
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌙 Malam</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.tomorrow.night_web} & {schedule.tomorrow.night_mp}
                  </div>
                </div>
              </div>
              {/* Admin below */}
              <div className="bg-white/80 p-1 rounded text-center">
                <span className="text-gray-500 text-xs">👤 Admin: </span>
                <span className="font-semibold text-gray-700 text-xs">{schedule.tomorrow.admin}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center">Tidak ada jadwal</div>
          )}
        </div>

        {/* Day After Tomorrow */}
        <div className="card p-3 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-center mb-2">
            <h3 className="text-xs font-bold text-primary">📅 Lusa</h3>
            <div className="text-xs font-semibold text-gray-700">{schedule.dayAfterTomorrow?.date}</div>
          </div>
          {schedule.dayAfterTomorrow ? (
            <div className="space-y-1.5 text-xs">
              {/* Horizontal Layout - 3 columns */}
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌅 Pagi</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.dayAfterTomorrow.morning_web} & {schedule.dayAfterTomorrow.morning_mp}
                  </div>
                </div>
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌞 Siang</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.dayAfterTomorrow.afternoon_web} & {schedule.dayAfterTomorrow.afternoon_mp}
                  </div>
                </div>
                <div className="bg-white/60 p-1.5 rounded text-center">
                  <div className="text-gray-500 text-xs mb-0.5">🌙 Malam</div>
                  <div className="font-semibold text-xs leading-tight">
                    {schedule.dayAfterTomorrow.night_web} & {schedule.dayAfterTomorrow.night_mp}
                  </div>
                </div>
              </div>
              {/* Admin below */}
              <div className="bg-white/80 p-1 rounded text-center">
                <span className="text-gray-500 text-xs">👤 Admin: </span>
                <span className="font-semibold text-gray-700 text-xs">{schedule.dayAfterTomorrow.admin}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center">Tidak ada jadwal</div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Schedule Table */}
        <div className="card overflow-hidden" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <div className="p-3 border-b border-gray-200 bg-primary text-white flex justify-between items-center">
            <h2 className="text-sm font-bold">📋 Jadwal CS</h2>
            <span className="text-xs">
              Page {currentPage} / {totalPages || 1}
            </span>
          </div>
          
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 520px)' }}>
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold text-xs">Date</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-xs">🌅 Pagi WEB</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-xs">🌅 Pagi MP</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-xs">🌞 Siang WEB</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-xs">🌞 Siang MP</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-xs">🌙 Malam WEB</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-xs">🌙 Malam MP</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSchedule.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                  >
                    <td className="px-2 py-1 text-xs">{item.date}</td>
                    <td className="px-2 py-1 text-center font-medium text-xs">{item.morning_web}</td>
                    <td className="px-2 py-1 text-center font-medium text-xs">{item.morning_mp}</td>
                    <td className="px-2 py-1 text-center font-medium text-xs">{item.afternoon_web}</td>
                    <td className="px-2 py-1 text-center font-medium text-xs">{item.afternoon_mp}</td>
                    <td className="px-2 py-1 text-center font-medium text-xs">{item.night_web}</td>
                    <td className="px-2 py-1 text-center font-medium text-xs">{item.night_mp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-2 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs bg-primary text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#164d6e]"
              >
                ← Previous
              </button>
              
              <span className="text-xs text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, schedule.allSchedule.length)} of {schedule.allSchedule.length}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs bg-primary text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#164d6e]"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Nilai CS */}
        <div className="card overflow-hidden" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <div className="p-3 border-b border-gray-200 bg-primary text-white">
            <h2 className="text-sm font-bold">📊 Rekap Nilai CS</h2>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={nilaiFilters.dateFrom}
                  onChange={(e) => handleNilaiFilterChange('dateFrom', e.target.value)}
                  className="input-field text-xs py-1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={nilaiFilters.dateTo}
                  onChange={(e) => handleNilaiFilterChange('dateTo', e.target.value)}
                  className="input-field text-xs py-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  SOP
                </label>
                <select
                  value={nilaiFilters.sop}
                  onChange={(e) => handleNilaiFilterChange('sop', e.target.value)}
                  className="input-field text-xs py-1"
                >
                  <option value="all">All SOP</option>
                  {uniqueSOP.map((sop) => (
                    <option key={sop} value={sop}>{sop}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  CS
                </label>
                <select
                  value={nilaiFilters.cs}
                  onChange={(e) => handleNilaiFilterChange('cs', e.target.value)}
                  className="input-field text-xs py-1"
                >
                  <option value="all">All CS</option>
                  {uniqueCS.map((cs) => (
                    <option key={cs} value={cs}>{cs}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Channel
                </label>
                <select
                  value={nilaiFilters.channel}
                  onChange={(e) => handleNilaiFilterChange('channel', e.target.value)}
                  className="input-field text-xs py-1"
                >
                  <option value="all">All Channels</option>
                  {uniqueChannels.map((channel) => (
                    <option key={channel} value={channel}>{channel}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={resetNilaiFilters}
              className="btn-secondary text-xs w-full py-1"
            >
              Reset Filters
            </button>
          </div>

          {/* Nilai Table */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 660px)' }}>
            {nilaiSummary.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No data found</p>
                <p className="text-xs text-gray-400 mt-2">
                  {nilaiFilters.dateFrom || nilaiFilters.dateTo 
                    ? 'Try adjusting date filters' 
                    : 'Set date filters to see data'}
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold text-xs">SOP</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-xs">Channel</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-xs">Skor</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-xs">Nilai</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-xs">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {nilaiSummary.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-accent/5 transition-colors"
                    >
                      <td className="px-2 py-1.5 text-xs">{item.SOP}</td>
                      <td className="px-2 py-1.5 text-xs">{item.channel}</td>
                      <td className="px-2 py-1.5 text-center font-semibold text-xs">
                        {(item.average * 100).toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${getGradeColor(item.grade)}`}>
                          {item.grade}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center text-gray-600 text-xs">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}