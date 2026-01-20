import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const notes = await googleSheets.getAllNotes();
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const result = await googleSheets.addNote(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding note:', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}