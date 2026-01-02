# Chat Performance Dashboard

Dashboard untuk mengelola dan memantau performa chat customer service dengan integrasi Google Sheets.

## Features

- ✅ Authentication dengan NextAuth
- ✅ CRUD Operations (Create, Read, Update, Delete)
- ✅ Google Sheets Integration
- ✅ Analytics Dashboard dengan Advanced Filtering
- ✅ Real-time Statistics
- ✅ Responsive Design
- ✅ Search Functionality

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Database**: Google Sheets API
- **Language**: JavaScript/React

## Prerequisites

- Node.js 18+ installed
- Google Cloud Platform account
- Google Sheets with service account access

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Google Sheets Configuration
SPREADSHEET_ID=1AulzLouwctWHY-DYeBYKKQ82J89m0JW5Sp_Vxn6ilzo
SHEET_NAME=Inbound Chat Performance

# Node Environment
NODE_ENV=development
```

## Google Sheets Setup

1. **Create a Google Cloud Project**
   - Go to https://console.cloud.google.com
   - Create a new project or select existing one

2. **Enable Google Sheets API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the details and create
   - Click on the created service account
   - Go to "Keys" tab > "Add Key" > "Create new key"
   - Choose JSON format
   - Save the file as `credentials.json` in the project root

4. **Share Google Sheet**
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (from credentials.json: `client_email`)
   - Give "Editor" access

5. **Sheet Structure**
   Your sheet should have these columns in order (Row 1):
   ```
   date | shift | cs | channel | name | cust | order_number | intention | case | product_name | closing_status | note | chat_status | chat_status2 | follow_up | survey
   ```

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in all required values

3. **Add Google Credentials**
   - Place your `credentials.json` in the project root

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   - Navigate to http://localhost:3000
   - Login with default credentials (admin/admin123)

## Project Structure

```
chat-performance-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/    # NextAuth configuration
│   │   │   ├── data/                  # CRUD operations
│   │   │   ├── analytics/             # Analytics data
│   │   │   └── stats/                 # Statistics
│   │   ├── dashboard/
│   │   │   ├── analytics/             # Analytics page
│   │   │   ├── create/                # Create data page
│   │   │   ├── edit/[id]/             # Edit data page
│   │   │   ├── layout.js              # Dashboard layout
│   │   │   └── page.js                # Main dashboard
│   │   ├── login/                     # Login page
│   │   ├── globals.css                # Global styles
│   │   ├── layout.js                  # Root layout
│   │   └── page.js                    # Home page (redirect)
│   ├── components/
│   │   ├── Header.js                  # Header component
│   │   ├── SessionProvider.js         # Session wrapper
│   │   └── Sidebar.js                 # Sidebar navigation
│   └── lib/
│       └── googleSheets.js            # Google Sheets service
├── credentials.json                   # Google service account (gitignored)
├── .env.local                         # Environment variables (gitignored)
├── .env.example                       # Environment template
├── package.json
├── tailwind.config.js
└── README.md
```

## Features Details

### 1. Dashboard
- View all chat performance data
- Real-time statistics (Total, Closed, Open chats)
- Search functionality
- Delete records

### 2. Analytics
- Advanced filtering by:
  - Date range
  - Intention
  - Case
  - Channel
  - Shift
  - Customer Service
  - Closing Status
- Statistics:
  - Total chats
  - Closed/Open rates
  - Unique intentions count
  - Unique cases count
- Filtered data table view

### 3. Create/Edit
- Form validation
- Auto-populated date field
- Dropdown selects for consistent data
- Required field indicators

## Default Login Credentials

```
Username: admin
Password: admin123
```

**⚠️ IMPORTANT**: Change these credentials in production by updating the `.env.local` file.

## API Routes

- `GET /api/data` - Fetch all data
- `POST /api/data` - Create new record
- `GET /api/data/[id]` - Fetch single record
- `PUT /api/data/[id]` - Update record
- `DELETE /api/data/[id]` - Delete record
- `GET /api/stats` - Get statistics
- `GET /api/analytics` - Get analytics data with filters

## Security

- Authentication required for all dashboard routes
- Session-based authentication with JWT
- Environment variables for sensitive data
- Service account for Google Sheets (no user credentials stored)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Add `credentials.json` content as environment variable:
   ```
   GOOGLE_CREDENTIALS=<paste entire credentials.json content>
   ```
5. Update `src/lib/googleSheets.js` to use env variable:
   ```javascript
   const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
   this.auth = new google.auth.GoogleAuth({
     credentials: credentials,
     scopes: ['https://www.googleapis.com/auth/spreadsheets'],
   });
   ```
6. Deploy!

## Troubleshooting

### Authentication Issues
- Ensure `NEXTAUTH_SECRET` is set and strong
- Check `NEXTAUTH_URL` matches your deployment URL

### Google Sheets Issues
- Verify service account has Editor access to the sheet
- Check `SPREADSHEET_ID` in .env.local
- Ensure `SHEET_NAME` matches exactly (case-sensitive)
- Verify columns order matches the code

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (18+ required)
- Clear `.next` folder and rebuild

## License

MIT License - feel free to use for your projects!

## Support

For issues or questions, please create an issue in the GitHub repository.
