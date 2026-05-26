import { Storage } from "@google-cloud/storage";

function createObjectStorageClient(): Storage {
  const projectId = process.env.GCS_PROJECT_ID?.trim() || undefined;
  const keyFilename = process.env.GCS_KEY_FILE?.trim() || undefined;

  if (keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new Storage({ projectId, keyFilename });
  }

  // Application Default Credentials (GCE, Cloud Run, local gcloud auth, etc.)
  return new Storage({ projectId });
}

export const objectStorageClient = createObjectStorageClient();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR not set. Set to your GCS object prefix (e.g. /bucket-name/private).",
    );
  }
  return dir;
}
