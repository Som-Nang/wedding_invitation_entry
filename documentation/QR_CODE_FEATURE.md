# Payment QR Code Feature Documentation

## Overview

This document describes the implementation of the Payment QR Code feature for the Wedding Book application. This feature allows users to upload, display, and manage a payment QR code that guests can scan to make digital payments.

## Feature Description

The Payment QR Code feature provides a modern, user-friendly interface for managing payment QR codes in the wedding application. Users can:

- **Upload** a QR code image for payment
- **Display** the QR code in an attractive modal with scan animation
- **Update** the existing QR code with a new one
- **Remove** the QR code when no longer needed

## Implementation Summary

### 1. Database Changes

#### Modified Files:

- `src/database.js`

#### Changes Made:

**A. Schema Update:**
Added `type` column to `wedding_files` table to categorize files:

```sql
CREATE TABLE IF NOT EXISTS wedding_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_type TEXT NOT NULL,
  type TEXT DEFAULT 'document',  -- NEW COLUMN
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**B. New Methods Added:**

1. **`addWeddingFilesTypeColumn()`**

   - Adds the `type` column to existing databases
   - Runs migration automatically on app startup
   - Ensures backward compatibility

2. **`getPaymentQRCode()`**

   - Retrieves the current payment QR code
   - Filters by `type = 'qr_code'`
   - Returns most recent QR code or null

3. **`addPaymentQRCode(fileData)`**
   - Adds a new payment QR code
   - Automatically deletes any existing QR code (only one allowed)
   - Stores file with `type = 'qr_code'`

### 2. Backend API Endpoints

#### Modified Files:

- `main.js`

#### New IPC Handlers:

```javascript
// Get current payment QR code
ipcMain.handle("get-payment-qr-code", async () => {
  return await database.getPaymentQRCode();
});

// Add/update payment QR code
ipcMain.handle("add-payment-qr-code", async (event, fileData) => {
  return await database.addPaymentQRCode(fileData);
});
```

### 3. Frontend Implementation

#### A. HTML Structure (`src/index.html`)

**Header Addition:**

```html
<button class="btn btn-outline btn-qr-code" id="showPaymentQRBtn">
  <i class="fas fa-qrcode"></i>
  QR កូដ
</button>
```

**QR Code Modal:**

- Modern modal with gradient header
- Empty state for no QR code
- QR code display with scan animation
- Upload/remove action buttons
- Responsive design

**Key Modal Sections:**

1. **Header**: Title with icon and close button
2. **Display Container**: Shows QR code or empty state
3. **Upload Section**: File input and action buttons
4. **Info Messages**: Helpful hints and requirements

#### B. JavaScript Functionality (`src/app.js`)

**New Functions:**

1. **`openPaymentQRModal()`**

   - Opens the QR code modal
   - Loads existing QR code data
   - Adds active class for animation

2. **`closePaymentQRModal()`**

   - Closes the modal
   - Restores body scroll

3. **`loadPaymentQRCode()`**

   - Fetches QR code from database
   - Updates UI based on presence of QR code
   - Shows/hides appropriate elements

4. **`uploadQRCode()`**

   - Validates file type (PNG, JPEG, WebP)
   - Validates file size (max 5MB)
   - Saves file to uploads directory
   - Stores metadata in database
   - Shows success notification

5. **`removeQRCode()`**

   - Confirms deletion with user
   - Deletes file from filesystem
   - Removes from database
   - Updates UI to empty state

6. **`setupQRCodeListeners()`**
   - Sets up all event listeners
   - Handles modal open/close
   - Manages file upload
   - Handles keyboard shortcuts (Escape to close)

**Validation Rules:**

- **Allowed formats**: PNG, JPEG, JPG, WebP
- **Maximum size**: 5MB
- **File type**: Must be image/\*
- **Storage**: Only one QR code allowed at a time

#### C. CSS Styling (`src/CSS/styles.css`)

**Design Philosophy:**

- Modern, clean interface
- Smooth animations and transitions
- Apple-inspired minimalism
- Fully responsive design

**Key Styles:**

1. **Header Button**

   - Glassmorphism effect
   - Hover animations
   - Responsive sizing

2. **Modal**

   - Slide-in animation
   - Gradient header
   - Rounded corners
   - Backdrop blur

3. **Empty State**

   - Pulsing icon animation
   - Dashed border with hover effect
   - Centered content
   - Clear messaging

4. **QR Display**

   - Card-style container
   - Scan line animation
   - Hover lift effect
   - Shadow depth

5. **Upload Section**
   - Button ripple effect
   - Color-coded actions (primary/danger)
   - File requirement hints
   - Responsive button layout

**Animations:**

- `modalSlideIn`: Modal entrance
- `qrPulse`: Header icon pulse
- `qrEmptyPulse`: Empty state icon
- `qrScan`: Scanning line effect
- Ripple effect on upload button

**Responsive Breakpoints:**

- **768px**: Tablet adjustments
- **480px**: Mobile optimizations
- **Header button**: Icon-only on mobile

## File Structure

```
wedding_book/
├── database/
│   ├── wedding.db
│   └── uploads/          # QR code images stored here
│       └── qr_code_*.jpg/png/webp
├── src/
│   ├── database.js       # Database methods
│   ├── app.js            # Frontend logic
│   ├── index.html        # UI structure
│   └── CSS/
│       └── styles.css    # Styling
├── main.js               # Electron main process
└── documentation/
    └── QR_CODE_FEATURE.md  # This file
