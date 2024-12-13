import { EntityManager } from "@mikro-orm/core";
import { User } from "../../../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const createUser = async (_, args, { em }: { em: EntityManager }) => {
  const user = em.getRepository(User);

  const { name, email, password, surname, nickname } = args.user as User;

  if (!email || !name || !surname || !password) {
    return {
      success: false,
      code: "400",
      message: "Please provide all required fields",
      user: null,
      token: null
    };
  }

  const existingEmail = await user.findOne({ email });

  if (existingEmail) {
    return {
      success: false,
      code: "400",
      message: "Email already exists",
      user: null,
      token: null
    };
  }

  const existingNickName = await user.findOne({ nickname });

  if (existingNickName) {
    return {
      success: false,
      code: "400",
      message: "NickName already exists",
      user: null,
      token: null
    };
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  let newUser:User = em.create(User,{ ...args.user, password: hashedPassword});
  console.log('user', newUser.id)
  await em.persistAndFlush(newUser);

  if (!newUser.id)
    return {
      success: false,
      code: "400",
      message: "User not created",
      user: null,
      token: null,
    };

  const token = jwt.sign({id: newUser.id}, process.env.JWT_SECRET, {expiresIn: '1d'});

  return {
    success: true,
    code: "200",
    message: "User created successfully",
    user: newUser,
    token
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
