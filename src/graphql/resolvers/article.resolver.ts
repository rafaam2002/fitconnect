import { Article } from "../../entities/Article";
import { GraphQLError } from "graphql";
import {CustomResponse} from "./errors";
import {ContextProps} from "../../types/resolvers";

type PaginationProps = {
  limit: number;
  offset: number;
};

// ===== QUERY RESOLVERS =====
export const getArticles = async (
  _: any,
  { limit, offset }: PaginationProps,
  { em, currentUser }: ContextProps
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