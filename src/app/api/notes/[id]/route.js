import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function PUT(request, { params }) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rowIndex = parseInt(params.id);
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const result = await googleSheets.updateNote(rowIndex, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rowIndex = parseInt(params.id);
    const result = await googleSheets.deleteNote(rowIndex);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}