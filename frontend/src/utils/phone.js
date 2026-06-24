/**
 * Format a phone number for WhatsApp link.
 * Handles numbers with or without country code prefix.
 * Strips all non-digit characters and ensures +91 prefix for Indian numbers.
 */
export function formatWhatsAppUrl(phone) {
  if (!phone) return '#';
  const digits = phone.replace(/\D/g, '');
  // If number starts with 91 and is 12 digits, it already has country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return `https://wa.me/${digits}`;
  }
  // If number is 10 digits, prepend 91 (India)
  if (digits.length === 10) {
    return `https://wa.me/91${digits}`;
  }
  // If number already has + or 00 prefix stripped, use as-is
  if (digits.length > 10) {
    return `https://wa.me/${digits}`;
  }
  // Fallback: just use the digits
  return `https://wa.me/${digits}`;
}