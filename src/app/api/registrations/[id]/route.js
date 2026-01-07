import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

// Approve registration
export async function POST(request, { params }) {
  const auth = await requireAuth('super_admin');
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    // Get permissions from body
    const permissions = {
      dashboard: body.dashboard ? 'TRUE' : 'FALSE',
      chat_creation: body.chat_creation ? 'TRUE' : 'FALSE',
      analytics: body.analytics ? 'TRUE' : 'FALSE',
      warranty: body.warranty ? 'TRUE' : 'FALSE',
      stock: body.stock ? 'TRUE' : 'FALSE',
      registrations: body.registrations ? 'TRUE' : 'FALSE',
      user_management: body.user_management ? 'TRUE' : 'FALSE',
      settings: body.settings ? 'TRUE' : 'FALSE',
    };

    const result = await googleSheets.approveRegistration(params.id, 'user', permissions);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error approving registration:', error);
    return NextResponse.json({ error: 'Failed to approve registration' }, { status: 500 });
  }
}

// Reject registration
export async function DELETE(request, { params }) {
  const auth = await requireAuth('super_admin');
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await googleSheets.rejectRegistration(params.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error rejecting registration:', error);
    return NextResponse.json({ error: 'Failed to reject registration' }, { status: 500 });
  }
}