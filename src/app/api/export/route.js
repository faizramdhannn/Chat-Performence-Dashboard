import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';
import ExcelJS from 'exceljs';

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

    // Create pivot table data
    const intentions = [...new Set(data.map(d => d.intention).filter(Boolean))].sort();
    const channels = [...new Set(data.map(d => d.channel).filter(Boolean))].sort();

    // Build pivot matrix
    const pivotData = [];
    
    intentions.forEach(intention => {
      const row = { 'By Intensi': intention };
      let rowTotal = 0;
      
      channels.forEach(channel => {
        const count = data.filter(d => d.intention === intention && d.channel === channel).length;
        row[channel] = count;
        rowTotal += count;
      });
      
      row['TOTAL'] = rowTotal;
      pivotData.push(row);
    });

    // Add column totals
    const totalRow = { 'By Intensi': 'TOTAL' };
    let grandTotal = 0;
    
    channels.forEach(channel => {
      const total = data.filter(d => d.channel === channel).length;
      totalRow[channel] = total;
      grandTotal += total;
    });
    totalRow['TOTAL'] = grandTotal;
    pivotData.push(totalRow);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pivot Table');

    // Add headers
    const headers = ['By Intensi', ...channels, 'TOTAL'];
    worksheet.addRow(headers);

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C4F5E' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    pivotData.forEach((rowData, index) => {
      const values = headers.map(h => rowData[h] || 0);
      const row = worksheet.addRow(values);
      
      // Style total row
      if (index === pivotData.length - 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFAFCC3C' }
        };
        row.font = { bold: true };
      }
      
      // Style TOTAL column
      row.getCell(headers.length).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFAFCC3C' }
      };
      row.getCell(headers.length).font = { bold: true };
    });

    // Set column widths
    worksheet.getColumn(1).width = 30;
    for (let i = 2; i <= headers.length; i++) {
      worksheet.getColumn(i).width = 15;
    }

    // Add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Analytics_Pivot_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}