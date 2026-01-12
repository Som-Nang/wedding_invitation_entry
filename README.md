# ប្រព័ន្ធកត់ចំណងដៃ (Wedding List Management System)

A modern, offline desktop application for managing wedding guest lists with Khmer language support.

## Features

- **Offline-first**: No internet connection required
- **Khmer Language Support**: Full support for Khmer text and numbers
- **Modern UI**: Clean, animated interface with smooth transitions
- **CSV Import**: Upload invitation guest lists via CSV files
- **Guest Management**: Manage invitation guests with search and filters
- **Auto-Complete**: Search and select guests from invitation list
- **Real-time Calculations**: Automatic totals for KHR, USD, and guest counts
- **Export Capabilities**: Export to Excel and PDF formats
- **Search Functionality**: Quick search by guest name, phone, or notes
- **Payment Types**: Support for CASH, ABA, and AC payment methods
- **Print Support**: Print-friendly layouts
- **QR Code Payment**: Upload and display payment QR codes

## Technology Stack

- **Electron**: Desktop application framework
- **SQLite**: Local database for data storage
- **HTML/CSS/JavaScript**: Frontend technologies
- **XLSX**: Excel file generation
- **Nokora Font**: Khmer typography support

## Installation

1. Clone or extract the project
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

To build the application for distribution:

```bash
npm run build-win
```

This will create a Windows installer in the `dist` folder.

## Usage

### Managing Invitation Guests

**NEW FEATURE**: Import and manage your invitation guest lists!

1. Click "បញ្ជីភ្ញៀវអញ្ជើញ" (Manage Invitation Guests) button
2. Upload a CSV file with your guest list:
   - Format: Name, Phone, Email, Address, Group, Note
   - Download the CSV template from the app
3. Preview and import guests
4. Use search and filters to find specific guests
5. Track which guests have been added to registry

### Adding Guests

**Option 1: From Invitation List**

1. Click "បន្ថែមភ្ញៀវ" (Add Guest) button
2. Start typing in the invitation search box
3. Select a guest from suggestions - form auto-fills!
4. Add amount and payment details
5. Click "រក្សាទុក" (Save)

**Option 2: Manual Entry**

1. Click the "បន្ថែមភ្ញៀវ" (Add Guest) button
2. Fill in the guest information:
   - Name (required)
   - Phone number
   - Notes
   - Amount and currency (KHR or USD)
   - Payment type (CASH, ABA, AC)
3. Click "រក្សាទុក" (Save) to add the guest

### Managing Guests

- **Edit**: Click the edit button (pencil icon) in the Actions column
- **Delete**: Click the delete button (trash icon) in the Actions column
- **Search**: Use the search box to filter guests by name, phone, or notes

### Exporting Data

- **Excel**: Click "Export Excel" to save as .xlsx file
- **PDF**: Click "Export PDF" to save as PDF document
- **Print**: Click "Print" or use Ctrl+P for printing

### Keyboard Shortcuts

- `Ctrl+N`: Add new guest
- `Ctrl+F`: Focus search box
- `Ctrl+P`: Print
- `Ctrl+E`: Export to Excel
- `Escape`: Close modal dialogs

## Database

The application uses SQLite database stored locally. The database location differs between development and production modes.

### Database Location

