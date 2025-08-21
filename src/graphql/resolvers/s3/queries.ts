import aws from "aws-sdk";
import dotenv from "dotenv";
import { ContextProps } from "../../../types/resolvers";
import { CustomResponse } from "../errors";
import crypto from "crypto";
import { GraphQLError } from "graphql";

dotenv.config();

const bucketName =
  process.env.AWS_BUCKET_NAME || "pre-signed-url-demo-gondorwebmasters";

const region = process.env.AWS_REGION || "eu-north-1";
const accessKeyId = process.env.AWS_ACCESS_KEY || "";
const secretAccessKey = process.env.AWS_SECRET_KEY || "";

export const s3 = new aws.S3({
  apiVersion: "2006-03-01",
  region,
  accessKeyId,
  secretAccessKey,
  signatureVersion: "v4",
});

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
  const params = {
    Bucket: bucketName,
    Key,
    Expires: 60 * 2, // URL expiration time in seconds
    ContentType: "image/jpeg", // Specify the content type
  };

  try {
    const url = await s3.getSignedUrl("putObject", params);
    return CustomResponse(200, "Presigned URL generated successfully", true, {
      presignedUrl: url,
      key: Key,
    });
  } catch (error) {
    console.error("Error generating presigned URL", error);
    return CustomResponse(500, "Error generating presigned URL", false, null);
  }
};
