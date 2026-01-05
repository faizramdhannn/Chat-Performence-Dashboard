'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    spreadsheet_id: '',
    data_sheet: '',
    users_sheet: '',
    settings_sheet: '',
    master_sheet: ''
  });

  useEffect(() => {
    // Check if user is super admin
    if (session && session.user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchSettings();
  }, [session]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      
      if (result.settings) {
        setSettings({
          spreadsheet_id: result.settings.spreadsheet_id || '',
          data_sheet: result.settings.data_sheet || '',
          users_sheet: result.settings.users_sheet || '',
          settings_sheet: result.settings.settings_sheet || '',
          master_sheet: result.settings.master_sheet || ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
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
      <Header title="System Settings" />

      <div className="card p-8 max-w-4xl">
        <h2 className="text-2xl font-bold text-primary mb-6">Google Sheets Configuration</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>⚠️ Important:</strong> These settings control which Google Sheets the system uses.
            Make sure the service account has access to the spreadsheet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Spreadsheet ID *
            </label>
            <input
              type="text"
              name="spreadsheet_id"
              value={settings.spreadsheet_id}
              onChange={handleChange}
              className="input-field"
              placeholder="1AulzLouwctWHY..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The ID from your Google Sheets URL
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Data Sheet Name *
              </label>
              <input
                type="text"
                name="data_sheet"
                value={settings.data_sheet}
                onChange={handleChange}
                className="input-field"
                placeholder="Inbound Chat Performance"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Sheet containing chat performance data
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Users Sheet Name *
              </label>
              <input
                type="text"
                name="users_sheet"
                value={settings.users_sheet}
                onChange={handleChange}
                className="input-field"
                placeholder="users"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Sheet containing user accounts
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Settings Sheet Name *
              </label>
              <input
                type="text"
                name="settings_sheet"
                value={settings.settings_sheet}
                onChange={handleChange}
                className="input-field"
                placeholder="settings"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Sheet containing system settings
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Master Data Sheet Name *
              </label>
              <input
                type="text"
                name="master_sheet"
                value={settings.master_sheet}
                onChange={handleChange}
                className="input-field"
                placeholder="master"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Sheet containing dropdown options
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">📋 Sheet Structure Requirements:</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li><strong>users:</strong> id | username | password | role | name</li>
              <li><strong>settings:</strong> key | value</li>
              <li><strong>master:</strong> product_name | artikel | shift | cs | channel | intention | case | closing_status | chat_status | chat_status2 | follow_up</li>
              <li><strong>data:</strong> date | shift | cs | channel | name | cust | order_number | intention | case | product_name | closing_status | note | chat_status | chat_status2 | follow_up | survey</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
