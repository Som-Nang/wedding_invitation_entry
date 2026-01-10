# Quick Testing Guide - UX Improvements

**Testing Date:** January 10, 2026  
**Features to Test:**

1. Invitation guest status sync
2. Unified name field with autocomplete

---

## Test Scenario 1: Status Sync Verification

### Steps:

1. **Upload Invitation Guests**

   - Click "គ្រប់គ្រងបញ្ជីអញ្ជើញ" (Manage Invitation Guests) button
   - Click "📤 Upload CSV"
   - Select your sample CSV file or create one with format:
     ```csv
     Name,Phone,Email,Address,Group,Note
     John Doe,012345678,john@example.com,Phnom Penh,Family,VIP Guest
     Jane Smith,098765432,jane@example.com,Siem Reap,Friends,
     ```
   - Preview should show the guests
   - Click "បញ្ចូលទិន្នន័យ" (Import Data)
   - Verify success notification

2. **Add Guest from Invitation List**

   - Click "+ បន្ថែមមេហ្មាន" (Add Guest) button
   - In the "ឈ្មោះភ្ញៀវ" (Guest Name) field, start typing a name from the invitation list
   - Example: Type "John"
   - **Expected:** Autocomplete dropdown appears showing matching guests
   - Click on a suggestion (e.g., "John Doe")
   - **Expected:** Name and phone number are automatically filled
   - Add additional information (e.g., cash amount)
   - Click "រក្សាទុក" (Save)
   - **Expected:** Success notification appears

3. **Verify Status Update**
   - Click "គ្រប់គ្រងបញ្ជីអញ្ជើញ" (Manage Invitation Guests) again
   - Find the guest you just added (John Doe)
   - **Expected:** Status column shows "បានបញ្ចូល" (Imported) with green badge
   - **Expected:** Header shows updated count (e.g., "បានបញ្ចូល: 1")

### ✅ Pass Criteria:

- [ ] Autocomplete suggestions appear as typing
- [ ] Guest information auto-fills when selected
- [ ] Save operation completes successfully
- [ ] Status in invitation list changes to "បានបញ្ចូល" (Imported)
- [ ] Green badge appears next to imported guests
- [ ] Header count updates correctly

---

## Test Scenario 2: Unified Search/Input UX

### Steps:

1. **Verify Single Name Field**

   - Open "Add Guest" modal
   - **Expected:** Only ONE name field visible (no separate search field above it)
   - **Expected:** Label says "ឈ្មោះភ្ញៀវ \* / Guest Name (Search from invitation or type manually)"
   - **Expected:** NO "ស្វែងរកពីបញ្ជីអញ្ជើញ" (Search from Invitation List) section
   - **Expected:** NO "ឬបញ្ចូលដោយដៃ / Or Enter Manually" divider

2. **Test Autocomplete Search**

   - Type partial name: "Ja"
   - **Expected:** Dropdown appears after ~300ms
   - **Expected:** Shows matching guests (e.g., "Jane Smith")
   - **Expected:** Dropdown positioned directly below input
   - Hover over suggestion
   - **Expected:** Background changes to light gray
   - Click on suggestion
   - **Expected:** Name fills in, dropdown closes

3. **Test Manual Entry**

   - Clear the name field
   - Type a name NOT in invitation list: "Michael Jordan"
   - **Expected:** Dropdown shows "មិនមានលទ្ធផល" (No results)
   - Continue filling other fields
   - Click Save
   - **Expected:** Guest saved successfully with manual entry
   - Verify in guest list

4. **Test Dropdown Behavior**
   - Type name to show suggestions
   - Click outside the dropdown
   - **Expected:** Dropdown closes
   - Type name again
   - Press ESC key
   - **Expected:** Dropdown closes (if implemented)

### ✅ Pass Criteria:

- [ ] Only one name field visible (unified design)
- [ ] Autocomplete works as typing
- [ ] Can select from suggestions
- [ ] Can type manually if no match
- [ ] Dropdown closes when clicking outside
- [ ] No confusion about which field to use
- [ ] Clean, professional appearance

---

## Test Scenario 3: Edge Cases

### Test Empty Invitation List:

1. Start fresh (no invitation guests uploaded)
2. Open Add Guest modal
3. Type any name
4. **Expected:** Dropdown shows "មិនមានលទ្ធផល" (No results)
5. **Expected:** Can still save as manual entry

