# QR Code Feature - UI/UX Design Specification

## Design Philosophy

This feature follows a modern, clean design language inspired by:

- **Apple's minimalism**: Clean lines, subtle animations, generous whitespace
- **Material Design**: Elevation through shadows, responsive interactions
- **Khmer-friendly aesthetics**: Bilingual support, culturally appropriate colors

---

## Color Palette

### Primary Colors

```css
--primary-color: #e91e63      /* Pink - Love & celebration */
--primary-light: #f48fb1      /* Light pink - Accents */
--primary-dark: #ad1457       /* Dark pink - Headers */
```

### Semantic Colors

```css
--success-color: #4caf50      /* Green - Success states */
--error-color: #f44336        /* Red - Errors & delete */
--info-color: #2196f3         /* Blue - Information */
--warning-color: #ff9800      /* Orange - Warnings */
```

### Neutral Colors

```css
--bg-primary: #ffffff         /* White - Main backgrounds */
--bg-secondary: #f8fafc       /* Light gray - Sections */
--text-primary: #1a202c       /* Almost black - Main text */
--text-secondary: #4a5568     /* Gray - Secondary text */
--text-muted: #718096         /* Light gray - Hints */
```

---

## Typography

### Fonts

- **Primary (Khmer)**: Nokora (300, 400, 700, 900)
- **Secondary (Latin)**: Inter (300, 400, 500, 600, 700)
- **Icons**: Font Awesome 6.5.1

### Font Sizes

```css
/* Headers */
.qr-modal-header h2: 1.5rem (24px)
.qr-subtitle: 0.9rem (14.4px)
.qr-empty-state h3: 1.5rem (24px)

/* Body Text */
.qr-info: 0.9rem (14.4px)
.qr-upload-hint: 0.85rem (13.6px)

/* Buttons */
.btn-upload-qr: 1rem (16px)
.btn-qr-code: 0.95rem (15.2px)
```

---

## Layout Structure

### Modal Dimensions

```
Desktop:
  Width: 600px (max)
  Height: Auto
  Margin: Auto (centered)
  Border Radius: 16px

Tablet (≤768px):
  Width: 95%
  Margin: 1rem auto

Mobile (≤480px):
  Width: 95%
  Padding: 1rem
```

### Component Spacing

```css
Modal Header Padding: 1.75rem 2rem
Modal Body Padding: 2rem
Upload Section Padding: 1.5rem
Button Gap: 1rem
Icon-Text Gap: 0.5rem - 0.75rem
```

---

## UI Components

### 1. Header Button (QR កូដ)

**Visual Hierarchy:**

```
┌─────────────────────┐
│ [QR Icon] QR កូដ    │  ← Glassmorphism effect
└─────────────────────┘
```

**Specs:**

- Background: `rgba(255, 255, 255, 0.1)` with backdrop blur
- Border: `2px solid rgba(255, 255, 255, 0.4)`
- Padding: `0.75rem 1.25rem`
- Border Radius: `var(--border-radius-lg)` (12px)
- Hover: Slight lift + brightness increase

**States:**

```css
Normal:   opacity: 1, transform: translateY(0)
Hover:    opacity: 1, transform: translateY(-2px)
Active:   opacity: 0.9, transform: translateY(0)
```

---

### 2. Modal Container

**Visual Structure:**

```
╔══════════════════════════════════╗
║ ┌────────────────────────────┐   ║
║ │  [Icon] Title         [X]  │   ║ ← Gradient Header
║ └────────────────────────────┘   ║
║                                   ║
║  ┌─────────────────────────┐     ║
║  │                         │     ║
║  │    [QR Code / Empty]    │     ║ ← Display Area
║  │                         │     ║
║  └─────────────────────────┘     ║
║                                   ║
║  ┌─────────────────────────┐     ║
║  │ [Upload] [Remove]       │     ║ ← Actions
║  └─────────────────────────┘     ║
╚══════════════════════════════════╝
```

**Shadow Hierarchy:**

```css
Modal Backdrop: rgba(0, 0, 0, 0.5)
Modal Content: 0 20px 60px rgba(0, 0, 0, 0.3)
QR Card: 0 10px 40px rgba(0, 0, 0, 0.1)
Buttons: 0 4px 12px rgba(0, 0, 0, 0.15)
```

---

### 3. Modal Header

**Layout:**

```
┌──────────────────────────────────────┐
│ [🔳] ប្រព័ន្ធកត់ចំណងដៃ        [✕]  │
│      Payment QR Code                 │
└──────────────────────────────────────┘
```

**Gradient:**

```css
background: linear-gradient(
  135deg,
  #e91e63 0%,
  /* Primary color */ #ad1457 100% /* Primary dark */
);
```

**Icon Animation:**

```css
@keyframes qrPulse {
  0%, 100%: scale(1), opacity(1)
  50%: scale(1.05), opacity(0.8)
}
Duration: 2s infinite
```

