// ============================================
// FIXED API ROUTES
// ============================================

// ========== FILE: src/app/api/users/[id]/route.js ==========

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request, { params }) {
  const auth = await requireAuth('super_admin');
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const users = await googleSheets.getAllUsers();
    const user = users.find(u => u.id === params.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove password from response
    const { password, ...sanitizedUser } = user;
    
    return NextResponse.json({ user: sanitizedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await requireAuth('super_admin');
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    
    // PENTING: Validasi params.id
    if (!params.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`📝 API: Updating user with ID: ${params.id}`);

    // Build updatedData dengan semua field yang diperlukan
    const updatedData = {
      id: params.id, // Gunakan ID dari params
      username: body.username,
      password: body.password || '', // Jika kosong, akan keep old password di googleSheets
      name: body.name,
      role: body.role || 'user',
      dashboard: body.dashboard !== undefined ? (body.dashboard ? 'TRUE' : 'FALSE') : 'FALSE',
      chat_creation: body.chat_creation !== undefined ? (body.chat_creation ? 'TRUE' : 'FALSE') : 'FALSE',
      analytics: body.analytics !== undefined ? (body.analytics ? 'TRUE' : 'FALSE') : 'FALSE',
      warranty: body.warranty !== undefined ? (body.warranty ? 'TRUE' : 'FALSE') : 'FALSE',
      bundling: body.bundling !== undefined ? (body.bundling ? 'TRUE' : 'FALSE') : 'FALSE',
      stock: body.stock !== undefined ? (body.stock ? 'TRUE' : 'FALSE') : 'FALSE',
      notes: body.notes !== undefined ? (body.notes ? 'TRUE' : 'FALSE') : 'FALSE',
      registrations: body.registrations !== undefined ? (body.registrations ? 'TRUE' : 'FALSE') : 'FALSE',
      user_management: body.user_management !== undefined ? (body.user_management ? 'TRUE' : 'FALSE') : 'FALSE',
      settings: body.settings !== undefined ? (body.settings ? 'TRUE' : 'FALSE') : 'FALSE',
      created_at: body.created_at || '',
      last_activity: body.last_activity || '',
    };

    // Update dengan ID (method googleSheets sudah diubah)
    const result = await googleSheets.updateUser(params.id, updatedData);
    
    console.log(`✅ API: Successfully updated user ${body.username}`);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ API: Error updating user:', error);
    return NextResponse.json({ 
      error: 'Failed to update user',
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth('super_admin');
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // PENTING: Validasi params.id
    if (!params.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`🗑️  API: Attempting to delete user with ID: ${params.id}`);
    
    // Delete dengan ID (method googleSheets sudah diubah)
    const result = await googleSheets.deleteUser(params.id);
    
    console.log(`✅ API: Successfully deleted user with ID: ${params.id}`);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ API: Error deleting user:', error);
    return NextResponse.json({ 
      error: 'Failed to delete user',
      details: error.message 
    }, { status: 500 });
  }
}