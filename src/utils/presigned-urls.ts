import { EntityManager } from "@mikro-orm/core";
import { Company } from "../entities/Company";
import { PictureUrl } from "../entities/PictureUrl";
import { Product } from "../entities/Product";
import { User } from "../entities/User";
import { getPresignedUrl } from "./s3Client";

export * from "./s3Client";

export const updatePictureUrls = async (em: EntityManager) => {
  const userRepo = em.getRepository(User);
  const productPictureRepo = em.getRepository(Product);
  const users = await userRepo.findAll({
    where: {
      pictureUrl: {
        $ne: null,
      },
    },
    filters: false,
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
