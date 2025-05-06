import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { EntityManager } from "@mikro-orm/postgresql";
import { PictureUrl } from "../entities/PictureUrl";
import { User } from "../entities/User";
import { Product } from "../entities/Product";

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
  //falta hacer los productos
  const userRepo = em.getRepository(User);
  const productPictureRepo = em.getRepository(Product);
  const users = await userRepo.findAll({
    fields: ["pictureUrl"],
    filters: {
      pictureUrl: {
        $ne: null,
      },
    },
  });
  users.forEach(async (user) => {
    user.pictureUrl.url = await getPresignedUrl(user.pictureUrl.name);
    em.persistAndFlush(user);
  });

  // const productPictures = await productPictureRepo.findAll({
  //   fields: ["id", "name"],
  //   filters: {
  //     picture: {
  //       $ne: null,
  //     },
  //   },
  // });

  // const userItems = userPictures.map(
  //   (u): Item => ({
  //     id: u.id,
  //     name: u.profilePicture!, // ¡sabemos que no es null
  //     type: "user",
  //   })
  // );

  // const productItems = productPictures.map(
  //   (p): Item => ({
  //     id: p.id,
  //     name: p.name,
  //     type: "product",
  //   })
  // );

  // const pictureNames = [...userItems, ...productItems];

  // pictureNames.forEach(async (item) => {
  //   const url = await getPresignedUrl(item.name);
  //   em.persistAndFlush(createPictureUrl(em, item, url));
  // });
};

export const getPresignedUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return url;
};

export const createPictureUrl = (
  em: EntityManager,
  item: { id: string; name: string; type: "user" | "product" },
  url: string
): PictureUrl => {
  const owner = {
    user: null,
    product: null,
  };
  if (item.type === "user") {
    const user = em.getReference(User, item.id);
    owner.user = user;
  } else {
    const productPicture = em.getReference(Product, item.id);
    owner.product = productPicture;
  }
  const pictureUrl = em.create(PictureUrl, {
    name: item.name,
    url,
    ...owner,
  });
  return pictureUrl;
};
