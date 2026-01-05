import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';
import * as XLSX from 'xlsx';

export async function POST(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { filters } = body;

    // Get all data
    let data = await googleSheets.getAllData();

    // Apply filters if provided
    if (filters) {
      if (filters.dateFrom) {
        data = data.filter(item => item.date >= filters.dateFrom);
      }
      if (filters.dateTo) {
        data = data.filter(item => item.date <= filters.dateTo);
      }
      if (filters.shift && filters.shift !== 'all') {
        data = data.filter(item => item.shift === filters.shift);
      }
      if (filters.channel && filters.channel !== 'all') {
        data = data.filter(item => item.channel === filters.channel);
      }
      if (filters.cs && filters.cs !== 'all') {
        data = data.filter(item => item.cs === filters.cs);
      }
      if (filters.closingStatus && filters.closingStatus !== 'all') {
        data = data.filter(item => item.closing_status === filters.closingStatus);
      }
    }

    // Remove rowIndex field
    const exportData = data.map(({ rowIndex, ...rest }) => rest);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // date
      { wch: 12 }, // shift
      { wch: 20 }, // cs
      { wch: 15 }, // channel
      { wch: 20 }, // name
      { wch: 20 }, // cust
      { wch: 15 }, // order_number
      { wch: 15 }, // intention
      { wch: 15 }, // case
      { wch: 20 }, // product_name
      { wch: 15 }, // closing_status
      { wch: 30 }, // note
      { wch: 15 }, // chat_status
      { wch: 15 }, // chat_status2
      { wch: 15 }, // follow_up
      { wch: 10 }  // survey
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chat Performance Data');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Chat_Performance_Export_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}