import { EntityManager, Loaded, MikroORM } from "@mikro-orm/core";
import { User } from "../../entities/User";
import bcrypt from "bcrypt";
import crypto from "crypto";

const allUsers = async (root: any, arg: any, { em }: { em: EntityManager }) => {
  const user = em.getRepository(User);
  return await user.findAll();
};

const me = async (
  root: any,
  args: any,
  context: { em: EntityManager; currentUser: any }
) => {
  const user = context.em.getRepository(User);
  const currentUser = context.currentUser;
  if (!currentUser) {
    return null;
  }
  //falta conseguir el usuario actual
  const me = await user.findAll();

  if (me) {
    return me;
  } else {
    return null;
  }
};

const findUser = async (
  root: any,
  args: { id: number },
  { em }: { em: EntityManager }
) => {
  const user = em.getRepository(User);
  const { id } = args;
  return await user.findOne({ id });
};

const createUser = async (_, args, { em }: { em: EntityManager }) => {
  const user = em.getRepository(User);
  const { name, email, password, rol, surname, nickname } = args.input as User;

  if (!email || !name || !surname || !password || !rol) {
    return {
      success: false,
      code: "400",
      message: "Please provide all required fields",
      user: null,
    };
  }

  const existingEmail = await user.findOne({ email });

  if (existingEmail) {
    return {
      success: false,
      code: "400",
      message: "Email already exists",
      user: null,
    };
  }

  const existingNickName = await user.findOne({ nickname });

  if (existingNickName) {
    return {
      success: false,
      code: "400",
      message: "NickName already exists",
      user: null,
    };
  }

  let newUser = new User({ ...args.input });

  await em.persist(newUser).flush();

  if (!newUser.id)
    return {
      success: false,
      code: "400",
      message: "User not created",
      user: null,
    };
  return {
    success: true,
    code: "200",
    message: "User created successfully",
    user: newUser,
  };
};

const updateUser = async (
  _: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: any }
) => {
  const { input } = args;
  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
      user: null,
    };
  }
  if (currentUser.role !== "ADMIN") {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
      user: null,
    };
  }

  if (!input || !input.id) {
    return {
      success: false,
      code: "400",
      message: "Invalid input",
      user: null,
    };
  }

  const user: any = await em.find(User, { id: input.id });

  if (!user) {
    return {
      success: false,
      code: "400",
      message: "User not found",
      user: null,
    };
  }

  if (user.rol === "boss") {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
      user: null,
    };
  }

  delete input.id;

  const updatedUser = await em.find(User, { id: user.id }, { ...input });
  //console.log(updatedUser)
  if (!updatedUser) {
    return {
      success: false,
      code: "400",
      message: "User not updated",
      user: null,
    };
  }
  return {
    success: true,
    code: "200",
    message: "User updated successfully",
    user: updatedUser,
  };
};

const resetPassword = async (
  _: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: any }
) => {
  const { id, password } = args.input;
  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
      user: null,
    };
  }
  if (currentUser.role !== "ADMIN") {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
      user: null,
    };
  }

  if (!password || !id) {
    return {
      success: false,
      code: "400",
      message: "Invalid input",
      user: null,
    };
  }

  const user = await em.findOne(User, { id });

  if (!user) {
    return {
      success: false,
      code: "400",
      message: "User not found",
      user: null,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  Object.assign(user, {
    password: passwordHash,
  });

  await em.flush();

  /* if (!updatedUser) {
       return {
         success: false,
         code: '400',
         message: 'User not updated',
         user: null
       }
     }*/

  return {
    success: true,
    code: "200",
    message: "User updated successfully",
    user: user,
  };
};

const user = async (parent, args, { em }: { em: EntityManager }) => {
  const { id, email } = args;
  if (!id && !email) {
    return {
      success: false,
      code: "400",
      message: "Please provide all required fields",
      user: null,
    };
  }
  const user = await em.findOne(User, { id });
  if (!user) {
    return {
      success: false,
      code: "404",
      message: "User not found",
      user: null,
    };
  }

  return user;
};

const removeUser = async (parent, args, { em }: { em: EntityManager }) => {
  const { id } = args;
  if (!id) {
    return {
      success: false,
      code: "400",
      message: "Please provide all required fields",
      user: null,
    };
  }
  const user = em.getReference(User, id);
  if (!user) {
    return {
      success: false,
      code: "404",
      message: "User not found",
      user: null,
    };
  }

  await em.removeAndFlush(user);

  return user;
};

export {
  allUsers,
  createUser,
  updateUser,
  resetPassword,
  removeUser,
  user,
  me,
  findUser,
};
