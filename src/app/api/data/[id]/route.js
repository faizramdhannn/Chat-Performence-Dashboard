import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request, { params }) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rowIndex = parseInt(params.id);
    const data = await googleSheets.getDataByRowIndex(rowIndex);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await requireAuth('admin');
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rowIndex = parseInt(params.id);
    const body = await request.json();
    const result = await googleSheets.updateData(rowIndex, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating data:', error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth('admin');
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rowIndex = parseInt(params.id);
    const result = await googleSheets.deleteData(rowIndex);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}
