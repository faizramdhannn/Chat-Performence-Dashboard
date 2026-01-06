import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const data = await googleSheets.getStockData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}