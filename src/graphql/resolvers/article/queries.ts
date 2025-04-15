import { EntityManager } from "@mikro-orm/postgresql";
import { UserType } from "../../../types";
import { Article } from "../../../entities/Article";

type ContextType = {
  em: EntityManager;
  currentUser: UserType;
};

type PaginationProps = {
  limit: number;
  offset: number;
};

export const getArticles = async (
  _: any,
  { limit, offset }: PaginationProps,
  { em, currentUser }: ContextType
) => {

  if (!currentUser) {
    return {
      success: false,
      code: "401",
      message: "Please login",
    };
  }
  const articles = await em.find(
    Article,
    {},
    {
      limit,
      offset,
    }
  );

  const totalArticles = await em.count(Article);

  return {
    success: true,
    code: "200",
    message: "Articles found",
    articles,
    hasMore: offset + limit < totalArticles,
  };
};
