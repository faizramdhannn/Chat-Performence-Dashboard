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
    
    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.SKU || !body.Product_name) {
      return NextResponse.json({ error: 'SKU and Product Name are required' }, { status: 400 });
    }
    
    const result = await googleSheets.updateMasterStockData(rowIndex, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating master stock data:', error);
    return NextResponse.json({ error: 'Failed to update master stock data' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rowIndex = parseInt(params.id);
    
    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });
    }
    
    const result = await googleSheets.deleteMasterStockData(rowIndex);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting master stock data:', error);
    return NextResponse.json({ error: 'Failed to delete master stock data' }, { status: 500 });
  }
}