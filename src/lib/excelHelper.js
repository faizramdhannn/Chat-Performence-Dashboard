import * as XLSX from 'xlsx';

export class ExcelHelper {
  // Convert date to "01 Jan 2026" format
  static formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  }

  // Parse date from various formats to "01 Jan 2026"
  static parseDate(dateStr) {
    if (!dateStr) return '';
    
    // If already in correct format, return as is
    if (/^\d{2} [A-Za-z]{3} \d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse various formats
    let date;
    
    // DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[/-]/);
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } 
    // YYYY-MM-DD
    else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      date = new Date(dateStr);
    }
    // Excel serial number
    else if (!isNaN(dateStr)) {
      date = XLSX.SSF.parse_date_code(dateStr);
      date = new Date(date.y, date.m - 1, date.d);
    }
    else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    return this.formatDate(date);
  }

  // Validate data against master data
  static validateRow(row, masterData, rowNumber) {
    const errors = [];
    
    // Validate date
    if (!row.date) {
      errors.push(`Row ${rowNumber}: Date is required`);
    } else {
      try {
        this.parseDate(row.date);
      } catch (e) {
        errors.push(`Row ${rowNumber}: Invalid date format (use DD/MM/YYYY)`);
      }
    }
    
    // Validate required fields
    if (!row.shift) errors.push(`Row ${rowNumber}: Shift is required`);
    if (!row.cs) errors.push(`Row ${rowNumber}: CS is required`);
    if (!row.channel) errors.push(`Row ${rowNumber}: Channel is required`);
    if (!row.closing_status) errors.push(`Row ${rowNumber}: Closing Status is required`);
    
    // Validate against master data
    if (row.shift && masterData.shift && !masterData.shift.includes(row.shift)) {
      errors.push(`Row ${rowNumber}: Invalid shift "${row.shift}". Must be one of: ${masterData.shift.join(', ')}`);
    }
    
    if (row.cs && masterData.cs && !masterData.cs.includes(row.cs)) {
      errors.push(`Row ${rowNumber}: Invalid CS "${row.cs}". Must be one of: ${masterData.cs.join(', ')}`);
    }
    
    if (row.channel && masterData.channel && !masterData.channel.includes(row.channel)) {
      errors.push(`Row ${rowNumber}: Invalid channel "${row.channel}". Must be one of: ${masterData.channel.join(', ')}`);
    }
    
    if (row.intention && masterData.intention && !masterData.intention.includes(row.intention)) {
      errors.push(`Row ${rowNumber}: Invalid intention "${row.intention}". Must be one of: ${masterData.intention.join(', ')}`);
    }
    
    if (row.case && masterData.case && !masterData.case.includes(row.case)) {
      errors.push(`Row ${rowNumber}: Invalid case "${row.case}". Must be one of: ${masterData.case.join(', ')}`);
    }
    
    if (row.product_name && masterData.product_name && !masterData.product_name.includes(row.product_name)) {
      errors.push(`Row ${rowNumber}: Invalid product_name "${row.product_name}". Must be one of: ${masterData.product_name.join(', ')}`);
    }
    
    if (row.closing_status && masterData.closing_status && !masterData.closing_status.includes(row.closing_status)) {
      errors.push(`Row ${rowNumber}: Invalid closing_status "${row.closing_status}". Must be one of: ${masterData.closing_status.join(', ')}`);
    }
    
    if (row.chat_status && masterData.chat_status && !masterData.chat_status.includes(row.chat_status)) {
      errors.push(`Row ${rowNumber}: Invalid chat_status "${row.chat_status}". Must be one of: ${masterData.chat_status.join(', ')}`);
    }
    
    if (row.chat_status2 && masterData.chat_status2 && !masterData.chat_status2.includes(row.chat_status2)) {
      errors.push(`Row ${rowNumber}: Invalid chat_status2 "${row.chat_status2}". Must be one of: ${masterData.chat_status2.join(', ')}`);
    }
    
    if (row.follow_up && masterData.follow_up && !masterData.follow_up.includes(row.follow_up)) {
      errors.push(`Row ${rowNumber}: Invalid follow_up "${row.follow_up}". Must be one of: ${masterData.follow_up.join(', ')}`);
    }
    
    // Validate survey (should be boolean-like)
    if (row.survey !== undefined && row.survey !== '') {
      const surveyStr = String(row.survey).toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no', 'ya', 'tidak'].includes(surveyStr)) {
        errors.push(`Row ${rowNumber}: Survey must be true/false, yes/no, or 1/0`);
      }
    }
    
    return errors;
  }

  // Normalize survey value to boolean string
  static normalizeSurvey(value) {
    if (!value && value !== 0) return '';
    const str = String(value).toLowerCase();
    if (['true', '1', 'yes', 'ya'].includes(str)) return 'TRUE';
    if (['false', '0', 'no', 'tidak'].includes(str)) return 'FALSE';
    return '';
  }

  // Read Excel file
  static readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  // Create Excel file
  static createExcelFile(data, filename) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Auto-size columns
    const maxWidth = 50;
    const colWidths = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const len = String(cell.v).length;
          if (len > maxLen) maxLen = len;
        }
      }
      colWidths.push({ wch: Math.min(maxLen + 2, maxWidth) });
    }
    worksheet['!cols'] = colWidths;
    
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }

  // Download file
  static downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}