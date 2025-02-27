import { EntityManager } from "@mikro-orm/postgresql";
import { UserType } from "../../../types";
import { Article } from "../../../entities/Article";

export const getArticles = async (
  _: any,
  { page }: { page: number },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  //   const productRepo = em.getRepository(Product);

  if (!currentUser) {
    return {
      success: false,
      code: "401",
      message: "Please login",
    };
  }

  const articleRepo = em.getRepository(Article);

  const limit = 5;
  const offset = (page - 1) * limit;

  const articles = await articleRepo.findAll({
    limit,
    offset,
  });

  return {
    success: true,
    code: "200",
    message: "Articles found",
    articles,
  };
};
