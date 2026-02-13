import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';
import * as XLSX from 'xlsx';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // UPDATED: Accept 'javelin' type
    if (!['shopify', 'javelin', 'threshold'].includes(type)) {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    let workbook;

    // Handle CSV files
    if (file.name.toLowerCase().endsWith('.csv')) {
      const csvText = new TextDecoder('utf-8').decode(bytes);
      workbook = XLSX.read(csvText, { type: 'string' });
    }
    // Handle XLS / XLSX files
    else {
      const data = new Uint8Array(bytes);
      workbook = XLSX.read(data, { type: 'array' });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheet found in file' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });

    if (!jsonData.length) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // CRITICAL: Import data to the appropriate sheet
    // importToSheet will automatically move javelin to yesterday if type === 'javelin'
    console.log(`📥 Importing ${jsonData.length} rows to ${type}...`);
    const result = await googleSheets.importToSheet(type, jsonData);
    
    // Update last update timestamp
    await googleSheets.updateStockLastUpdate(type);

    let message = `Successfully imported ${result.rowsImported} rows to ${type}`;
    
    // Special message for javelin import
    if (type === 'javelin') {
      message += '. Previous javelin data moved to stock_yesterday.';
    }

    // Check if all three imports are done recently (within 5 minutes) - OPTIONAL
    const lastUpdate = await googleSheets.getStockLastUpdate();
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    const allImportsDone = ['shopify', 'javelin', 'threshold'].every(t => {
      const updateTime = lastUpdate[t] ? new Date(lastUpdate[t]).getTime() : 0;
      return updateTime > fiveMinutesAgo;
    });

    return NextResponse.json({
      success: true,
      rowsImported: result.rowsImported,
      message: message,
      allImportsDone,
      javelinMovedToYesterday: type === 'javelin',
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data', detail: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check last update status
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const lastUpdate = await googleSheets.getStockLastUpdate();
    return NextResponse.json({ lastUpdate });
  } catch (error) {
    console.error('Error fetching last update:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last update' },
      { status: 500 }
    );
  }
}