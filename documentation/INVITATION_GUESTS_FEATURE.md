# Invitation Guests Management Feature

## Overview

This feature allows users to upload and manage invitation guest lists via CSV files. The system provides a complete workflow for importing guest lists, searching guests, and automatically filling guest registration forms from the invitation list.

## Database Structure

### Table: `invitation_guests`

A properly normalized table for storing invitation guest information:

```sql
CREATE TABLE invitation_guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  group_category TEXT,
  note TEXT,
  is_imported BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Updated Table: `guests`

Added foreign key relationship to link registered guests with invitation guests:

```sql
ALTER TABLE guests ADD COLUMN invitation_guest_id INTEGER;
-- Foreign key constraint: REFERENCES invitation_guests(id) ON DELETE SET NULL
```

### Database Normalization

- **First Normal Form (1NF)**: All columns contain atomic values
- **Second Normal Form (2NF)**: No partial dependencies (all non-key attributes depend on the entire primary key)
- **Third Normal Form (3NF)**: No transitive dependencies (non-key attributes don't depend on other non-key attributes)
- **Referential Integrity**: Foreign key relationship between `guests` and `invitation_guests`

## Features

### 1. CSV Upload and Import

#### Supported CSV Format

```csv
Name,Phone,Email,Address,Group,Note
John Doe,012345678,john@example.com,Phnom Penh,Family,VIP Guest
Jane Smith,098765432,jane@example.com,Siem Reap,Friends,
```

#### CSV Column Mapping

| CSV Header (English) | CSV Header (Khmer) | Database Field |
| -------------------- | ------------------ | -------------- |
| Name                 | ឈ្មោះ              | name           |
| Phone                | លេខ                | phone          |
| Email                | អ៊ីមែល             | email          |
| Address              | អាសយដ្ឋាន          | address        |
| Group                | ក្រុម              | group_category |
| Note                 | កំណត់              | note           |

### 2. Invitation Guests Management Interface

#### Features:

- **Statistics Dashboard**: Display total guests, imported count, and pending count
- **CSV Upload**: Upload CSV files with validation
- **CSV Preview**: Preview data before importing (shows first 10 rows)
- **Bulk Import**: Import all guests in one transaction
- **Search and Filter**: Search by name/phone/email, filter by group or import status
- **Individual Actions**: Add to registry, delete guests
- **Bulk Actions**: Clear all invitation guests

### 3. Guest Registration Integration

#### Auto-fill from Invitation List

When adding a new guest in the registry:

1. Search invitation guests in real-time
2. Display suggestions as user types
3. Click suggestion to auto-fill name and phone
4. System automatically marks invitation guest as "imported"
5. Creates link between registry guest and invitation guest

#### Benefits:

- Faster data entry
- Reduced typing errors
- Track which invitation guests have registered
- Maintain data consistency

## API Methods

### Database Methods (database.js)

```javascript
// Add single invitation guest
await database.addInvitationGuest(guest);

// Bulk import from CSV
await database.bulkAddInvitationGuests(guests);

// Get invitation guests with filters
await database.getInvitationGuests({
  search: "John",
  group_category: "Family",
  is_imported: false,
});

// Get single guest
await database.getInvitationGuest(id);

// Update guest
await database.updateInvitationGuest(id, guest);

// Delete guest
await database.deleteInvitationGuest(id);

// Mark as imported
await database.markInvitationGuestAsImported(id);

// Get statistics
await database.getInvitationGuestStats();

// Clear all
await database.clearAllInvitationGuests();
```

### IPC Handlers (main.js)

All methods are exposed via Electron IPC:

```javascript
ipcMain.handle("add-invitation-guest", async (event, guest) => {...});
ipcMain.handle("bulk-add-invitation-guests", async (event, guests) => {...});
ipcMain.handle("get-invitation-guests", async (event, filters) => {...});
ipcMain.handle("get-invitation-guest", async (event, id) => {...});
ipcMain.handle("update-invitation-guest", async (event, id, guest) => {...});
ipcMain.handle("delete-invitation-guest", async (event, id) => {...});
ipcMain.handle("mark-invitation-guest-imported", async (event, id) => {...});
ipcMain.handle("get-invitation-guests-stats", async () => {...});
ipcMain.handle("clear-all-invitation-guests", async () => {...});
```

### Frontend Functions (app.js)

```javascript
// Open/Close modal
openInvitationGuestsModal();
closeInvitationGuestsModal();

