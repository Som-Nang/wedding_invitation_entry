# Testing Guide - Invitation Guests Feature

## Quick Testing Steps

### 1. Start the Application

```bash
npm start
```

### 2. Test CSV Upload

#### Step 2.1: Create Test CSV File

Create a file named `test_guests.csv` with this content:

```csv
Name,Phone,Email,Address,Group,Note
សុខ សារី,012345678,sok@example.com,Phnom Penh,Family,VIP Guest
ចន្ទ្រា ស្រីមុំ,098765432,chandra@example.com,Siem Reap,Friends,Regular Guest
ពិសី រដ្ឋា,011223344,pisey@example.com,Battambang,Family,
លីដា ជុំ,099887766,lida@example.com,Kampot,Colleagues,Important
ម៉ារី សុខ,087654321,mary@example.com,Phnom Penh,Friends,
```

#### Step 2.2: Upload CSV

1. Click "បញ្ជីភ្ញៀវអញ្ជើញ" (Manage Invitation Guests) button
2. Modal opens showing statistics (all should be 0)
3. Click "ជ្រើសរើសឯកសារ CSV" (Select CSV File)
4. Choose your `test_guests.csv` file
5. Preview table should appear showing the data
6. Verify preview shows correct data
7. Click "នាំចូលទិន្នន័យ" (Import Data)
8. Success notification should appear
9. Statistics should update: Total=5, Pending=5, Imported=0

### 3. Test Search and Filter

#### Search Test:

1. Type "សុខ" in search box
2. Table should filter to show only matching names
3. Clear search - all guests should reappear

#### Filter by Group:

1. Open "Group" dropdown
2. Select "Family"
3. Table shows only Family members
4. Reset filter to "All Groups"

#### Filter by Status:

1. Open "Status" dropdown
2. Select "Pending"
3. Table shows only non-imported guests
4. Select "Imported" - should show empty (none imported yet)

### 4. Test Guest Registration Integration

#### Step 4.1: Select Guest from Invitation List

1. In invitation modal, find "សុខ សារី"
2. Click the "+" (Add to Registry) icon
3. Invitation modal should close
4. Guest registration modal should open
5. Name and phone should be pre-filled with "សុខ សារី" and "012345678"

#### Step 4.2: Complete Registration

1. Fill in amount: 100
2. Select currency: USD
3. Select payment type: CASH
4. Click "រក្សាទុក" (Save)
5. Guest should be added to main registry table
6. Success notification appears

#### Step 4.3: Verify Import Status

1. Open invitation modal again
2. Find "សុខ សារី" in the list
3. Status should now show "បានបញ្ចូល" (Imported) with green badge
4. Statistics should update: Total=5, Pending=4, Imported=1

### 5. Test Auto-Complete Search

#### Step 5.1: Open Add Guest Modal

1. Click "បន្ថែមភ្ញៀវ" (Add Guest) button
2. Modal opens

#### Step 5.2: Search Invitation Guests

1. Find the search box "ស្វែងរកពីបញ្ជីអញ្ជើញ"
2. Type "ចន្ទ្រា"
3. Suggestions dropdown should appear
4. Should show "ចន្ទ្រា ស្រីមុំ" with phone "098765432"

#### Step 5.3: Select from Suggestions

1. Click on "ចន្ទ្រា ស្រីមុំ" suggestion
2. Name field auto-fills with "ចន្ទ្រា ស្រីមុំ"
3. Phone field auto-fills with "098765432"
4. Continue to fill amount and save

### 6. Test Delete Operations

#### Delete Individual Guest:

1. Open invitation modal
2. Find a guest you want to delete
3. Click trash icon
4. Confirm deletion dialog appears
5. Click OK
6. Guest removed from table
7. Statistics update

#### Clear All Guests:

1. Click "លុបទាំងអស់" (Clear All) button
2. Confirmation dialog appears
3. Click OK
4. All guests removed
5. Empty state appears
6. Statistics all show 0

### 7. Test CSV Template Download

1. Open invitation modal
2. Click "ទាញយកគំរូ CSV" (Download Template)
3. File `invitation_guests_template.csv` downloads
4. Open file and verify format
5. Use as template for creating your own CSV files

## Expected Results

### Database Checks

After importing 5 guests, check database:

```bash
sqlite3 database/wedding.db
```

