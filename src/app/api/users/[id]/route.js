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
    const users = await googleSheets.getAllUsers();
    const user = users.find(u => u.id === params.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user data with permissions
    const updatedData = {
      id: user.id,
      username: body.username || user.username,
      password: body.password || user.password, // If no new password, keep old
      name: body.name || user.name,
      role: body.role || user.role || 'user', // Legacy field
      dashboard: body.dashboard !== undefined ? (body.dashboard ? 'TRUE' : 'FALSE') : user.dashboard,
      chat_creation: body.chat_creation !== undefined ? (body.chat_creation ? 'TRUE' : 'FALSE') : user.chat_creation,
      analytics: body.analytics !== undefined ? (body.analytics ? 'TRUE' : 'FALSE') : user.analytics,
      warranty: body.warranty !== undefined ? (body.warranty ? 'TRUE' : 'FALSE') : user.warranty,
      stock: body.stock !== undefined ? (body.stock ? 'TRUE' : 'FALSE') : user.stock,
      registrations: body.registrations !== undefined ? (body.registrations ? 'TRUE' : 'FALSE') : user.registrations,
      user_management: body.user_management !== undefined ? (body.user_management ? 'TRUE' : 'FALSE') : user.user_management,
      settings: body.settings !== undefined ? (body.settings ? 'TRUE' : 'FALSE') : user.settings,
    };

    const result = await googleSheets.updateUser(user.rowIndex, updatedData);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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

    const result = await googleSheets.deleteUser(user.rowIndex);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}