import { EntityManager } from "@mikro-orm/core";
import jwt from "jsonwebtoken";
import { User } from "../entities/User";
import {CurrentUser} from "../types/common.type";

export const authenticateUser = async (
  em: EntityManager,
  authorization?: string
): Promise<CurrentUser | null> => {
  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.substring(7);

    try {
      const decodedToken =  jwt.verify(token, process.env.JWT_SECRET) ;
      const currentUser = await em.findOne(User, { id: decodedToken.id }, {
        filters: false,
        populate: ["companies"]
      } as any);

      
      return currentUser || null;
    } catch (error) {
        console.error(
        `Authentication Error (${new Date().toISOString()}):`,
        error
      );
      return null;
    }
  }
  return null;
};
