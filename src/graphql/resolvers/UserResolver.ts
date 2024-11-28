
import { MikroORM } from "@mikro-orm/core";
import { User } from "../../entities/User";

export const UserResolver = (orm: MikroORM) => {
  const em = orm.em.fork();

  return {
    Query: {
      users: async () => {
        return await em.find(User, {});
      },
    //   getUserById: async (_: any, { id }: { id: string }) => {
    //     return await em.findOne(User, { id });
    //   },
    },
    // Mutation: {
    //   createUser: async (
    //     _: any,
    //     { name, email }: { name: string; email?: string }
    //   ) => {
    //     const user = new User();
    //     user.name = name;
    //     user.email = email;
    //     await em.persistAndFlush(user);
    //     return user;
    //   },
    // //   updateUser: async (
    // //     _: any,
    // //     {
    // //       id,
    // //       name,
    // //       email,
    // //       isActive,
    // //     }: { id: number; name?: string; email?: string; isActive?: boolean }
    // //   ) => {
    // //     const user = await em.findOne(User, { id });
    // //     if (!user) {
    // //       throw new Error(`User with ID ${id} not found`);
    // //     }
    // //     if (name !== undefined) user.name = name;
    // //     if (email !== undefined) user.email = email;
    // //     if (isActive !== undefined) user.isActive = isActive;
    // //     await em.flush();
    // //     return user;
    // //   },
    // //   deleteUser: async (_: any, { id }: { id: number }) => {
    // //     const user = await em.findOne(User, { id });
    // //     if (!user) {
    // //       throw new Error(`User with ID ${id} not found`);
    // //     }
    // //     await em.removeAndFlush(user);
    // //     return true;
    // //   },
    // },
  };
};
