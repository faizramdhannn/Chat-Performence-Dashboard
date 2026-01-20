'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function NotesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [permissions, setPermissions] = useState({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url_link: '',
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkPermission();
  }, [session]);

  const checkPermission = async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/user/permissions');
      const result = await response.json();
      
      setPermissions(result.permissions || {});
      
      if (!result.permissions?.notes) {
        alert('Anda tidak memiliki akses ke Notes. Hubungi admin untuk akses.');
        router.push('/dashboard');
        return;
      }
      
      fetchNotes();
    } catch (error) {
      console.error('Error checking permission:', error);
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      const result = await response.json();
      setNotes(result.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingNote ? `/api/notes/${editingNote.rowIndex}` : '/api/notes';
      const method = editingNote ? 'PUT' : 'POST';

      const dataToSend = {
        ...formData,
        id: editingNote?.id || Date.now().toString(),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (response.ok) {
        fetchNotes();
        setShowModal(false);
        resetForm();
      } else {
        alert(result.error || 'Failed to save note');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (note) => {
    if (!confirm(`Are you sure you want to delete "${note.title}"?`)) return;

    try {
      const response = await fetch(`/api/notes/${note.rowIndex}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNotes();
      } else {
        alert('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      url_link: '',
    });
    setEditingNote(null);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      description: note.description,
      url_link: note.url_link,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCardClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredNotes = notes.filter(note => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      note.title?.toLowerCase().includes(search) ||
      note.description?.toLowerCase().includes(search)
    );
  });

  const canManage = permissions.settings === true;

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
      <Header title="Notes" />

      {!canManage && (
        <div className="card p-4 mb-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">View Only Mode</h3>
              <p className="text-sm text-blue-700">
                Anda dapat melihat notes, tetapi tidak dapat mengedit, menghapus, atau menambah data. 
                Hubungi admin untuk mendapatkan akses penuh.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes..."
              className="input-field"
            />
          </div>
          {canManage && (
            <button onClick={openCreateModal} className="btn-primary whitespace-nowrap">
              + Add Note
            </button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          Total: {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Notes Found</h3>
          <p className="text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search' 
              : canManage 
                ? 'Click "Add Note" to create your first note' 
                : 'No notes available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div 
                className={`p-6 ${note.url_link ? 'cursor-pointer' : ''}`}
                onClick={() => note.url_link && handleCardClick(note.url_link)}
              >
                <h3 className="text-lg font-bold text-primary mb-3 line-clamp-2">
                  {note.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {note.description || 'No description'}
                </p>
                {note.url_link && (
                  <div className="flex items-center gap-2 text-xs text-accent mb-4">
                    <span>🔗</span>
                    <span className="truncate">{note.url_link}</span>
                  </div>
                )}
              </div>

              {canManage && (
                <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(note);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note);
                    }}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && canManage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4">
            <h3 className="text-2xl font-bold text-primary mb-6">
              {editingNote ? 'Edit Note' : 'Add New Note'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  required
                  placeholder="Enter note title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows="4"
                  placeholder="Enter note description"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  URL Link
                </label>
                <input
                  type="url"
                  value={formData.url_link}
                  onChange={(e) => setFormData({ ...formData, url_link: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link akan dibuka di tab baru ketika card diklik
                </p>
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
                  {loading ? 'Saving...' : editingNote ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}