| Mode                     | Database Path                                           |
| ------------------------ | ------------------------------------------------------- |
| **Development**          | `<project>/database/wedding.db`                         |
| **Production (.exe)**    | `%APPDATA%\wedding-list-management\database\wedding.db` |
| **Uploads (Production)** | `%APPDATA%\wedding-list-management\database\uploads\`   |

#### Quick Access to Production Data

Press `Win+R` → Type: `%appdata%\wedding-list-management` → Press Enter

**Full Example Path:**

```
C:\Users\<username>\AppData\Roaming\wedding-list-management\
├── database\
│   ├── wedding.db          ← All guest data
│   ├── wedding.db-shm      ← WAL shared memory (temporary)
│   ├── wedding.db-wal      ← Write-ahead log (temporary)
│   └── uploads\            ← Uploaded image files (QR codes, etc.)
```

### Tables

1. **guests** - Registry of guests who have given gifts

   - Guest information (name, phone, note, amount, currency, payment type)
   - Link to invitation guest (invitation_guest_id)
   - Automatic timestamps for creation and updates

2. **invitation_guests** - Imported invitation guest lists

   - Guest information (name, phone, email, address, group_category, note)
   - Import status tracking (is_imported)
   - Timestamps for tracking

3. **wedding_files** - Uploaded files (QR codes, documents)

   - File metadata and paths

4. **wedding_info** - Wedding information
   - Bride/groom names, parents, date, location, etc.

### Data Normalization

The database follows Third Normal Form (3NF) principles:

- No data redundancy
- Proper foreign key relationships
- Data integrity maintained

### Data Persistence

All data is stored locally and persists across application restarts. No internet connection required.

## Backup & Restore

### 💾 How to Backup Data

**Important**: Always close the application before backing up!

#### Method 1: Quick Backup (Recommended)

1. Close the Wedding List Management application
2. Press `Win+R`, type `%appdata%\wedding-list-management` and press Enter
3. Copy the entire `database` folder to your backup location (USB, cloud, etc.)

#### Method 2: Manual Backup

1. Close the application
2. Navigate to: `C:\Users\<your-username>\AppData\Roaming\wedding-list-management\`
3. Copy the `database` folder

#### What Gets Backed Up:

| File/Folder  | Contains                                          |
| ------------ | ------------------------------------------------- |
| `wedding.db` | All guest records, invitation lists, wedding info |
| `uploads/`   | QR code images and uploaded files                 |

### 🔄 How to Restore Data

1. Close the Wedding List Management application
2. Navigate to `%appdata%\wedding-list-management\`
3. Replace the `database` folder with your backup copy
4. Start the application

### 📋 Backup Checklist

- [ ] Application is closed
- [ ] Copy `database` folder (not just `wedding.db`)
- [ ] Verify backup includes `uploads` subfolder if you have QR codes
- [ ] Store backup in a safe location

### ⚠️ Important Notes

- **Do NOT** backup while the app is running (database may be locked)
- The `.db-shm` and `.db-wal` files are temporary and will be recreated
- For complete backup, always copy the entire `database` folder

### 📝 ការបម្រុងទុកទិន្នន័យ (Khmer Guide)

**របៀបបម្រុងទុក:**

1. បិទកម្មវិធីគ្រប់គ្រងបញ្ជីភ្ញៀវមុនសិន
2. ចុច `Win+R` វាយ `%appdata%\wedding-list-management` រួចចុច Enter
3. ចម្លងថតឯកសារ `database` ទៅកន្លែងផ្ទុកទុក (USB, Cloud...)

**របៀបស្ដារទិន្នន័យ:**

1. បិទកម្មវិធី
2. ចូលទៅ `%appdata%\wedding-list-management\`
3. ជំនួសថតឯកសារ `database` ដោយច្បាប់ចម្លងដែលបានបម្រុងទុក
4. បើកកម្មវិធីឡើងវិញ

## Customization

### Fonts

The application uses the Nokora font for Khmer text support. You can modify the font settings in `src/styles.css`:

```css
body {
  font-family: "Nokora", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, sans-serif;
}
```

### Colors

Color scheme can be customized by modifying the CSS variables in `src/styles.css`:

```css
:root {
  --primary-color: #e91e63;
  --khr-color: #e53e3e;
  --usd-color: #38a169;
  /* ... other color variables */
}
```

### Currency Exchange Rate

For PDF exports, the application uses a fixed exchange rate (1 USD = 4100 KHR). You can modify this in `src/export.js`:

```javascript
// Update this value as needed
const USD_TO_KHR_RATE = 4100;
```

## Development

### Project Structure

```
wedding-book/
├── src/
│   ├── index.html          # Main HTML file
│   ├── app.js             # Main application logic
│   ├── database.js        # SQLite database operations
│   ├── export.js          # Export functionality (Excel/PDF)
│   └── CSS/
│       ├── styles.css      # Main CSS styles with Khmer support
│       └── alert.css       # Alert/notification styles
├── assets/                 # Application icons and images
├── database/              # SQLite database files
│   └── wedding.db         # Main database
├── documentation/         # Feature documentation
│   ├── INVITATION_GUESTS_FEATURE.md
│   ├── INVITATION_GUESTS_TESTING.md
│   ├── INVITATION_GUESTS_IMPLEMENTATION.md
│   ├── INVITATION_GUESTS_QUICK_REFERENCE.md
│   ├── QR_CODE_FEATURE.md
│   ├── QR_CODE_TESTING_GUIDE.md
│   └── QR_CODE_UI_DESIGN.md
├── main.js                # Electron main process
├── package.json           # Dependencies and scripts
├── sample_invitation_guests.csv  # Sample CSV for testing
└── README.md              # This file
```

### Adding New Features

1. **Database Changes**: Modify `src/database.js` to add new tables or columns
2. **UI Changes**: Update `src/index.html` and `src/CSS/styles.css`
3. **Logic Changes**: Add functionality in `src/app.js`
4. **Export Features**: Extend `src/export.js` for new export formats
5. **IPC Handlers**: Add new handlers in `main.js` for Electron communication

### Recent Updates

**Version 1.0.0** (January 2026)

- ✨ Added CSV invitation guest import
- ✨ Invitation guest management interface
- ✨ Auto-complete guest selection
- ✨ Guest status tracking
- ✨ Advanced search and filtering
- 🔧 Database normalization improvements
- 📚 Comprehensive documentation added

## Documentation

Detailed documentation available in the `documentation/` folder:

- **Invitation Guests**: Complete guide for CSV import and guest management
  - `INVITATION_GUESTS_FEATURE.md` - Full feature documentation
  - `INVITATION_GUESTS_TESTING.md` - Testing guide
  - `INVITATION_GUESTS_QUICK_REFERENCE.md` - Quick reference
- **QR Code Payment**: Guide for payment QR code feature
  - `QR_CODE_FEATURE.md` - Feature documentation
  - `QR_CODE_TESTING_GUIDE.md` - Testing guide

## Sample Data

A sample CSV file (`sample_invitation_guests.csv`) is included in the project root for testing the invitation import feature. The file contains 10 sample guests with Khmer names.

## Troubleshooting

### Common Issues

1. **Database errors**: Check if the database directory exists and has write permissions
2. **Font rendering**: Ensure Nokora font is loading correctly from Google Fonts
3. **Export failures**: Verify file save permissions and available disk space

### Debug Mode

Start the application in development mode to access developer tools:

```bash
npm run dev
```

Then press F12 to open developer tools for debugging.

## License

MIT License - See LICENSE file for details.

## Support

For support and updates, contact the development team or refer to the project documentation.
