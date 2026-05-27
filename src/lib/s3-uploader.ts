import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? "techiebears-internal";
const REGION = process.env.AWS_REGION ?? "ap-south-1";
const KEY_PREFIX = "products/";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadProductImage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadResult> {
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${KEY_PREFIX}${crypto.randomUUID()}-${sanitizedFilename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { url, key };
}