### Test Rapid Typing:

1. Type very quickly: "JohnDoeTest"
2. **Expected:** Only one search fires after typing stops (debounced)
3. **Expected:** No performance lag

### Test Form Reset:

1. Select guest from invitation
2. Save successfully
3. **Expected:** Form clears completely
4. **Expected:** Name field is empty
5. **Expected:** Hidden invitation_guest_id is cleared
6. **Expected:** Suggestions dropdown is cleared

### Test Multiple Adds:

1. Add guest from invitation (status should change to "imported")
2. Try to add the same guest again
3. **Expected:** Still appears in autocomplete
4. **Expected:** Can add multiple times if needed (duplicate handling in guests table)

### ✅ Pass Criteria:

- [ ] Empty invitation list handled gracefully
- [ ] Rapid typing doesn't cause issues
- [ ] Form clears properly after save
- [ ] Debouncing prevents excessive searches
- [ ] No JavaScript errors in console

---

## Test Scenario 4: Data Integrity

### Verify Database Updates:

1. Add 3 guests from invitation list
2. Check invitation guests management modal
3. **Expected:** All 3 show "បានបញ្ចូល" status
4. Check main guest table
5. **Expected:** All 3 guests appear in registry
6. Verify phone numbers match
7. Verify names match

### Verify Hidden Field:

1. Open browser DevTools (F12)
2. Go to Elements/Inspector tab
3. Find `<input type="hidden" id="selectedInvitationGuestId">`
4. Select guest from autocomplete
5. **Expected:** Hidden field gets the invitation guest ID
6. Save guest
7. Check hidden field value
8. **Expected:** Field is empty (cleared after save)

### ✅ Pass Criteria:

- [ ] Database updates correctly
- [ ] Status syncs properly
- [ ] No orphaned records
- [ ] Hidden field populates and clears correctly
- [ ] Foreign key relationships maintained

---

## Console Logging (for debugging)

Expected console logs when adding guest from invitation:

```javascript
// When selecting from autocomplete
"Marked invitation guest as imported: 123";

// If any errors occur
"Error marking invitation guest: [error details]";
```

**To view:**

1. Press F12 to open DevTools
2. Go to Console tab
3. Add guest from invitation
4. Look for the log messages

---

## Known Behavior

### Normal Behavior:

- 300ms delay before search fires (debouncing)
- Suggestions only show when there's matching data
- Manual entries don't trigger status updates (correct)
- Autocomplete closes when clicking outside (correct)

### Expected Messages:

- **Success:** "បន្ថែមមេហ្មានបានជោគជ័យ!"
- **Error:** "Error saving guest: [details]"
- **No Results:** "មិនមានលទ្ធផល"

---

## Troubleshooting

### Issue: Autocomplete not showing

- **Check:** Is there data in invitation_guests table?
- **Check:** Console for JavaScript errors
- **Check:** Network tab for IPC calls

### Issue: Status not updating

- **Check:** Is invitation_guest_id being captured?
- **Check:** Console for "Marked invitation guest" log
- **Check:** IPC handler for mark-invitation-guest-imported

### Issue: Dropdown won't close

- **Check:** Click outside event listener
- **Check:** Z-index CSS conflicts

---

## Success Indicators

✅ **All Working If:**

1. Single name field visible (no separate search)
2. Autocomplete appears as typing
3. Guest info auto-fills from selection
4. Save completes successfully
5. Status changes to "imported" in invitation list
6. Form clears after save
7. No JavaScript errors in console
8. Database shows correct status

---

## Test Report Template

```
Test Date: ___________
Tester: ___________

| Test Scenario | Pass | Fail | Notes |
|--------------|------|------|-------|
| Status Sync | [ ] | [ ] | |
| Unified UX | [ ] | [ ] | |
| Edge Cases | [ ] | [ ] | |
| Data Integrity | [ ] | [ ] | |

Issues Found:
1.
2.
3.

Overall Result: PASS / FAIL
```

---

## Contact for Issues

If you encounter any issues during testing:

1. Check browser console for errors
2. Check terminal for backend errors
3. Verify database.db file is not locked
4. Restart application and try again

**Implementation Status:** ✅ Ready for Testing
