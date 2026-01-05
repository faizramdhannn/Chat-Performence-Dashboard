import { google } from 'googleapis';
import path from 'path';
import bcrypt from 'bcryptjs';

class GoogleSheetsService {
  constructor() {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    this.auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = process.env.SPREADSHEET_ID;
  }

  // ============ USER MANAGEMENT ============
  async getAllUsers() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A:E`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      return rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.username === username);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const values = [[
        userData.id || Date.now().toString(),
        userData.username,
        hashedPassword,
        userData.role || 'cs',
        userData.name || userData.username
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A:E`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(rowIndex, userData) {
    try {
      let passwordValue = userData.password;
      
      // Only hash if password is being changed
      if (userData.password && !userData.password.startsWith('$2')) {
        passwordValue = await bcrypt.hash(userData.password, 10);
      }

      const values = [[
        userData.id,
        userData.username,
        passwordValue,
        userData.role,
        userData.name
      ]];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A${rowIndex}:E${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(rowIndex) {
    try {
      return await this.deleteRow(process.env.USERS_SHEET, rowIndex);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ============ REGISTRATION MANAGEMENT ============
  async getPendingRegistrations() {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      return rows.slice(1)
        .map((row, index) => {
          const obj = { rowIndex: index + 2 };
          headers.forEach((header, i) => {
            obj[header] = row[i] || '';
          });
          return obj;
        })
        .filter(reg => reg.status === 'pending');
    } catch (error) {
      console.error('Error fetching registrations:', error);
      // If sheet doesn't exist, return empty array
      return [];
    }
  }

  async createPendingRegistration(data) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      
      const values = [[
        data.id,
        data.username,
        data.password,
        data.name,
        data.status,
        data.requestedAt
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating registration:', error);
      throw error;
    }
  }

  async approveRegistration(registrationId, role) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const registrations = await this.getPendingRegistrations();
      const registration = registrations.find(r => r.id === registrationId);

      if (!registration) {
        throw new Error('Registration not found');
      }

      // Create user in users sheet
      await this.createUserFromRegistration(registration, role);

      // Update registration status
      const values = [[
        registration.id,
        registration.username,
        registration.password,
        registration.name,
        'approved',
        registration.requestedAt
      ]];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${registration.rowIndex}:F${registration.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving registration:', error);
      throw error;
    }
  }

  async createUserFromRegistration(registration, role) {
    try {
      const values = [[
        registration.id,
        registration.username,
        registration.password, // Already hashed
        role,
        registration.name
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A:E`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating user from registration:', error);
      throw error;
    }
  }

  async rejectRegistration(registrationId) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const registrations = await this.getPendingRegistrations();
      const registration = registrations.find(r => r.id === registrationId);

      if (!registration) {
        throw new Error('Registration not found');
      }

      // Delete the registration row
      return await this.deleteRow(sheetName, registration.rowIndex);
    } catch (error) {
      console.error('Error rejecting registration:', error);
      throw error;
    }
  }

  // ============ SETTINGS MANAGEMENT ============
  async getSettings() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.SETTINGS_SHEET}!A:B`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return {};
      }

      const settings = {};
      rows.forEach(row => {
        if (row[0]) {
          settings[row[0]] = row[1] || '';
        }
      });

      return settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      const values = Object.entries(settings).map(([key, value]) => [key, value]);

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.SETTINGS_SHEET}!A:B`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // ============ MASTER DATA (DROPDOWNS) ============
  async getMasterData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.MASTER_DATA_SHEET}!A:O`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return {};
      }

      const headers = rows[0];
      const masterData = {};

      headers.forEach((header, index) => {
        masterData[header] = rows.slice(1)
          .map(row => row[index])
          .filter(val => val && val.trim() !== '');
      });

      return masterData;
    } catch (error) {
      console.error('Error fetching master data:', error);
      throw error;
    }
  }

  // ============ CHAT PERFORMANCE DATA ============
  async getAllData() {
    try {
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:P`,
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
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;

      // Get all existing data to find first empty row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`, // Only get column A to check for empty rows
      });

      const rows = response.data.values || [];
      
      // Find first empty row (skip header at row 1)
      let targetRow = 2; // Start from row 2 (after header)
      for (let i = 1; i < rows.length; i++) { // Start from index 1 (row 2)
        if (!rows[i] || !rows[i][0] || rows[i][0].trim() === '') {
          targetRow = i + 1; // +1 because array is 0-indexed but rows are 1-indexed
          break;
        }
      }
      
      // If all rows have data, append at the end
      if (targetRow === 2 && rows.length > 1) {
        targetRow = rows.length + 1;
      }

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

      // Use update instead of append to write to specific row
      const updateResponse = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${targetRow}:P${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return updateResponse.data;
    } catch (error) {
      console.error('Error adding data:', error);
      throw error;
    }
  }

  async updateData(rowIndex, data) {
    try {
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;

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
        range: `${sheetName}!A${rowIndex}:P${rowIndex}`,
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
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;
      
      return await this.deleteRow(sheetName, rowIndex);
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

  // ============ HELPER METHODS ============
  async deleteRow(sheetName, rowIndex) {
    try {
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets.find(
        s => s.properties.title === sheetName
      );

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
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
      console.error('Error deleting row:', error);
      throw error;
    }
  }
}

export default new GoogleSheetsService();