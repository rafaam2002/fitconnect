import { EntityManager } from "@mikro-orm/postgresql";
import { UserType } from "../../../types";
import { Article } from "../../../entities/Article";
import { GraphQLError } from "graphql";

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
    throw new GraphQLError("Please login, token_expired", {
        extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
        },
    });
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
