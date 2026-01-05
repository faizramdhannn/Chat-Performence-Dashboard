'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masterData, setMasterData] = useState({});
  const [formData, setFormData] = useState({
    date: '',
    shift: '',
    cs: '',
    channel: '',
    name: '',
    cust: '',
    order_number: '',
    intention: '',
    case: '',
    product_name: '',
    closing_status: '',
    note: '',
    chat_status: '',
    chat_status2: '',
    follow_up: '',
    survey: ''
  });

  useEffect(() => {
    // Check if user has permission to edit
    if (session && session.user.role === 'cs') {
      alert('You do not have permission to edit data');
      router.push('/dashboard');
      return;
    }
    
    fetchMasterData();
    fetchData();
  }, [session]);

  const fetchMasterData = async () => {
    try {
      const response = await fetch('/api/master');
      const result = await response.json();
      setMasterData(result.masterData || {});
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/data/${params.id}`);
      const result = await response.json();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/data/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        alert('Gagal mengupdate data');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setSaving(false);
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
      <Header title="Edit Data Chat" />

      <div className="card p-8 max-w-4xl">
        <h2 className="text-2xl font-bold text-primary mb-6">Edit Chat Performance</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Shift *
              </label>
              <select
                name="shift"
                value={formData.shift}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Pilih Shift</option>
                {masterData.shift?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Customer Service *
              </label>
              <select
                name="cs"
                value={formData.cs}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Pilih CS</option>
                {masterData.cs?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Channel *
              </label>
              <select
                name="channel"
                value={formData.channel}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Pilih Channel</option>
                {masterData.channel?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Contact Name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Customer
              </label>
              <input
                type="text"
                name="cust"
                value={formData.cust}
                onChange={handleChange}
                className="input-field"
                placeholder="Customer Name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Order Number
              </label>
              <input
                type="text"
                name="order_number"
                value={formData.order_number}
                onChange={handleChange}
                className="input-field"
                placeholder="Order Number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Intention
              </label>
              <select
                name="intention"
                value={formData.intention}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Pilih Intention</option>
                {masterData.intention?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Case
              </label>
              <select
                name="case"
                value={formData.case}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Pilih Case</option>
                {masterData.case?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Product Name
              </label>
              <select
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Pilih Product</option>
                {masterData.product_name?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Closing Status *
              </label>
              <select
                name="closing_status"
                value={formData.closing_status}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Pilih Status</option>
                {masterData.closing_status?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Chat Status
              </label>
              <select
                name="chat_status"
                value={formData.chat_status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Pilih Chat Status</option>
                {masterData.chat_status?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Chat Status 2
              </label>
              <select
                name="chat_status2"
                value={formData.chat_status2}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Pilih Chat Status 2</option>
                {masterData.chat_status2?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Follow Up
              </label>
              <select
                name="follow_up"
                value={formData.follow_up}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Pilih Follow Up</option>
                {masterData.follow_up?.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Note
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="input-field"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Survey
            </label>
            <input
              type="text"
              name="survey"
              value={formData.survey}
              onChange={handleChange}
              className="input-field"
              placeholder="Survey Response"
            />
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
              {saving ? 'Menyimpan...' : 'Update Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