// Load data
loadInvitationGuests(filters);
loadInvitationGuestsStats();

// CSV operations
uploadCSVFile(event);
parseCSV(content);
displayCSVPreview(data);
importCSVData();

// CRUD operations
deleteInvitationGuest(id);
clearAllInvitationGuests();
selectInvitationGuestForRegistry(id);

// Search and suggestions
searchInvitationGuestsForSuggestions(query);
fillGuestFromInvitation(id);

// Utilities
downloadCSVTemplate();
```

## User Interface Components

### 1. Manage Invitation Guests Button

- Location: Controls section (main page)
- Icon: Address book
- Opens invitation guests management modal

### 2. Invitation Guests Modal

#### Components:

- **Statistics Cards**: Total, Imported, Pending counts
- **CSV Upload Section**: Drag-and-drop area with file picker
- **CSV Preview Table**: Shows preview of uploaded data
- **Search and Filter Bar**: Real-time search and dropdown filters
- **Guests Table**: Displays all invitation guests with actions
- **Empty State**: Shown when no guests exist

### 3. Guest Registration Modal Enhancement

#### New Components:

- **Invitation Search Box**: Auto-complete search field
- **Suggestions Dropdown**: Shows matching invitation guests
- **Form Divider**: "Or Enter Manually" separator
- **Hidden Field**: Stores selected invitation_guest_id

## Styling

### Design Principles

1. **Consistency**: Matches existing wedding book design system
2. **Khmer-Friendly**: Supports Khmer fonts and layout
3. **Responsive**: Works on all screen sizes
4. **Accessible**: Good color contrast and keyboard navigation
5. **Animated**: Smooth transitions and hover effects

### Key Styles

- **Primary Color**: #e91e63 (Pink)
- **Success Color**: #4caf50 (Green for imported)
- **Warning Color**: #ff9800 (Orange for pending)
- **Border Radius**: 8-12px (modern rounded corners)
- **Shadows**: Multi-layer shadows for depth
- **Transitions**: 0.3s ease-in-out

## Error Handling

### CSV Upload Validation

```javascript
// File type validation
if (!file.name.endsWith(".csv")) {
  showNotification("សូមជ្រើសរើសឯកសារ CSV", "error");
  return;
}

