import { writeFile, mkdir } from 'fs/promises'
import { createReadStream, existsSync } from 'fs'
import { join } from 'path'
import type { Readable } from 'stream'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

/**
 * Save a file to the configured storage backend.
 * Returns the URL path to access the file.
 *
 * When R2_BUCKET is set, files go to Cloudflare R2.
 * Otherwise, files are saved to the local disk.
 */
export async function saveFile(fileName: string, buffer: Buffer): Promise<string> {
  if (process.env.R2_BUCKET) {
    return saveToR2(fileName, buffer)
  }
  return saveToDisk(fileName, buffer)
}

/**
 * Get a readable stream for a stored file.
 * Returns null if the file doesn't exist.
 */
export async function getFileStream(fileName: string): Promise<Readable | null> {
  if (process.env.R2_BUCKET) {
    return getFromR2(fileName)
  }
  return getFromDisk(fileName)
}

// ── Disk storage (development / Railway MVP) ──────────────────

async function saveToDisk(fileName: string, buffer: Buffer): Promise<string> {
  await mkdir(UPLOADS_DIR, { recursive: true })
  await writeFile(join(UPLOADS_DIR, fileName), buffer)
  return `/documentos/${fileName}`
}

function getFromDisk(fileName: string): Readable | null {
  const filePath = join(UPLOADS_DIR, fileName)
  if (!existsSync(filePath)) return null
  return createReadStream(filePath)
}

// ── R2 storage (production at scale) ──────────────────────────
// To enable: set R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY in environment variables, then
// npm install @aws-sdk/client-s3

async function saveToR2(fileName: string, buffer: Buffer): Promise<string> {
  // Lazy import to avoid requiring the dependency when not using R2
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — @aws-sdk/client-s3 is an optional dependency, installed only when R2 is enabled
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: fileName,
    Body: buffer,
  }))

  return `/documentos/${fileName}`
}

async function getFromR2(fileName: string): Promise<Readable | null> {
  // @ts-ignore — optional dependency
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: fileName,
    }))
    return response.Body as Readable
  } catch {
    return null
  }
}
