/**
 * Request validation and sanitization middleware
 * Provides input sanitization and validation for API requests
 */

import DOMPurify from "isomorphic-dompurify";
import { NextRequest, NextResponse } from "next/server";

/**
 * Maximum request body size in bytes
 */
const MAX_BODY_SIZE = 1048576; // 1MB default

/**
 * Content types that should be validated
 */
const VALIDATED_CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
  "text/plain",
];

/**
 * Sanitize a string value
 * Removes potentially dangerous HTML/JS content
 */
export function sanitizeString(value: string): string {
  // Configure DOMPurify for strict sanitization
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Recursively sanitize an object or array
 */
export function sanitizeInput(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (typeof data === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitize the key as well to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey && !sanitizedKey.includes("__proto__") && !sanitizedKey.includes("constructor")) {
        sanitized[sanitizedKey] = sanitizeInput(value);
      }
    }
    return sanitized;
  }

  // Return numbers, booleans, etc. as-is
  return data;
}

/**
 * Validate request headers for security
 */
export function validateHeaders(headers: Headers): {
  valid: boolean;
  error?: string;
} {
  // Check Content-Length header
  const contentLength = headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength);
    if (isNaN(size)) {
      return { valid: false, error: "Invalid Content-Length header" };
    }
    if (size > MAX_BODY_SIZE) {
      return {
        valid: false,
        error: `Request body too large: ${size} bytes (max: ${MAX_BODY_SIZE} bytes)`,
      };
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = [
    "x-forwarded-host", // Can be used for host header injection
    "x-original-url", // Can be used for URL confusion
    "x-rewrite-url", // Can be used for URL confusion
  ];

  for (const header of suspiciousHeaders) {
    if (headers.has(header)) {
      console.warn(`Suspicious header detected: ${header}`);
    }
  }

  return { valid: true };
}

/**
 * Validate JSON structure and depth
 */
export function validateJSON(data: any, maxDepth: number = 10): {
  valid: boolean;
  error?: string;
} {
  function checkDepth(obj: any, currentDepth: number = 0): boolean {
    if (currentDepth > maxDepth) {
      return false;
    }

    if (typeof obj === "object" && obj !== null) {
      for (const value of Object.values(obj)) {
        if (!checkDepth(value, currentDepth + 1)) {
          return false;
        }
      }
    }

    return true;
  }

  if (!checkDepth(data)) {
    return {
      valid: false,
      error: `JSON structure too deep (max depth: ${maxDepth})`,
    };
  }

  return { valid: true };
}

/**
 * Request validation middleware
 * Validates and sanitizes incoming requests
 */
export async function validationMiddleware(
  req: NextRequest
): Promise<NextResponse | null> {
  // Skip validation for GET requests and static assets
  if (
    req.method === "GET" ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|map)$/)
  ) {
    return null;
  }

  // Validate headers
  const headerValidation = validateHeaders(req.headers);
  if (!headerValidation.valid) {
    return NextResponse.json(
      { error: headerValidation.error },
      { status: 400 }
    );
  }

  // Check content type
  const contentType = req.headers.get("content-type");
  if (contentType) {
    const isValidContentType = VALIDATED_CONTENT_TYPES.some((type) =>
      contentType.toLowerCase().includes(type)
    );

    if (!isValidContentType && req.method !== "OPTIONS") {
      console.warn(`Unexpected content type: ${contentType}`);
    }
  }

  return null;
}

/**
 * Sanitize API response data
 * Ensures no sensitive information is leaked
 */
export function sanitizeResponse(data: any): any {
  // Remove sensitive fields
  const sensitiveFields = [
    "password",
    "passwordHash",
    "apiKey",
    "apiSecret",
    "accessToken",
    "refreshToken",
    "sessionToken",
    "stripeSecretKey",
    "webhookSecret",
    "databaseUrl",
    "CLERK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
  ];

  function removeSensitive(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(removeSensitive);
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some((field) =>
        lowerKey.includes(field.toLowerCase())
      );

      if (!isSensitive) {
        cleaned[key] = removeSensitive(value);
      }
    }

    return cleaned;
  }

  return removeSensitive(data);
}

/**
 * Validate URL parameters
 * Prevents injection attacks via URL params
 */
export function validateURLParams(params: URLSearchParams): {
  valid: boolean;
  error?: string;
  sanitized?: URLSearchParams;
} {
  const sanitized = new URLSearchParams();
  const maxParamLength = 1000;

  let validationError: { valid: false; error: string } | null = null;
  
  params.forEach((value, key) => {
    // Check parameter length
    if (!validationError && (key.length > maxParamLength || value.length > maxParamLength)) {
      validationError = {
        valid: false,
        error: `URL parameter too long: ${key}`,
      };
    }

    // Sanitize key and value
    const sanitizedKey = sanitizeString(key);
    const sanitizedValue = sanitizeString(value);

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i, // Event handlers
      /__proto__/,
      /constructor/,
    ];

    const combinedString = sanitizedKey + sanitizedValue;
    for (const pattern of dangerousPatterns) {
      if (pattern.test(combinedString)) {
        console.warn(`Dangerous pattern detected in URL params: ${pattern}`);
        continue; // Skip this parameter
      }
    }

    sanitized.set(sanitizedKey, sanitizedValue);
  })

  // Return validation error if one was found
  if (validationError) {
    return validationError;
  }

  return { valid: true, sanitized };
}