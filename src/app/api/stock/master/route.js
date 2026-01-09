import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const data = await googleSheets.getMasterStockData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching master stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch master stock data' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.SKU || !body.Product_name) {
      return NextResponse.json({ error: 'SKU and Product Name are required' }, { status: 400 });
    }
    
    const result = await googleSheets.addMasterStockData(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding master stock data:', error);
    return NextResponse.json({ error: 'Failed to add master stock data' }, { status: 500 });
  }
}