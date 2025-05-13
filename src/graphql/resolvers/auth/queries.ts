import { User } from "../../../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const login = async (_, args: any, { em }) => {
  const { email, password } = args;
  const user:User = await em.findOne(User, { email }, { populate: ["password"] });

  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.password);
  if (!(user && passwordCorrect)) {
    return {
      success: false,
      code: "400",
      message: "Invalid email or password",
      user: null,
      token: null,
    };
  }
  const userForToken = {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    isBlocked: user.isBlocked,
    isActive: user.isActive,
    rol: user.rol,
    nickname: user.nickname,
    phoneNumber: user.phoneNumber,
    pictureUrl: user.pictureUrl,
  };
  const token = await jwt.sign(userForToken, process.env.JWT_SECRET);

  if (token) {
    return {
      success: true,
      code: "200",
      message: "Login successful",
      user: user,
      tokens: {
        token,
        refreshToken: "",
      },
    };
  } else {
    return {
      success: false,
      code: "400",
      message: "Login failed",
      user: null,
      token: null,
    };
  }
};

const loginWithId = async (_, args: any, { em }) => {
  const { id } = args;
  const user = await em.findOne(User, { id }, { populate: ["password"] });
  return login(
    _,
    { email: user.email, password: process.env.DEFAULT_PASSWORD || "123456" },
    { em }
  );
};

export { login, loginWithId };
