import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import dotenv from "dotenv";
import { GraphQLError } from "graphql";
import { ContextProps } from "../../types/resolvers";
import { CustomResponse } from "./errors";

dotenv.config();

const bucketName =
  process.env.AWS_BUCKET_NAME || "pre-signed-url-demo-gondorwebmasters";

const region = process.env.AWS_REGION || "eu-north-1";
const accessKeyId = process.env.AWS_ACCESS_KEY || "";
const secretAccessKey = process.env.AWS_SECRET_KEY || "";

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// ===== QUERY RESOLVERS =====
export const getPresignedUrl = async (
  _: any,
  {
    key,
  }: {
    key?: string;
  },
  context: ContextProps
) => {
  if (!context.currentUser)
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });

  const Key = key || `${crypto.randomUUID()}.jpeg`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key,
    ContentType: "image/jpeg",
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 2 });
    return CustomResponse(200, "Presigned URL generated successfully", true, {
      presignedUrl: url,
      key: Key,
    });
  } catch (error) {
    console.error("Error generating presigned URL", error);
    return CustomResponse(500, "Error generating presigned URL", false, null);
  }
};

export const s3Resolvers = {
  Query: {
    getPresignedUrl,
  },
  Mutation: {},
};
