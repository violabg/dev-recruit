/**
 * Cloudflare R2 Storage Service
 *
 * Handles file uploads to Cloudflare R2 for resume storage.
 * Uses S3-compatible API with presigned URLs for secure uploads.
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional: custom domain for public access

// R2 endpoint for S3-compatible API
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * Generate HMAC-SHA256 signature for AWS Signature V4
 */
async function hmacSha256(
  key: ArrayBuffer | string,
  message: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

/**
 * Generate SHA-256 hash
 */
async function sha256(message: string | ArrayBuffer): Promise<string> {
  const data =
    typeof message === "string" ? new TextEncoder().encode(message) : message;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate AWS Signature V4 signing key
 */
async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

/**
 * Sign a request using AWS Signature V4
 */
async function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  payload: ArrayBuffer | string
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";

  // Calculate payload hash
  const payloadHash = await sha256(payload);

  // Add required headers
  const signedHeaders: Record<string, string> = {
    ...headers,
    host: url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };

  // Create canonical request
  const sortedHeaderKeys = Object.keys(signedHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((key) => `${key.toLowerCase()}:${signedHeaders[key].trim()}`)
    .join("\n");
  const signedHeadersList = sortedHeaderKeys
    .map((key) => key.toLowerCase())
    .join(";");

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.slice(1), // Remove leading '?'
    canonicalHeaders + "\n",
    signedHeadersList,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  // Calculate signature
  const signingKey = await getSigningKey(
    R2_SECRET_ACCESS_KEY,
    dateStamp,
    region,
    service
  );
  const signature = bufferToHex(await hmacSha256(signingKey, stringToSign));

  // Create authorization header
  const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  return {
    ...signedHeaders,
    authorization: authHeader,
  };
}

/**
 * Generate a unique filename for the resume
 */
function generateResumeKey(
  candidateId: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const ext = originalFilename.split(".").pop() || "pdf";
  const sanitizedExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `resumes/${candidateId}/${timestamp}.${sanitizedExt}`;
}

/**
 * Extract the file key from a resume URL
 */
export function extractKeyFromResumeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Handle both R2 public URL and custom domain
    const pathname = urlObj.pathname;
    // Remove leading slash
    return pathname.startsWith("/") ? pathname.slice(1) : pathname;
  } catch {
    return null;
  }
}

/**
 * Upload a file to Cloudflare R2
 *
 * @param file - The file to upload
 * @param candidateId - The candidate ID for organizing files
 * @returns The public URL of the uploaded file
 */
export async function uploadResumeToR2(
  file: File,
  candidateId: string
): Promise<string> {
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME
  ) {
    throw new Error(
      "R2 storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables."
    );
  }

  const key = generateResumeKey(candidateId, file.name);
  const url = new URL(`/${R2_BUCKET_NAME}/${key}`, R2_ENDPOINT);

  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Sign the request
  const headers = await signRequest(
    "PUT",
    url,
    {
      "content-type": file.type || "application/octet-stream",
      "content-length": file.size.toString(),
    },
    fileBuffer
  );

  // Upload to R2
  const response = await fetch(url.toString(), {
    method: "PUT",
    headers,
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("R2 upload error:", errorText);
    throw new Error(
      `Failed to upload file to R2: ${response.status} ${response.statusText}`
    );
  }

  // Return the public URL
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }

  // Fallback to R2.dev public URL (requires public bucket)
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`;
}

/**
 * Delete a file from Cloudflare R2
 *
 * @param key - The file key to delete
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME
  ) {
    console.warn("R2 storage is not configured. Skipping file deletion.");
    return;
  }

  const url = new URL(`/${R2_BUCKET_NAME}/${key}`, R2_ENDPOINT);

  // Sign the request
  const headers = await signRequest("DELETE", url, {}, "");

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers,
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    console.error("R2 delete error:", errorText);
    throw new Error(
      `Failed to delete file from R2: ${response.status} ${response.statusText}`
    );
  }
}

/**
 * Delete a resume by its URL
 *
 * @param resumeUrl - The resume URL to delete
 */
export async function deleteResumeFromR2(resumeUrl: string): Promise<void> {
  const key = extractKeyFromResumeUrl(resumeUrl);
  if (key) {
    await deleteFileFromR2(key);
  }
}

/**
 * Validate that a file is an acceptable resume format
 */
export function validateResumeFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "Il file è troppo grande. Dimensione massima: 10MB",
    };
  }

  const fileExtension = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  const isValidType =
    ALLOWED_TYPES.includes(file.type) ||
    ALLOWED_EXTENSIONS.includes(fileExtension);

  if (!isValidType) {
    return {
      valid: false,
      error: "Formato file non supportato. Usa PDF, DOC o DOCX",
    };
  }

  return { valid: true };
}
