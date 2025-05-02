import aws from "aws-sdk";
import dotenv from "dotenv";
import { ContextProps } from "../../../types/resolvers";
import { CustomResponse } from "../errors";
import crypto from "crypto";

dotenv.config();

const region = process.env.AWS_REGION || "eu-north-1";
const bucketName =
  process.env.AWS_BUCKET_NAME || "pre-signed-url-demo-gondorwebmasters";

const accessKeyId = process.env.AWS_ACCESS_KEY || "";
const secretAccessKey = process.env.AWS_SECRET_KEY || "";

const s3 = new aws.S3({
  region,
  accessKeyId,
  secretAccessKey,
  signatureVersion: "v4",
});

export const getPresignedUrl = async (
  _: any,
  __: any,
  context: ContextProps
) => { 
  if (!context.currentUser) return CustomResponse(400, "Please login");

  const rawBytes = crypto.randomBytes(16);
  const Key = rawBytes.toString("hex") + ".jpg"; // Generate a random image name
  const params = {
    Bucket: bucketName,
    Key,
    Expires: 60 * 2, // URL expiration time in seconds
  };

  try {
    const url = await s3.getSignedUrlPromise("putObject", params);
    return CustomResponse(200, "Presigned URL generated successfully", true, {
      presignedUrl: url,
    });
  } catch (error) {
    console.error("Error generating presigned URL", error);
    return CustomResponse(500, "Error generating presigned URL", false, null);
  }
};