---

### 4. Empty State

**Visual Design:**

```
        ┌─────────┐
        │         │
        │  [QR]   │  ← Pulsing circle
        │         │
        └─────────┘

    មិនទាន់មាន QR កូដ
    No QR Code Available

  សូមបង្ហោះរូបភាព QR កូដរបស់អ្នក
  ដើម្បីឱ្យភ្ញៀវអាចបង់ប្រាក់តាមរយៈ QR
```

**Specs:**

- Icon Circle: 100px diameter
- Background: `linear-gradient(135deg, #fce7f3, #fce7f3)`
- Border: `2px dashed #e2e8f0`
- Padding: `3rem 2rem`
- Text Alignment: Center

**Animation:**

```css
@keyframes qrEmptyPulse {
  0%: scale(1), box-shadow(0 0 0 0 rgba(233, 30, 99, 0.2))
  50%: scale(1.05), box-shadow(0 0 0 20px rgba(233, 30, 99, 0))
  100%: scale(1), box-shadow(0 0 0 0 rgba(233, 30, 99, 0.2))
}
```

---

### 5. QR Code Display

**Card Layout:**

```
┏━━━━━━━━━━━━━━━━━━━━━━┓
┃  ╔════════════════╗  ┃
┃  ║                ║  ┃
┃  ║   [QR IMAGE]   ║  ┃ ← Image with scan effect
┃  ║                ║  ┃
┃  ╚════════════════╝  ┃
┃                       ┃
┃  [i] ស្កែន QR កូដនេះ  ┃ ← Info banner
┗━━━━━━━━━━━━━━━━━━━━━━┛
```

**Card Specs:**

- Max Width: 350px (desktop), 280px (mobile)
- Background: White
- Padding: 1.5rem
- Border Radius: 12px
- Shadow: Dual layer for depth

**Hover Effect:**

```css
Normal: translateY(0), shadow-standard
Hover:  translateY(-4px), shadow-elevated
Transition: 0.3s ease-in-out
```

---

### 6. Scan Line Animation

**Visual:**

```
┌──────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Scanning line
│                  │
│   [QR Content]   │
│                  │
└──────────────────┘
```

**Implementation:**

```css
Line: 3px height
Gradient: transparent → primary → transparent
Shadow: 0 0 10px primary-color
Animation: 3s infinite ease-in-out
Path: Top to bottom (300px travel)
```

**Keyframes:**

```css
0%:   translateY(0), opacity(0)
10%:  opacity(1)
90%:  opacity(1)
100%: translateY(300px), opacity(0)
```

---

### 7. Upload Section

**Layout:**

```
┌─────────────────────────────────────┐
│  [📤 បង្ហោះ QR កូដ]  [🗑️ លុបចេញ]  │
│                                      │
│  [🖼️] រូបភាពត្រូវតែជា PNG, JPEG...  │
└─────────────────────────────────────┐
```

**Button Styles:**

**Primary (Upload):**

```css
Background: linear-gradient(135deg, #e91e63, #ad1457)
Color: White
Padding: 1rem 1.5rem
Border Radius: 8px
Ripple Effect: On click
```

**Secondary (Remove):**

```css
Background: White
Color: #f44336 (error-color)
Border: 2px solid #f44336
Padding: 1rem 1.25rem
Hover: Background becomes red, text white
```

**Responsive Behavior:**

```
Desktop:  Side-by-side (flexbox row)
Mobile:   Stacked (flexbox column)
```

---

### 8. Info Banner

**Design:**

```
┌─────────────────────────────────┐
│ [i] ស្កែន QR កូដនេះដើម្បីបង់ប្រាក់ │
└─────────────────────────────────┘
```

**Specs:**

- Background: `linear-gradient(135deg, #e3f2fd, #f3e5f5)`
- Padding: `0.75rem 1.25rem`
- Border Radius: 12px
- Icon Color: `#2196f3` (info-color)
- Text: Medium weight, secondary color

---

### 9. Upload Hint

**Design:**

```
┌──────────────────────────────────────────┐
│ [🖼️] រូបភាពត្រូវតែជា PNG, JPEG ឬ WebP   │
│      (ទំហំអតិបរមា: 5MB)                  │
└──────────────────────────────────────────┘
```

**Specs:**

- Background: `#f8fafc`
- Border Left: `3px solid #2196f3`
- Padding: `0.75rem 1rem`
- Font Size: 0.85rem
- Color: Muted text

---

## Interaction States

### Button States

**Upload Button:**

```
State     | Background          | Transform        | Shadow
----------|--------------------|--------------------|-------------
Normal    | gradient-primary   | scale(1)          | shadow-sm
Hover     | gradient-bright    | scale(1)          | shadow-md
Active    | gradient-dark      | scale(0.98)       | shadow-sm
Disabled  | gray               | scale(1)          | none
```

