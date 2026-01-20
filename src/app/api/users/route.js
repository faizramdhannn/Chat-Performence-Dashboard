import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  // PERBAIKAN: Hanya check apakah user sudah login, tidak check role
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Permission check dilakukan di frontend page (users-page.js)
  // API hanya memastikan user sudah authenticated

  try {
    const users = await googleSheets.getAllUsers();
    // Remove password from response
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    
    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  // PERBAIKAN: Hanya check apakah user sudah login, tidak check role
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    
    // Check if username already exists
    const existingUser = await googleSheets.getUserByUsername(body.username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' }, 
        { status: 400 }
      );
    }

    // Create user with permissions
    const userData = {
      username: body.username,
      password: body.password,
      name: body.name,
      role: body.role || 'user', // Legacy field
      dashboard: body.dashboard ? 'TRUE' : 'FALSE',
      chat_creation: body.chat_creation ? 'TRUE' : 'FALSE',
      analytics: body.analytics ? 'TRUE' : 'FALSE',
      warranty: body.warranty ? 'TRUE' : 'FALSE',
      notes: body.notes ? 'TRUE' : 'FALSE', 
      stock: body.stock ? 'TRUE' : 'FALSE',
      registrations: body.registrations ? 'TRUE' : 'FALSE',
      user_management: body.user_management ? 'TRUE' : 'FALSE',
      settings: body.settings ? 'TRUE' : 'FALSE',
    };

    const result = await googleSheets.createUser(userData);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}