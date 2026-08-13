import { AwsClient } from "aws4fetch";
import { randomUUID } from "node:crypto";

/**
 * Almacenamiento de documentos de certificación kosher.
 *
 * Bucket **privado** compatible con S3 (Cloudflare R2). No hay URL pública:
 * el único camino al archivo es `/admin/documentos/[id]`, que exige sesión de
 * admin y hace de proxy. Un documento de supervisión puede tener el nombre y
 * la firma de un rabino — no va a un bucket público.
 *
 * Los logos y portadas NO pasan por acá: son URLs que carga el admin, públicas
 * por definición. Ver DECISIONS.md.
 */

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export interface StoredDocument {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface S3Config {
  accountEndpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function readConfig(): S3Config | null {
  const accountEndpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accountEndpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    accountEndpoint: accountEndpoint.replace(/\/$/, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

function client(config: S3Config): AwsClient {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: process.env.S3_REGION ?? "auto",
  });
}

function objectUrl(config: S3Config, key: string): string {
  return `${config.accountEndpoint}/${config.bucket}/${encodeURI(key)}`;
}

export class StorageError extends Error {}

export function validateDocument(file: File): string | null {
  if (file.size === 0) return "El archivo está vacío";
  if (file.size > MAX_DOCUMENT_BYTES) return "El archivo supera los 10 MB";
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    return "Formato no permitido. Subí un PDF o una imagen.";
  }
  return null;
}

/** Sube el documento al bucket privado y devuelve su clave. */
export async function putPrivateDocument(
  file: File,
  prefix = "certificaciones",
): Promise<StoredDocument> {
  const config = readConfig();
  if (!config) {
    throw new StorageError(
      "Almacenamiento no configurado. Definí S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY.",
    );
  }

  const problem = validateDocument(file);
  if (problem) throw new StorageError(problem);

  // La clave no incluye el nombre original: evita colisiones y evita filtrar
  // información en el propio path.
  const extension = extensionFor(file.type);
  const storageKey = `${prefix}/${randomUUID()}${extension}`;

  const response = await client(config).fetch(objectUrl(config, storageKey), {
    method: "PUT",
    body: await file.arrayBuffer(),
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
    },
  });

  if (!response.ok) {
    throw new StorageError(`El almacenamiento rechazó el archivo (${response.status})`);
  }

  return {
    storageKey,
    fileName: file.name.slice(0, 200),
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

/** Descarga el documento. Solo se llama desde una ruta con sesión de admin. */
export async function getPrivateDocument(storageKey: string): Promise<Response> {
  const config = readConfig();
  if (!config) throw new StorageError("Almacenamiento no configurado");

  const response = await client(config).fetch(objectUrl(config, storageKey), {
    method: "GET",
  });
  if (!response.ok) {
    throw new StorageError(`No se pudo leer el documento (${response.status})`);
  }
  return response;
}

export async function deletePrivateDocument(storageKey: string): Promise<void> {
  const config = readConfig();
  if (!config) throw new StorageError("Almacenamiento no configurado");

  const response = await client(config).fetch(objectUrl(config, storageKey), {
    method: "DELETE",
  });
  // 404 es aceptable: el objetivo era que no exista.
  if (!response.ok && response.status !== 404) {
    throw new StorageError(`No se pudo borrar el documento (${response.status})`);
  }
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}
