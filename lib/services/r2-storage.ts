/**
 * Cloudflare R2 Storage Service
 *
 * Handles file uploads to Cloudflare R2 for resume storage.
 * Uses AWS SDK S3 client for S3-compatible API.
 */

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional: custom domain for public access

/**
 * Create S3 client configured for Cloudflare R2
 */
function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    // Use path-style addressing instead of virtual-hosted-style
    forcePathStyle: true,
  });
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
    // Remove leading slash and bucket name if present
    let key = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    // If the URL includes the bucket name, remove it
    if (key.startsWith(`${R2_BUCKET_NAME}/`)) {
      key = key.slice(R2_BUCKET_NAME.length + 1);
    }
    return key;
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

  const client = getR2Client();
  const key = generateResumeKey(candidateId, file.name);

  // Read file as ArrayBuffer then convert to Uint8Array
  const fileBuffer = await file.arrayBuffer();
  const fileBody = new Uint8Array(fileBuffer);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBody,
    ContentType: file.type || "application/octet-stream",
    ContentLength: file.size,
  });

  try {
    await client.send(command);
  } catch (error) {
    console.error("R2 upload error:", error);
    throw new Error(
      `Failed to upload file to R2: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
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

  const client = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  try {
    await client.send(command);
  } catch (error) {
    // Ignore 404 errors (file already deleted)
    if (error instanceof Error && error.name !== "NoSuchKey") {
      console.error("R2 delete error:", error);
      throw new Error(
        `Failed to delete file from R2: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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
