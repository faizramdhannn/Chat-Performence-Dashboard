import { google } from 'googleapis';
import path from 'path';

class GoogleSheetsService {
  constructor() {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    this.auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.sheetName = process.env.SHEET_NAME || 'Inbound Chat Performance';
  }

  async getAllData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:P`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  async addData(data) {
    try {
      const values = [[
        data.date || '',
        data.shift || '',
        data.cs || '',
        data.channel || '',
        data.name || '',
        data.cust || '',
        data.order_number || '',
        data.intention || '',
        data.case || '',
        data.product_name || '',
        data.closing_status || '',
        data.note || '',
        data.chat_status || '',
        data.chat_status2 || '',
        data.follow_up || '',
        data.survey || ''
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:P`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error adding data:', error);
      throw error;
    }
  }

  async updateData(rowIndex, data) {
    try {
      const values = [[
        data.date || '',
        data.shift || '',
        data.cs || '',
        data.channel || '',
        data.name || '',
        data.cust || '',
        data.order_number || '',
        data.intention || '',
        data.case || '',
        data.product_name || '',
        data.closing_status || '',
        data.note || '',
        data.chat_status || '',
        data.chat_status2 || '',
        data.follow_up || '',
        data.survey || ''
      ]];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${rowIndex}:P${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
    }
  }

  async deleteData(rowIndex) {
    try {
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets.find(
        s => s.properties.title === this.sheetName
      );

      if (!sheet) {
        throw new Error('Sheet not found');
      }

      const sheetId = sheet.properties.sheetId;

      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            },
          ],
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error deleting data:', error);
      throw error;
    }
  }

  async getDataByRowIndex(rowIndex) {
    try {
      const allData = await this.getAllData();
      return allData.find(item => item.rowIndex === rowIndex);
    } catch (error) {
      console.error('Error fetching single data:', error);
      throw error;
    }
  }
}

export default new GoogleSheetsService();