// Empty file validation
if (csvData.length === 0) {
  showNotification("ឯកសារ CSV ទទេ", "error");
  return;
}
```

### Database Error Handling

All database operations use try-catch blocks:

```javascript
try {
  showLoading(true);
  const result = await ipcRenderer.invoke(
    "bulk-add-invitation-guests",
    csvData
  );
  showNotification(`បាននាំចូល ${result.successCount} ជួរដោយជោគជ័យ`, "success");
} catch (error) {
  console.error("Error importing CSV:", error);
  showNotification("មានបញ្ហាក្នុងការនាំចូលទិន្នន័យ", "error");
} finally {
  showLoading(false);
}
```

### Transaction Safety

Bulk imports use database transactions:

```javascript
this.db.run("BEGIN TRANSACTION");
// ... insert operations ...
if (errorCount > 0) {
  this.db.run("ROLLBACK");
} else {
  this.db.run("COMMIT");
}
```

## Testing Checklist

### Database Testing

- [ ] Create invitation_guests table successfully
- [ ] Add invitation_guest_id column to guests table
- [ ] Insert single invitation guest
- [ ] Bulk insert multiple invitation guests
- [ ] Query with filters (search, group, status)
- [ ] Update invitation guest
- [ ] Delete invitation guest
- [ ] Mark guest as imported
- [ ] Get statistics
- [ ] Clear all guests

### UI Testing

- [ ] Open invitation guests modal
- [ ] Display statistics correctly
- [ ] Upload CSV file
- [ ] Display CSV preview
- [ ] Import CSV data
- [ ] Search invitation guests
- [ ] Filter by group category
- [ ] Filter by import status
- [ ] Select guest for registry
- [ ] Delete individual guest
- [ ] Clear all guests
- [ ] Download CSV template

### Integration Testing

- [ ] Search invitation guests in add guest modal
- [ ] Select invitation guest auto-fills form
- [ ] Mark guest as imported when added to registry
- [ ] Link created between guests and invitation_guests
- [ ] Statistics update after actions
- [ ] Empty state displays correctly
- [ ] Error notifications show properly
- [ ] Loading states work correctly

### Responsive Testing

- [ ] Desktop (1400px+)
- [ ] Laptop (1024px)
- [ ] Tablet (768px)
- [ ] Mobile (480px)

## Performance Considerations

1. **Lazy Loading**: Only load invitation guests when modal is opened
2. **Debounced Search**: 300ms delay on search input
3. **Transaction Batching**: Bulk imports use single transaction
4. **Index Optimization**: Consider adding indexes on frequently queried columns:
   ```sql
   CREATE INDEX idx_invitation_guests_name ON invitation_guests(name);
   CREATE INDEX idx_invitation_guests_phone ON invitation_guests(phone);
   CREATE INDEX idx_invitation_guests_is_imported ON invitation_guests(is_imported);
   ```

## Future Enhancements

### Planned Features

1. **Excel Import**: Support .xlsx files in addition to CSV
2. **Export**: Export invitation guests to CSV/Excel
3. **Duplicate Detection**: Warn about duplicate names/phones
4. **Advanced Filtering**: Multiple filters, saved filter presets
5. **Bulk Actions**: Select multiple guests for bulk operations
6. **Guest Groups Management**: Create and manage custom groups
7. **Import History**: Track all imports with timestamps
8. **SMS Integration**: Send invitation SMS to guests
9. **QR Code Generation**: Generate unique QR codes per guest
10. **Check-in System**: Track guest arrival at event

### Potential Improvements

1. **CSV Column Mapping UI**: Let users map columns visually
2. **Data Validation**: Validate phone numbers, emails during import
3. **Merge Duplicates**: Smart duplicate merging
4. **Undo/Redo**: Undo recent actions
5. **Guest Notes**: Rich text editor for notes
6. **Attachments**: Attach files to guest records
7. **Relationship Mapping**: Link related guests (family members)

## Security Considerations

1. **Input Sanitization**: All user inputs are escaped before display
2. **SQL Injection Prevention**: Using parameterized queries
3. **File Type Validation**: Only accept CSV files
4. **File Size Limits**: Consider adding max file size (e.g., 5MB)
5. **Transaction Rollback**: Failed imports rollback completely
6. **Data Privacy**: No external data transmission (fully offline)

## Troubleshooting

### Common Issues

**Issue**: CSV upload fails

- **Solution**: Check CSV format matches template, ensure UTF-8 encoding

**Issue**: Guests not appearing in search

- **Solution**: Check is_imported filter, verify data imported correctly

**Issue**: Auto-fill not working

- **Solution**: Ensure invitation_guest_id is being set, check IPC handlers

**Issue**: Statistics not updating

- **Solution**: Call loadInvitationGuestsStats() after operations

**Issue**: Modal not opening

- **Solution**: Check console for errors, verify setupInvitationGuestsListeners() is called

## Code Quality

### Best Practices Implemented

1. ✅ **Modular Code**: Separate concerns (DB, UI, logic)
2. ✅ **Error Handling**: Try-catch blocks everywhere
3. ✅ **Loading States**: Show loading during async operations
4. ✅ **User Feedback**: Notifications for all actions
5. ✅ **Input Validation**: Validate before processing
6. ✅ **Clean Code**: Descriptive names, comments where needed
7. ✅ **Responsive Design**: Mobile-first approach
8. ✅ **Accessibility**: Semantic HTML, ARIA labels
9. ✅ **Performance**: Debouncing, lazy loading
10. ✅ **Documentation**: Comprehensive docs and comments

## Maintenance

### Regular Maintenance Tasks

1. **Database Cleanup**: Periodically remove old imported guests
2. **Performance Monitoring**: Check query performance as data grows
3. **Backup**: Regular database backups
4. **Testing**: Run tests after updates
5. **User Feedback**: Gather feedback for improvements

## Conclusion

The Invitation Guests Management feature provides a complete, production-ready solution for managing wedding invitation lists. It follows best practices for database design, code organization, error handling, and user experience. The feature is fully integrated with the existing wedding book system and maintains consistency in design and functionality.

## Support

For issues or questions:

1. Check console logs for error messages
2. Review this documentation
3. Check database structure with SQLite tools
4. Review implementation files:
   - `/src/database.js` - Database methods
   - `/src/app.js` - Frontend logic
   - `/src/index.html` - UI structure
   - `/src/CSS/styles.css` - Styling
   - `/main.js` - IPC handlers
