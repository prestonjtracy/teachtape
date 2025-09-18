# Commission Settings API - Manual Testing

## API Endpoints Created

### GET /api/admin/commission-settings
Returns current commission settings (admin only)

### POST /api/admin/commission-settings  
Updates commission settings with validation (admin only)

## Manual Testing with curl

**Prerequisites:**
1. Ensure you have an admin user account
2. Get admin auth token (from browser dev tools after login)
3. Server running on localhost:3000

### 1. Test GET Current Settings

```bash
# Replace YOUR_AUTH_TOKEN with actual admin JWT token
curl -X GET "http://localhost:3000/api/admin/commission-settings" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "platform_fee_percentage": 10.0,
    "athlete_service_fee_percent": 0.0,
    "athlete_service_fee_flat_cents": 0
  }
}
```

### 2. Test POST Update Settings (Valid)

```bash
# Update platform commission to 15% and add 2% athlete service fee
curl -X POST "http://localhost:3000/api/admin/commission-settings" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_fee_percentage": 15.0,
    "athlete_service_fee_percent": 2.0
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Commission settings updated successfully",
  "data": {
    "old_values": {
      "platform_fee_percentage": 10.0,
      "athlete_service_fee_percent": 0.0,
      "athlete_service_fee_flat_cents": 0
    },
    "new_values": {
      "platform_fee_percentage": 15.0,
      "athlete_service_fee_percent": 2.0,
      "athlete_service_fee_flat_cents": 0
    }
  }
}
```

### 3. Test POST Update Settings (Flat Fee)

```bash
# Set $1.50 flat athlete service fee
curl -X POST "http://localhost:3000/api/admin/commission-settings" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "athlete_service_fee_flat_cents": 150
  }'
```

### 4. Test Validation - Invalid Values (Should Fail)

```bash
# Try to set platform fee above 30% (should be clamped to 30%)
curl -X POST "http://localhost:3000/api/admin/commission-settings" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_fee_percentage": 35.0
  }'
```

**Expected Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "platform_fee_percentage",
      "message": "Number must be less than or equal to 30"
    }
  ]
}
```

### 5. Test Non-Admin Access (Should Fail)

```bash
# Try without auth token
curl -X GET "http://localhost:3000/api/admin/commission-settings"
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

### 6. Test Empty Body (Should Fail)

```bash
# Try to update with empty body
curl -X POST "http://localhost:3000/api/admin/commission-settings" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "",
      "message": "At least one field must be provided"
    }
  ]
}
```

## Validation Rules

- **platform_fee_percentage**: 0-30 (inclusive)
- **athlete_service_fee_percent**: 0-30 (inclusive)  
- **athlete_service_fee_flat_cents**: 0-2000 (inclusive, integer)
- **At least one field** must be provided in updates
- **Values are automatically clamped** to valid ranges
- **Admin role required** for all operations

## Audit Logging

All updates generate audit log entries with action `commission_settings_updated` containing:
- `old_values`: Settings before update
- `new_values`: Settings after update  
- `updated_fields`: List of fields that were changed
- No IP/User-Agent tracking (as requested)

## Database Fields Used

- **platform_fee_percentage** (existing field, reused)
- **athlete_service_fee_percentage** (new field)
- **athlete_service_fee_flat_cents** (new field)

No duplicate columns were created.