**Remove Button:**

```
State     | Background | Color  | Border        | Transform
----------|-----------|---------|---------------|-------------
Normal    | white     | red     | 2px red       | scale(1)
Hover     | red       | white   | 2px red       | translateY(-2px)
Active    | dark-red  | white   | 2px dark-red  | scale(0.98)
```

### Modal States

**Opening:**

```
Duration: 0.4s
Easing: cubic-bezier(0.34, 1.56, 0.64, 1)
From: opacity(0), scale(0.9), translateY(-20px)
To:   opacity(1), scale(1), translateY(0)
```

**Closing:**

```
Duration: 0.3s
Easing: ease-out
From: opacity(1), scale(1)
To:   opacity(0), scale(0.95)
```

---

## Responsive Breakpoints

### Desktop (> 768px)

- Modal: 600px width, centered
- QR Image: 350px max
- Buttons: Side-by-side
- Font sizes: Standard

### Tablet (≤ 768px)

- Modal: 95% width
- QR Image: 280px max
- Buttons: Side-by-side
- Font sizes: Slightly reduced

### Mobile (≤ 480px)

- Modal: 95% width, 1rem margin
- QR Image: 280px max
- Buttons: Stacked (full width)
- Header button: Icon only
- Font sizes: Optimized for mobile

---

## Accessibility Features

### Focus Indicators

```css
*:focus {
  outline: 2px solid #2196f3;
  outline-offset: 2px;
}

Button:focus {
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
}
```

### High Contrast Mode

- All text: Minimum 4.5:1 contrast ratio
- Icons: Paired with text labels
- Borders: Visible in all modes

### Keyboard Navigation

- Tab order: Logical flow
- Escape: Closes modal
- Enter: Activates buttons
- Space: Activates buttons

---

## Animation Timeline

### Modal Open Sequence

```
0ms:    Backdrop fade in starts
200ms:  Modal slide-in starts
400ms:  Content fade-in complete
600ms:  Icon pulse animation starts
```

### Upload Sequence

```
0ms:    Button click (ripple effect)
100ms:  File picker opens
[User selects file]
0ms:    Loading overlay appears
500ms:  File processing
1000ms: Image displays
1200ms: Scan animation starts
1400ms: Success notification
```

### Remove Sequence

```
0ms:    Confirmation dialog
[User confirms]
0ms:    Loading overlay
300ms:  Fade out QR display
500ms:  Show empty state
700ms:  Success notification
```

---

## Brand Guidelines

### Do's ✅

- Use pink gradient for primary actions
- Maintain generous whitespace
- Keep animations smooth (60fps)
- Use bilingual text (Khmer + English)
- Provide visual feedback for all actions
- Keep UI clean and uncluttered

### Don'ts ❌

- Don't use harsh colors
- Don't make animations too fast
- Don't clutter with unnecessary elements
- Don't use English-only text
- Don't skip loading states
- Don't use tiny touch targets

---

## Performance Targets

### Rendering

- First Paint: < 100ms
- Time to Interactive: < 300ms
- Animation FPS: 60fps constant
- No layout shifts (CLS = 0)

### Assets

- Icon fonts: Loaded async
- Images: Lazy loaded
- CSS: Critical path optimized
- JS: Event listeners efficient

---

## Browser Compatibility

### Tested On

- ✅ Electron (Chromium-based) - Primary target
- ✅ Modern browsers (Chrome, Firefox, Safari)
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, Fedora)

### CSS Features Used

- Flexbox: Full support
- Grid: Not used (better Flexbox support)
- CSS Variables: Full support
- Transforms: Full support
- Animations: Full support
- Backdrop Filter: Full support (Chromium)

---

## Design Tokens

### Spacing Scale

```css
--space-xs: 0.25rem   (4px)
--space-sm: 0.5rem    (8px)
--space-md: 1rem      (16px)
--space-lg: 1.5rem    (24px)
--space-xl: 2rem      (32px)
--space-2xl: 3rem     (48px)
```

### Border Radius Scale

```css
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-full: 9999px (circles)
```

### Shadow Scale

```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.1)
--shadow-md:  0 4px 6px rgba(0,0,0,0.1)
--shadow-lg:  0 10px 15px rgba(0,0,0,0.1)
--shadow-xl:  0 20px 25px rgba(0,0,0,0.1)
```

---

## Future Design Considerations

### Potential Enhancements

1. Dark mode support
2. Theme customization
3. Multiple QR code layouts
4. Print-optimized view
5. QR code preview before upload
6. Drag-and-drop upload
7. Image crop/resize tool
8. QR code templates

---

**Design Version:** 1.0.0  
**Last Updated:** January 10, 2026  
**Design System:** Custom (Wedding Book)  
**Status:** ✅ Implemented & Live
