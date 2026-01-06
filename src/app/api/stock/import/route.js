import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import * as XLSX from 'xlsx';
import googleSheets from '@/lib/googleSheets';

// Pastikan pakai Node.js runtime
export const runtime = 'nodejs';

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

    if (!['shopify', 'javelin', 'threshold'].includes(type)) {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    let workbook;

    // CSV
    if (file.name.toLowerCase().endsWith('.csv')) {
      const csvText = new TextDecoder('utf-8').decode(bytes);
      workbook = XLSX.read(csvText, { type: 'string' });
    }
    // XLS / XLSX
    else {
      const data = new Uint8Array(bytes);
      workbook = XLSX.read(data, { type: 'array' });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheet found' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });

    if (!jsonData.length) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const result = await googleSheets.importToSheet(type, jsonData);
    await googleSheets.updateStockLastUpdate(type);

    return NextResponse.json({
      success: true,
      rowsImported: result.rowsImported,
      message: `Successfully imported ${result.rowsImported} rows to ${type}`,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data', detail: error.message },
      { status: 500 }
    );
  }
}
