import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import googleSheets from '@/lib/googleSheets';
import xlsx from 'xlsx';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type'); // shopify, javelin, or threshold

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!['shopify', 'javelin', 'threshold'].includes(type)) {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }

    // Read file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse based on file type
    let workbook;
    if (file.name.endsWith('.csv')) {
      const csvData = buffer.toString('utf8');
      workbook = xlsx.read(csvData, { type: 'string' });
    } else {
      workbook = xlsx.read(buffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Import to Google Sheets
    const result = await googleSheets.importToSheet(type, jsonData);

    // Update last update timestamp
    await googleSheets.updateStockLastUpdate(type);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.rowsImported} rows to ${type}`,
      rowsImported: result.rowsImported,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json({ 
      error: 'Failed to import data: ' + error.message 
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};