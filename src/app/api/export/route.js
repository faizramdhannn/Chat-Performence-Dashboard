import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request) {
  try {
    const { filters, view, pivotData } = await request.json();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Analytics Data');

    // Determine view name and structure
    let viewName = '';
    let columnHeader = '';
    let rowHeader = '';
    
    if (view === 'intention') {
      viewName = 'Intention';
      rowHeader = 'Intensi';
      columnHeader = 'Channel';
    } else if (view === 'case') {
      viewName = 'Case';
      rowHeader = 'Case';
      columnHeader = 'Channel';
    } else if (view === 'intensi-ai') {
      viewName = 'Intensi AI';
      rowHeader = 'Intensi';
      columnHeader = 'Handle AI';
    } else if (view === 'case-ai') {
      viewName = 'Case AI';
      rowHeader = 'Case';
      columnHeader = 'Handle AI';
    } else if (view === 'intensi-store') {
      viewName = 'Intensi Store';
      rowHeader = 'Intensi';
      columnHeader = 'Visitor';
    } else if (view === 'case-store') {
      viewName = 'Case Store';
      rowHeader = 'Case';
      columnHeader = 'Visitor';
    }

    // Determine columns based on view
    const isStoreView = view === 'intensi-store' || view === 'case-store';
    const columns = isStoreView ? (pivotData.visitors || pivotData.stores) : pivotData.columns;

    // Add title
    worksheet.mergeCells('A1', String.fromCharCode(65 + columns.length + 1) + '1');
    worksheet.getCell('A1').value = `${viewName} Analytics Report`;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Add filter info
    let filterInfo = 'Filters: ';
    if (filters.dateFrom) filterInfo += `From: ${filters.dateFrom} `;
    if (filters.dateTo) filterInfo += `To: ${filters.dateTo} `;
    if (filters.cs !== 'all') filterInfo += `CS: ${filters.cs} `;
    if (filters.channel !== 'all') filterInfo += `${columnHeader}: ${filters.channel} `;
    if (filters.shift !== 'all') filterInfo += `Shift: ${filters.shift} `;
    if (filters.closingStatus !== 'all') filterInfo += `Status: ${filters.closingStatus}`;
    
    worksheet.mergeCells('A2', String.fromCharCode(65 + columns.length + 1) + '2');
    worksheet.getCell('A2').value = filterInfo;
    worksheet.getCell('A2').font = { italic: true, size: 10 };
    worksheet.getRow(2).height = 20;

    // Add headers (row 4)
    const headers = [
      rowHeader,
      ...columns,
      'TOTAL'
    ];
    
    worksheet.addRow([]); // Empty row 3
    const headerRow = worksheet.addRow(headers);
    
    // Style header row
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    pivotData.rows.forEach((row) => {
      const rowData = [
        row,
        ...columns.map(col => pivotData.matrix[row]?.[col] || 0),
        pivotData.rowTotals[row] || 0
      ];
      
      const dataRow = worksheet.addRow(rowData);
      
      // Style data row
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        if (colNumber === 1) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'left' };
        } else {
          cell.alignment = { horizontal: 'center' };
        }
        
        // Highlight total column
        if (colNumber === headers.length) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' }
          };
          cell.font = { bold: true };
        }
      });
    });

    // Add total row
    const totalRowData = [
      'TOTAL',
      ...columns.map(col => pivotData.columnTotals[col] || 0),
      pivotData.grandTotal || 0
    ];
    
    const totalRow = worksheet.addRow(totalRowData);
    
    // Style total row
    totalRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Grand total cell
      if (colNumber === headers.length) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 30; // First column wider for labels
      } else {
        column.width = 15;
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as blob
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${viewName}_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error.message },
      { status: 500 }
    );
  }
}