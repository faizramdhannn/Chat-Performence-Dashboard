import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';
import ExcelJS from 'exceljs';

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Get master data for dropdowns
    const masterData = await googleSheets.getMasterData();
    
    // Create workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();

    // ===== SHEET 1: Data =====
    const dataSheet = workbook.addWorksheet('Data');

    // Add headers manually to control exact columns
    const headers = ['date', 'shift', 'cs', 'channel', 'name', 'cust', 'order_number', 'intention', 'case', 'product_name', 'closing_status', 'note', 'chat_status', 'chat_status2', 'follow_up', 'survey'];
    
    dataSheet.getRow(1).values = headers;
    
    // Style header row
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D334D' }
    };
    dataSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Set column widths (A to P only)
    dataSheet.getColumn(1).width = 15;  // A - date
    dataSheet.getColumn(2).width = 12;  // B - shift
    dataSheet.getColumn(3).width = 20;  // C - cs
    dataSheet.getColumn(4).width = 15;  // D - channel
    dataSheet.getColumn(5).width = 20;  // E - name
    dataSheet.getColumn(6).width = 20;  // F - cust
    dataSheet.getColumn(7).width = 15;  // G - order_number
    dataSheet.getColumn(8).width = 15;  // H - intention
    dataSheet.getColumn(9).width = 15;  // I - case
    dataSheet.getColumn(10).width = 20; // J - product_name (artikel)
    dataSheet.getColumn(11).width = 15; // K - closing_status
    dataSheet.getColumn(12).width = 30; // L - note
    dataSheet.getColumn(13).width = 15; // M - chat_status
    dataSheet.getColumn(14).width = 15; // N - chat_status2
    dataSheet.getColumn(15).width = 15; // O - follow_up
    dataSheet.getColumn(16).width = 10; // P - survey

    // Add 50 empty rows
    for (let i = 2; i <= 51; i++) {
      dataSheet.getRow(i).values = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
    }

    // Add data validations
    
    // Shift dropdown (column B)
    if (masterData.shift && masterData.shift.length > 0) {
      const shiftRange = `'Valid Options'!$A$2:$A$${masterData.shift.length + 1}`;
      dataSheet.dataValidations.add('B2:B51', {
        type: 'list',
        allowBlank: true,
        formulae: [shiftRange]
      });
    }

    // CS dropdown (column C)
    if (masterData.cs && masterData.cs.length > 0) {
      const csRange = `'Valid Options'!$B$2:$B$${masterData.cs.length + 1}`;
      dataSheet.dataValidations.add('C2:C51', {
        type: 'list',
        allowBlank: true,
        formulae: [csRange]
      });
    }

    // Channel dropdown (column D)
    if (masterData.channel && masterData.channel.length > 0) {
      const channelRange = `'Valid Options'!$C$2:$C$${masterData.channel.length + 1}`;
      dataSheet.dataValidations.add('D2:D51', {
        type: 'list',
        allowBlank: true,
        formulae: [channelRange]
      });
    }

    // Intention dropdown (column H)
    if (masterData.intention && masterData.intention.length > 0) {
      const intentionRange = `'Valid Options'!$D$2:$D$${masterData.intention.length + 1}`;
      dataSheet.dataValidations.add('H2:H51', {
        type: 'list',
        allowBlank: true,
        formulae: [intentionRange]
      });
    }

    // Case dropdown (column I)
    if (masterData.case && masterData.case.length > 0) {
      const caseRange = `'Valid Options'!$E$2:$E$${masterData.case.length + 1}`;
      dataSheet.dataValidations.add('I2:I51', {
        type: 'list',
        allowBlank: true,
        formulae: [caseRange]
      });
    }

    // Product Name dropdown (column J) - PAKAI ARTIKEL
    if (masterData.artikel && masterData.artikel.length > 0) {
      const artikelRange = `'Valid Options'!$F$2:$F$${masterData.artikel.length + 1}`;
      dataSheet.dataValidations.add('J2:J51', {
        type: 'list',
        allowBlank: true,
        formulae: [artikelRange]
      });
    }

    // Closing Status dropdown (column K)
    if (masterData.closing_status && masterData.closing_status.length > 0) {
      const closingRange = `'Valid Options'!$G$2:$G$${masterData.closing_status.length + 1}`;
      dataSheet.dataValidations.add('K2:K51', {
        type: 'list',
        allowBlank: true,
        formulae: [closingRange]
      });
    }

    // Chat Status dropdown (column M)
    if (masterData.chat_status && masterData.chat_status.length > 0) {
      const chatStatusRange = `'Valid Options'!$H$2:$H$${masterData.chat_status.length + 1}`;
      dataSheet.dataValidations.add('M2:M51', {
        type: 'list',
        allowBlank: true,
        formulae: [chatStatusRange]
      });
    }

    // Chat Status 2 dropdown (column N)
    if (masterData.chat_status2 && masterData.chat_status2.length > 0) {
      const chatStatus2Range = `'Valid Options'!$I$2:$I$${masterData.chat_status2.length + 1}`;
      dataSheet.dataValidations.add('N2:N51', {
        type: 'list',
        allowBlank: true,
        formulae: [chatStatus2Range]
      });
    }

    // Follow Up dropdown (column O)
    if (masterData.follow_up && masterData.follow_up.length > 0) {
      const followUpRange = `'Valid Options'!$J$2:$J$${masterData.follow_up.length + 1}`;
      dataSheet.dataValidations.add('O2:O51', {
        type: 'list',
        allowBlank: true,
        formulae: [followUpRange]
      });
    }

    // Survey dropdown (column P) - TRUE/FALSE
    dataSheet.dataValidations.add('P2:P51', {
      type: 'list',
      allowBlank: true,
      formulae: ['"TRUE,FALSE"']
    });

    // ===== SHEET 2: Valid Options =====
    const optionsSheet = workbook.addWorksheet('Valid Options');
    
    // Add headers - GANTI product_name jadi artikel
    const optionHeaders = ['shift', 'cs', 'channel', 'intention', 'case', 'artikel', 'closing_status', 'chat_status', 'chat_status2', 'follow_up'];
    optionsSheet.getRow(1).values = optionHeaders;
    
    optionsSheet.getRow(1).font = { bold: true };
    optionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    // Set column widths (A to J only)
    optionsSheet.getColumn(1).width = 15;  // shift
    optionsSheet.getColumn(2).width = 20;  // cs
    optionsSheet.getColumn(3).width = 15;  // channel
    optionsSheet.getColumn(4).width = 15;  // intention
    optionsSheet.getColumn(5).width = 15;  // case
    optionsSheet.getColumn(6).width = 20;  // artikel
    optionsSheet.getColumn(7).width = 15;  // closing_status
    optionsSheet.getColumn(8).width = 15;  // chat_status
    optionsSheet.getColumn(9).width = 15;  // chat_status2
    optionsSheet.getColumn(10).width = 15; // follow_up

    // Add data rows - PAKAI ARTIKEL
    const maxLen = Math.max(
      masterData.shift?.length || 0,
      masterData.cs?.length || 0,
      masterData.channel?.length || 0,
      masterData.intention?.length || 0,
      masterData.case?.length || 0,
      masterData.artikel?.length || 0,
      masterData.closing_status?.length || 0,
      masterData.chat_status?.length || 0,
      masterData.chat_status2?.length || 0,
      masterData.follow_up?.length || 0
    );

    for (let i = 0; i < maxLen; i++) {
      const rowData = [
        masterData.shift?.[i] || '',
        masterData.cs?.[i] || '',
        masterData.channel?.[i] || '',
        masterData.intention?.[i] || '',
        masterData.case?.[i] || '',
        masterData.artikel?.[i] || '',  // ARTIKEL bukan product_name
        masterData.closing_status?.[i] || '',
        masterData.chat_status?.[i] || '',
        masterData.chat_status2?.[i] || '',
        masterData.follow_up?.[i] || ''
      ];
      optionsSheet.getRow(i + 2).values = rowData;
    }

    // ===== SHEET 3: Instructions =====
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.getColumn(1).width = 80;

    const instructions = [
      '═══════════════════════════════════════════════════════════════',
      'TEMPLATE PENGISIAN DATA CHAT PERFORMANCE',
      '═══════════════════════════════════════════════════════════════',
      '',
      '📋 PETUNJUK PENGISIAN:',
      '',
      '1. Isi data pada sheet "Data"',
      '2. Data sheet hanya memiliki kolom A sampai P (16 kolom)',
      '3. Mulai dari baris 2 (baris 1 adalah header)',
      '4. Klik pada cell untuk melihat DROPDOWN - pilih dari list',
      '5. Format tanggal: 01 Jan 2026 (DD MMM YYYY)',
      '',
      '✅ KOLOM WAJIB DIISI (Required):',
      '',
      '   A. date           - Tanggal (format: 01 Jan 2026)',
      '   B. shift          - DROPDOWN',
      '   C. cs             - DROPDOWN',
      '   D. channel        - DROPDOWN',
      '   K. closing_status - DROPDOWN',
      '',
      '📝 KOLOM OPSIONAL (Optional):',
      '',
      '   E. name           - Nama kontak (free text)',
      '   F. cust           - Customer (free text)',
      '   G. order_number   - Order number (free text)',
      '   H. intention      - DROPDOWN',
      '   I. case           - DROPDOWN',
      '   J. product_name   - DROPDOWN (pilih artikel)',
      '   L. note           - Catatan (free text)',
      '   M. chat_status    - DROPDOWN',
      '   N. chat_status2   - DROPDOWN',
      '   O. follow_up      - DROPDOWN',
      '   P. survey         - DROPDOWN (TRUE/FALSE)',
      '',
      '💡 TIPS:',
      '',
      '   • Sheet hanya sampai kolom P - jangan tambah kolom',
      '   • Maksimal 50 baris data per upload',
      '   • Lihat sheet "Valid Options" untuk pilihan dropdown',
      '   • Kolom F (artikel) berisi kode artikel produk',
      '   • Kosongkan cell jika tidak ada data',
      '',
      '⚠️ PERINGATAN:',
      '',
      '   • Hanya kolom A-P yang diproses',
      '   • Data di luar range akan diabaikan',
      '',
      '═══════════════════════════════════════════════════════════════'
    ];

    instructions.forEach((text, idx) => {
      instructionsSheet.getCell(idx + 1, 1).value = text;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Chat_Performance_Template_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}