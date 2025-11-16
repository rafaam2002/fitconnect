import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { PictureUrl } from "../entities/PictureUrl";
import { User } from "../entities/User";
import { Product } from "../entities/Product";
import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Company } from "../entities/Company";

dotenv.config();

const region = process.env.AWS_REGION || "eu-north-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

type Item = {
  id: string;
  name: string;
  type: "user" | "product";
};

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const updatePictureUrls = async (em: EntityManager) => {
  const userRepo = em.getRepository(User);
  const productPictureRepo = em.getRepository(Product);
  const users = await userRepo.findAll({
    where: {
      pictureUrl: {
        $ne: null,
      },
    },
  });
  users.forEach(async (user) => {
    user.pictureUrl.url = await getPresignedUrl(user.pictureUrl.name);
    em.persistAndFlush(user);
  });

  const products = await productPictureRepo.findAll({
    where: {
      pictures: {
        $ne: null,
      },
    },
  });
  products.forEach(async (product) => {
    product.pictures.getItems().forEach(async (picture) => {
      picture.url = await getPresignedUrl(picture.name);
      em.persistAndFlush(picture);
    });
  });
};

export const getPresignedUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 30 * 24 * 3600 }); // 30 days
  return url;
};

export const createPictureUrl = (
  em: EntityManager,
  item: { id: string; name: string; type: "user" | "product" | "companyLogo" },
  url: string
): PictureUrl => {
  const owner = {
    user: null,
    product: null,
    companyLogo: null,
  };
  switch (item.type) {
    case "user":
      const user = em.getReference(User, item.id);
      owner.user = user;
      break;
    case "product":
      const productPicture = em.getReference(Product, item.id);
      owner.product = productPicture;
      break;
    case "companyLogo":
      const company = em.getReference(Company, item.id);
      owner.companyLogo = company;
      break;
    default:
      throw new Error("Invalid item type");
  }

  const pictureUrl = em.create(PictureUrl, {
    name: item.name,
    url,
    ...owner,
  });
  return pictureUrl;
};
