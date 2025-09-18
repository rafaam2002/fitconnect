import { EntityManager } from "@mikro-orm/postgresql";
import { UserType } from "../../types";
import { Article } from "../../entities/Article";
import { GraphQLError } from "graphql";
import {CustomResponse} from "./errors";

type ContextType = {
  em: EntityManager;
  currentUser: UserType;
};

type PaginationProps = {
  limit: number;
  offset: number;
};

// ===== QUERY RESOLVERS =====
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

  return CustomResponse(200, 'Articles are fetched successfully.', true, {articles, hasMore: offset+limit<totalArticles})

};

 export const articleResolvers = {
     Query: {
         getArticles
     },
     Mutation: {

     }
 }