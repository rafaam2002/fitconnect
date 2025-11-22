import jwt from "jsonwebtoken";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Poll } from "../entities/Poll";
import { UserType } from "../types";

export const authenticateUser = async (
  em: EntityManager,
  authorization?: string
): Promise<UserType | null> => {
  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.substring(7);

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as {
        id: string;
      };
      const currentUser = await em.findOne(User, { id: decodedToken.id }, {
        filters: false, 
        populate: ["companies"]
      });

      
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
