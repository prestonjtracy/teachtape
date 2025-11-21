/**
 * Input sanitization helpers for XSS prevention
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML/script content from user input
 * Strips all HTML tags and dangerous content
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitize HTML but allow safe formatting tags (for rich text)
 * Allows basic formatting like bold, italic, lists, links
 */
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeURL(url: string): string | null {
  const sanitized = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // Check for dangerous protocols
  if (sanitized.match(/^(javascript|data|vbscript):/i)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  // Remove any HTML/script tags
  const clean = sanitizeText(email);

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    throw new Error('Invalid email format');
  }

  return clean.toLowerCase().trim();
}
