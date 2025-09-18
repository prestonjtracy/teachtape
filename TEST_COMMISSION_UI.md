# Commission Settings UI - Manual Testing Guide

## Prerequisites
1. Run the migration: `009_add_admin_settings_commission.sql`
2. Start the development server: `npm run dev`
3. Have an admin user account

## Testing Steps

### 1. Access Admin Settings Page
- Login as admin user
- Navigate to `/admin/settings`
- Should see "Commission Settings" section at the top with 💰 icon

### 2. Test Initial Load
- Form should populate with current values:
  - Coach platform fee: 10% (default)
  - Athlete service fee: 0% (default)
  - Athlete flat fee: $0.00 (default)

### 3. Test Form Validation (Client-side)
- **Platform fee validation:**
  - Try entering 35% → should clamp to 30%
  - Try entering -5% → should clamp to 0%
- **Athlete service fee validation:**
  - Try entering 40% → should clamp to 30%
  - Try entering negative values → should clamp to 0%
- **Flat fee validation:**
  - Try entering $25.00 → should clamp to $20.00
  - Try entering negative values → should clamp to $0.00

### 4. Test Example Calculation
- Set platform fee to 15%
- Set athlete service fee to 3%
- Set flat fee to $1.50
- Should see example calculation:
  ```
  Base price: $100.00
  Athlete service fee: +$4.50 (3% + $1.50)
  Total charged to athlete: $104.50
  Platform commission: -$15.00
  Coach receives: $85.00
  ```

### 5. Test Save Functionality
- Change platform fee to 12%
- Click "Save Changes"
- Should see:
  - Loading spinner during save
  - Success toast: "Commission settings updated successfully"
  - Form updates with new values
  - Recent changes sidebar shows the update

### 6. Test Error Handling
- Try to save without changes → should show "No changes to save"
- Test network error (disable network) → should show error message

### 7. Test Non-Admin Access
- Logout and login as non-admin user
- Try to access `/admin/settings`
- Should be redirected or see access denied

### 8. Test API Direct Access
```bash
# Get current settings
curl -X GET "http://localhost:3000/api/admin/commission-settings" \
  -H "Cookie: [copy from browser dev tools]"

# Update settings
curl -X POST "http://localhost:3000/api/admin/commission-settings" \
  -H "Cookie: [copy from browser dev tools]" \
  -H "Content-Type: application/json" \
  -d '{"platform_fee_percentage": 15.0}'
```

## Expected UI Features

### Form Fields
- ✅ Coach Platform Fee (%) - Input with % suffix, 0-30 range
- ✅ Athlete Service Fee (%) - Input with % suffix, 0-30 range  
- ✅ Athlete Flat Fee (USD) - Input with $ prefix, $0-$20 range
- ✅ Save button with loading state
- ✅ Example calculation box

### Accessibility
- ✅ Proper labels with `htmlFor` attributes
- ✅ ARIA descriptions with `aria-describedby`
- ✅ Success/error toasts with `aria-live="polite"`
- ✅ Descriptive helper text for each field

### Field Mappings (Exact Names Used)
- `platform_fee_percentage` ← Coach platform fee (%)
- `athlete_service_fee_percent` ← Athlete service fee (%)
- `athlete_service_fee_flat_cents` ← Athlete flat fee (converted from USD to cents)

### Form Behavior
- ✅ Prefills with current values from API
- ✅ Client-side validation and clamping
- ✅ Only sends changed fields to API
- ✅ Success toast with auto-hide after 3 seconds
- ✅ Error messages with clear descriptions
- ✅ Loading states prevent multiple submissions

### Integration
- ✅ Uses existing Admin layout and auth guards
- ✅ Follows repo fetch patterns (useState + fetch)
- ✅ Shows in audit log sidebar
- ✅ Refreshes page data after successful update