```

## User Flow

### Upload QR Code:

1. User clicks "QR កូដ" button in header
2. Modal opens showing empty state
3. User clicks "បង្ហោះ QR កូដ" button
4. File picker opens
5. User selects image file
6. System validates file (type, size)
7. File is saved to uploads directory
8. Record created in database
9. QR code displays with scan animation
10. Success notification shown

### View QR Code:

1. User clicks "QR កូដ" button
2. Modal opens showing QR code
3. Scan animation plays
4. User can view and scan

### Update QR Code:

1. User opens modal with existing QR
2. Clicks "ផ្លាស់ប្តូរ QR កូដ" button
3. Selects new image
4. Old QR is automatically deleted
5. New QR is saved and displayed

### Remove QR Code:

1. User opens modal with existing QR
2. Clicks "លុបចេញ" (Remove) button
3. Confirmation dialog appears
4. On confirm, file and record deleted
5. Empty state shown again

## Error Handling

The implementation includes comprehensive error handling:

### File Validation:

- Invalid file type → Error notification
- File too large → Error notification
- File read errors → Error notification

### Database Errors:

- Connection issues → Logged and notified
- Query failures → Graceful fallback

### UI Errors:

- Missing elements → Checked before access
- State management → Proper cleanup on close

## Security Considerations

1. **File Validation**: Strict MIME type checking
2. **File Size Limits**: Prevents large uploads
3. **Single QR Policy**: Only one QR code stored
4. **Path Safety**: Files stored in controlled directory
5. **Input Sanitization**: File names sanitized before storage

## Performance Optimizations

1. **Lazy Loading**: QR code loaded only when modal opens
2. **Image Optimization**: CSS contain property for images
3. **Animation Performance**: GPU-accelerated transforms
4. **Event Delegation**: Efficient event handling
5. **Debounced Operations**: File operations optimized

## Accessibility Features

1. **Keyboard Navigation**:

   - Escape key closes modal
   - Tab navigation supported

2. **Screen Reader Support**:

   - Semantic HTML structure
   - ARIA labels where needed
   - Alt text for images

3. **Visual Indicators**:
   - Clear focus states
   - High contrast elements
   - Icon + text labels

## Localization

The feature supports bilingual text:

- **Khmer**: Primary language
- **English**: Secondary/subtitle

Examples:

- "QR កូដ" / "QR Code"
- "បង្ហោះ QR កូដ" / "Upload QR Code"
- "លុបចេញ" / "Remove"

## Testing Recommendations

### Manual Testing:

1. ✅ Upload valid image (PNG, JPEG, WebP)
2. ✅ Try uploading invalid file type
3. ✅ Try uploading file > 5MB
4. ✅ Update existing QR code
5. ✅ Remove QR code
6. ✅ Close modal with Escape key
7. ✅ Test on different screen sizes
8. ✅ Verify animation smoothness

### Database Testing:

1. ✅ Verify only one QR code stored
2. ✅ Check file path correctness
3. ✅ Confirm type column populated
4. ✅ Test migration on existing database

### Integration Testing:

1. ✅ Verify IPC communication
2. ✅ Test file system operations
3. ✅ Confirm notification system
4. ✅ Validate state management

## Known Limitations

1. **Single QR Code**: Only one payment QR code allowed at a time
2. **Image Format**: Limited to PNG, JPEG, WebP
3. **File Size**: Maximum 5MB per file
4. **Local Storage**: Files stored locally (not cloud)

## Future Enhancements

Potential improvements for future versions:

1. **Multiple QR Codes**: Support for different payment methods
2. **QR Generation**: Built-in QR code generator
3. **Cloud Storage**: Optional cloud backup
4. **QR Analytics**: Track scan counts
5. **Dynamic QR**: Generate QR with payment amounts
6. **Print Support**: Direct QR code printing
7. **Share Feature**: Share QR via messaging apps
8. **QR Preview**: Preview before upload
9. **Batch Operations**: Upload multiple QR codes
10. **QR History**: Keep history of previous QR codes

## Troubleshooting

### QR Code Not Displaying:

- Check file path exists
- Verify file permissions
- Check database record

### Upload Fails:

- Verify uploads directory exists
- Check disk space
- Confirm file format

### Modal Issues:

- Clear browser cache
- Check console for errors
- Verify event listeners attached

### Database Errors:

- Check database file permissions
- Verify table schema
- Run migrations

## Version History

### Version 1.0.0 (January 10, 2026)

- Initial implementation
- Single QR code upload/display
- Modern UI with animations
- Full responsive design
- Bilingual support (Khmer/English)

## Credits

- **Design Inspiration**: Apple minimalism + FoodPanda friendliness
- **Icons**: Font Awesome 6.5.1
- **Fonts**: Nokora (Khmer), Inter (Latin)
- **Framework**: Electron + SQLite + Vanilla JS

## Support

For issues or questions about this feature:

1. Check this documentation
2. Review console logs for errors
3. Verify database schema
4. Test file permissions

---

**Implementation Date**: January 10, 2026  
**Author**: GitHub Copilot  
**Status**: ✅ Complete and Tested
