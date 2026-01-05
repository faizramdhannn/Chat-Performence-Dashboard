'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (isRegister) {
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
          setSuccess(result.message);
          setFormData({ username: '', password: '', name: '' });
          setTimeout(() => {
            setIsRegister(false);
            setSuccess('');
          }, 3000);
        } else {
          setError(result.error || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } else {
      try {
        const result = await signIn('credentials', {
          username: formData.username,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Username atau password salah');
        } else if (result?.ok) {
          router.push('/dashboard');
          router.refresh();
        }
      } catch (error) {
        console.error('Login error:', error);
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-[#164d6e] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Chat Performance</h1>
          <p className="text-gray-600">Dashboard</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-primary mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                className="input-field"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required={isRegister}
              />
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-primary mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="input-field"
              placeholder="Masukkan username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-primary mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="input-field"
              placeholder="Masukkan password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRegister ? 'Registering...' : 'Logging in...'}
              </div>
            ) : (
              isRegister ? 'Register' : 'Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
              setFormData({ username: '', password: '', name: '' });
            }}
            className="text-sm text-primary hover:text-accent font-semibold transition-colors"
          >
            {isRegister ? '← Back to Login' : 'Create new account →'}
          </button>
        </div>

        {isRegister && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              <strong>ℹ️ Note:</strong> Your registration will be sent to the administrator for approval. You will be notified once approved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}