```sql
-- Check invitation_guests table
SELECT * FROM invitation_guests;

-- Should show 5 rows with:
-- - Unique IDs
-- - Names, phones, emails, addresses
-- - Group categories
-- - is_imported = 0 for new, 1 for imported ones

-- Check foreign key relationship
SELECT g.name, g.amount, ig.name as invitation_name
FROM guests g
LEFT JOIN invitation_guests ig ON g.invitation_guest_id = ig.id;

-- Should show linked records
```

### UI Checks

✅ Modal opens and closes smoothly
✅ Statistics display correctly
✅ CSV upload works with validation
✅ Preview shows correct data
✅ Import succeeds with transaction
✅ Search filters table in real-time
✅ Filters work independently and combined
✅ Guest selection auto-fills form
✅ Status updates to "imported"
✅ Delete operations work
✅ Empty state displays when no data
✅ All notifications appear correctly
✅ Loading states show during async operations

### Responsive Checks

Test on different screen sizes:

1. **Desktop (1400px+)**: All features visible, multi-column layout
2. **Laptop (1024px)**: Adjusted layout, readable
3. **Tablet (768px)**: Stacked components, still usable
4. **Mobile (480px)**: Single column, touch-friendly

## Common Issues and Solutions

### Issue: CSV upload fails

**Possible causes:**

- Wrong file format (not CSV)
- Missing required columns
- Encoding issues

**Solution:**

- Use UTF-8 encoding
- Ensure "Name" column exists
- Download and use template

### Issue: Search not working

**Possible causes:**

- JavaScript error in console
- Event listener not attached
- Input field not found

**Solution:**

- Check console for errors
- Verify `setupInvitationGuestsListeners()` is called
- Check element IDs match

### Issue: Guest not auto-filling

**Possible causes:**

- IPC handler not registered
- Guest ID not passed correctly
- Form fields not found

**Solution:**

- Check main.js has all IPC handlers
- Verify `invitation_guest_id` hidden field exists
- Check console for errors

### Issue: Statistics not updating

**Possible causes:**

- Stats query error
- Not refreshing after operations

**Solution:**

- Check database query in `getInvitationGuestStats()`
- Call `loadInvitationGuestsStats()` after each operation

## Performance Testing

### Large CSV Files

Test with larger datasets:

1. Create CSV with 100 guests
2. Import and measure time
3. Test search performance
4. Check memory usage
5. Verify table rendering speed

**Expected:**

- Import 100 guests: < 2 seconds
- Search response: < 100ms
- Table rendering: < 500ms
- Memory usage: < 50MB increase

### Database Performance

```sql
-- Check query performance
EXPLAIN QUERY PLAN SELECT * FROM invitation_guests WHERE name LIKE '%test%';

-- Add indexes if needed
CREATE INDEX idx_invitation_guests_name ON invitation_guests(name);
CREATE INDEX idx_invitation_guests_phone ON invitation_guests(phone);
```

## Regression Testing

After implementation, verify existing features still work:

- [ ] Add regular guest (without invitation)
- [ ] Edit existing guest
- [ ] Delete guest
- [ ] Search guests in main table
- [ ] Export to Excel
- [ ] Export to PDF
- [ ] Print functionality
- [ ] Wedding info management
- [ ] QR code upload
- [ ] Dashboard statistics

## Acceptance Criteria

✅ **Feature Complete**: All planned features implemented
✅ **Database Clean**: Normalized structure with proper relationships
✅ **Error Handling**: All operations have try-catch blocks
✅ **User Feedback**: Notifications for all actions
✅ **Responsive**: Works on all screen sizes
✅ **Documentation**: Complete documentation provided
✅ **Code Quality**: Clean, modular, well-commented code
✅ **No Breaking Changes**: Existing features work as before
✅ **Performance**: Fast response times
✅ **Offline**: Works completely offline

## Sign-off Checklist

Before marking feature as complete:

- [ ] All unit tests pass
- [ ] Manual testing completed
- [ ] Responsive design verified
- [ ] Error handling tested
- [ ] Documentation reviewed
- [ ] Code reviewed for quality
- [ ] Performance benchmarks met
- [ ] No console errors or warnings
- [ ] Database migrations work
- [ ] Backward compatibility maintained
- [ ] User feedback incorporated
- [ ] Final QA passed

## Next Steps

After successful testing:

1. Build production version
2. Create installer
3. User acceptance testing
4. Deploy to production
5. Monitor for issues
6. Gather user feedback
7. Plan next iteration

## Support

If you encounter any issues during testing:

1. Check console logs
2. Review documentation
3. Check database state
4. Verify file structure
5. Review recent changes
6. Contact development team
