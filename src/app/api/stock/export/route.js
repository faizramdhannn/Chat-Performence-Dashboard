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
    // Get stock data
    let data = await googleSheets.getStockData();

    // Sort: Grade A-Z, then PCA descending (besar ke kecil)
    data = data.sort((a, b) => {
      // Sort by Grade A-Z
      const gradeCompare = String(a.Grade || '').localeCompare(String(b.Grade || ''));
      if (gradeCompare !== 0) return gradeCompare;
      
      // Then by PCA (descending)
      const pcaA = parseFloat(a.PCA) || 0;
      const pcaB = parseFloat(b.PCA) || 0;
      return pcaB - pcaA;
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stock');

    // Add headers
    const headers = ['SKU', 'Product_name', 'Category', 'Grade', 'PCA', 'Shopify', 'Threshold', 'HPP', 'HPT', 'HPJ'];
    worksheet.addRow(headers);

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D334D' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.forEach((item) => {
      worksheet.addRow([
        item.SKU || '',
        item.Product_name || '',
        item.Category || '',
        item.Grade || '',
        item.PCA || '',
        item.Shopify || '',
        item.Threshold || '',
        item.HPP || '',
        item.HPT || '',
        item.HPJ || ''
      ]);
    });

    // Set column widths
    worksheet.getColumn(1).width = 20;  // SKU
    worksheet.getColumn(2).width = 40;  // Product_name
    worksheet.getColumn(3).width = 20;  // Category
    worksheet.getColumn(4).width = 10;  // Grade
    worksheet.getColumn(5).width = 10;  // PCA
    worksheet.getColumn(6).width = 10;  // Shopify
    worksheet.getColumn(7).width = 10;  // Threshold
    worksheet.getColumn(8).width = 15;  // HPP
    worksheet.getColumn(9).width = 15;  // HPT
    worksheet.getColumn(10).width = 15; // HPJ

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
        'Content-Disposition': `attachment; filename="Stock ${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}