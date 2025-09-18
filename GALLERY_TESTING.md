# 📸 Coach Gallery Testing Guide

## 🧪 How to Test the Gallery Feature

### Prerequisites
- Development server running (`npm run dev`)
- Authenticated as a coach user
- Database and storage setup completed

### 🎯 Complete Test Flow

#### **Step 1: Upload Photos**
1. Go to `http://localhost:3000/my-profile`
2. Scroll to the "Gallery" section
3. **Test drag & drop:**
   - Drag an image file onto the upload area
   - Should see hover effects and upload progress
4. **Test click to browse:**
   - Click the upload area
   - Select an image file (JPG, PNG, or WebP)
5. **Add captions:**
   - Upload an image with no caption
   - Click "Click to add caption..." to edit
   - Save caption and verify it appears
6. **Test limits:**
   - Upload 5 images total
   - Try to upload a 6th - should show "Max 5 photos reached"
   - Try uploading a large file (>5MB) - should show error
   - Try uploading invalid file type - should show error

#### **Step 2: Reorder Photos**
1. **Drag to reorder:**
   - Hover over a photo - should see drag handle (≡)
   - Drag a photo to a new position
   - Verify position numbers update (1, 2, 3, etc.)
   - Verify new order is saved by refreshing page

#### **Step 3: Edit Captions**
1. **Inline editing:**
   - Click on any caption text
   - Edit the text (up to 500 characters)
   - Press Enter to save or Escape to cancel
   - Verify changes persist after refresh

#### **Step 4: Delete Photos**
1. **Delete with confirmation:**
   - Hover over a photo
   - Click the red delete button
   - Confirm deletion in dialog
   - Verify photo is removed and positions reorder
   - Verify can upload again after deletion

#### **Step 5: Public Profile View**
1. **View public gallery:**
   - Find your coach ID from profile page
   - Go to `http://localhost:3000/coaches/[your-coach-id]`
   - **Verify gallery appears** above bio section
   - **Test hero image:** Should show first photo large
   - **Test thumbnails:** Click thumbnails to change hero image
   - **Test lightbox:** Click hero image to open fullscreen
   - **Test navigation:** Use arrow keys or buttons in lightbox
   - **Test captions:** Should display in lightbox
   - **Close lightbox:** Press Escape or click X

### ✅ Success Criteria

**Upload Functionality:**
- ✅ Drag & drop works smoothly
- ✅ File validation prevents invalid uploads
- ✅ Progress indicators show during upload
- ✅ Error messages are clear and helpful
- ✅ Upload area disabled at 5 photos

**Gallery Management:**
- ✅ Photos display in grid with hover effects
- ✅ Position numbers visible (1, 2, 3, etc.)
- ✅ Drag handles appear on hover
- ✅ Reordering works via drag & drop
- ✅ Caption editing works inline
- ✅ Delete buttons work with confirmation

**Public Display:**
- ✅ Gallery section only shows if photos exist
- ✅ Hero image displays prominently
- ✅ Thumbnail navigation works
- ✅ Lightbox opens and closes properly
- ✅ Keyboard navigation works (arrows, escape)
- ✅ Captions display in lightbox
- ✅ Responsive on mobile devices

**UI Polish:**
- ✅ Smooth hover animations
- ✅ Focus rings for accessibility
- ✅ Drop shadows and visual depth
- ✅ Loading states during operations
- ✅ Consistent brand colors (ttOrange, ttBlue)

### 🐛 Common Issues to Check

1. **"Failed to check existing images"** - Database table not created
2. **"Bucket not found"** - Storage bucket not created  
3. **"Authentication required"** - User session expired
4. **Images not loading** - Storage permissions not set
5. **Drag & drop not working** - Browser compatibility
6. **Gallery not showing on public page** - Component not integrated

### 🔧 Quick Fixes

- **Refresh browser** if authentication errors occur
- **Clear browser cache** if old UI persists  
- **Check browser console** for JavaScript errors
- **Verify all SQL ran successfully** in Supabase
- **Check storage bucket exists** in Supabase dashboard

---

## 🎨 UI Features Implemented

### Enhanced Interactivity
- **Hover effects** on all interactive elements
- **Focus rings** for keyboard accessibility  
- **Smooth transitions** (200-300ms duration)
- **Scale effects** on buttons and thumbnails
- **Drop shadows** for visual depth

### Visual Polish
- **Gradient overlays** for better text contrast
- **Backdrop blur** effects on floating elements
- **Color-coded indicators** (orange for position, red for delete)
- **Loading states** with branded spinners
- **Empty states** with helpful messaging

### Accessibility
- **ARIA labels** on all buttons
- **Keyboard navigation** support
- **Focus management** in modals
- **Screen reader friendly** text
- **Color contrast** compliance

### Responsive Design  
- **Mobile-first** grid layouts
- **Touch-friendly** button sizes
- **Responsive images** with proper sizing
- **Adaptive spacing** on different screens