# Coach Gallery API Documentation

This document describes the API endpoints for managing coach gallery images.

## Overview

The Coach Gallery API allows coaches to:
- Upload up to 5 images to their gallery
- Delete images from their gallery  
- Reorder images in their gallery
- View gallery images (public or own)

## Authentication

All endpoints except GET (for public viewing) require authentication. Users must be authenticated coaches to manage gallery images.

## Endpoints

### Upload Gallery Image

**POST** `/api/coach-gallery/upload`

Uploads a new image to the authenticated coach's gallery.

**Request:**
- Content-Type: `multipart/form-data`
- Authentication: Required (Coach only)

**Form Data:**
```
file: File (required) - Image file (JPG, PNG, WebP, max 5MB)
caption: string (optional) - Image caption (max 500 characters)
```

**Response:**
```json
{
  "success": true,
  "image": {
    "id": "uuid",
    "coach_id": "uuid", 
    "image_url": "https://...",
    "caption": "string or null",
    "position": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Gallery image uploaded successfully"
}
```

**Error Responses:**
- `400` - Invalid file type, size, or max images reached
- `401` - Authentication required
- `403` - User is not a coach
- `500` - Upload failed

---

### Delete Gallery Image

**DELETE** `/api/coach-gallery/[id]/delete`

Deletes a specific image from the authenticated coach's gallery.

**Request:**
- Authentication: Required (Coach only)
- URL Parameter: `id` - UUID of the image to delete

**Response:**
```json
{
  "success": true,
  "message": "Gallery image deleted successfully"
}
```

**Error Responses:**
- `400` - Invalid image ID format
- `401` - Authentication required
- `403` - User is not a coach or doesn't own the image
- `404` - Image not found
- `500` - Deletion failed

---

### Reorder Gallery Images

**PUT** `/api/coach-gallery/reorder`

Reorders images in the authenticated coach's gallery.

**Request:**
- Content-Type: `application/json`
- Authentication: Required (Coach only)

**Body:**
```json
{
  "orderedIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid1",
      "coach_id": "uuid",
      "image_url": "https://...",
      "caption": "string or null", 
      "position": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Gallery reordered successfully"
}
```

**Error Responses:**
- `400` - Invalid request data or image IDs
- `401` - Authentication required
- `403` - User is not a coach or doesn't own all images
- `500` - Reorder failed

---

### Get Gallery Images

**GET** `/api/coach-gallery?coachId=uuid`

Retrieves gallery images for a specific coach (public) or current authenticated coach.

**Request:**
- Query Parameter: `coachId` (optional) - UUID of coach whose gallery to view
- Authentication: Required only if `coachId` is not provided

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid",
      "coach_id": "uuid",
      "image_url": "https://...",
      "caption": "string or null",
      "position": 0,
      "created_at": "2024-01-01T00:00:00Z", 
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

**Error Responses:**
- `400` - Invalid coach ID format
- `401` - Authentication required (when coachId not provided)
- `403` - User is not a coach (when coachId not provided)
- `500` - Fetch failed

## Validation Rules

### File Upload
- **File Size:** Maximum 5MB
- **File Types:** JPG, JPEG, PNG, WebP only
- **Gallery Limit:** Maximum 5 images per coach
- **Caption:** Maximum 500 characters (optional)

### Image Management
- **Ownership:** Coaches can only manage their own gallery images
- **Ordering:** Images are ordered by position (0-4)
- **Auto-reorder:** When images are deleted, remaining images are automatically reordered

## Storage

Images are stored in Supabase Storage in the `coach-gallery` bucket with the following structure:
```
coach-gallery/
  {coach_id}/
    {uuid}.{extension}
```

## Row Level Security (RLS)

The `coach_gallery` table has RLS policies:
- **SELECT:** Public (anyone can view)
- **INSERT/UPDATE/DELETE:** Coach owners only

## Error Handling

All endpoints follow consistent error response format:
```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

Common error messages:
- `"Max 5 photos allowed"` - Gallery limit reached
- `"File size must be less than 5MB"` - File too large
- `"File type must be JPG, PNG, or WebP"` - Invalid file type
- `"Authentication required"` - User not authenticated
- `"Only coaches can manage gallery images"` - User not a coach
- `"You can only manage your own gallery images"` - Ownership violation

## Usage Examples

### Upload with JavaScript
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('caption', 'My coaching setup');

const response = await fetch('/api/coach-gallery/upload', {
  method: 'POST',
  body: formData
});
```

### Reorder with JavaScript
```javascript
const response = await fetch('/api/coach-gallery/reorder', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderedIds: ['id1', 'id2', 'id3']
  })
});
```