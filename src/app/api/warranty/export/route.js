import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function POST(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { pivotData } = body;

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Warranty Report');

    // DITUKAR: Headers sekarang Channel (baris) vs Month-Year (kolom)
    const headers = ['Channel', ...pivotData.columns, 'TOTAL'];
    worksheet.addRow(headers);

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D334D' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows - DITUKAR
    pivotData.rows.forEach((channel, index) => {
      const rowData = [channel]; // Channel sebagai row
      
      pivotData.columns.forEach(monthYear => {
        const value = pivotData.matrix[channel][monthYear] || 0;
        rowData.push(value);
      });
      
      rowData.push(pivotData.rowTotals[channel] || 0);
      
      const row = worksheet.addRow(rowData);
      
      // Style TOTAL column
      row.getCell(headers.length).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFAFCC3C' }
      };
      row.getCell(headers.length).font = { bold: true };
    });

    // Add totals row
    const totalRow = ['TOTAL'];
    pivotData.columns.forEach(monthYear => {
      totalRow.push(pivotData.columnTotals[monthYear] || 0);
    });
    totalRow.push(pivotData.grandTotal || 0);

    const row = worksheet.addRow(totalRow);
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFAFCC3C' }
    };
    row.font = { bold: true };

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
        'Content-Disposition': `attachment; filename="Warranty_Report_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}