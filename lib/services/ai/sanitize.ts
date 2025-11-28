/**
 * AI Service Sanitization
 *
 * Input sanitization utilities to prevent prompt injection and ensure safe inputs.
 */

/**
 * Sanitize input to prevent prompt injection attacks
 * Removes dangerous patterns and limits length
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove potential prompt injection patterns
  const dangerous_patterns = [
    /ignore\s+previous\s+instructions/gi,
    /forget\s+everything\s+above/gi,
    /you\s+are\s+now/gi,
    /new\s+instructions/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /user\s*:/gi,
    /<\s*script[^>]*>/gi,
    /javascript\s*:/gi,
    /data\s*:/gi,
  ];

  let sanitized = input;
  dangerous_patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[filtered]");
  });

  // Limit length to prevent token exhaustion
  return sanitized.substring(0, 2000);
}
