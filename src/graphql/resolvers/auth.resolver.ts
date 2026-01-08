import { User } from "../../entities/User";
import { GraphQLError } from "graphql";
import {AuthService} from "../../services/auth.service";
import {ContextProps, LoginProps, PasswordResetProps, UpdatePasswordProps} from "../../types/resolvers";
import {createServiceResponse} from "../../utils/errors.util";

// ===== QUERY RESOLVERS =====
const login = async (_: any, args: LoginProps, { em }: ContextProps) => {
  const { emailOrNickname, password } = args;

  const authService = new AuthService(em);

  return await authService.login({ emailOrNickname, password });
};

const loginWithCompany = async (_: any, args: any, { em }: ContextProps) => {
  const { emailOrNickname, password, companyId } = args;

  const authService = new AuthService(em);

  return await authService.loginWithCompany({
    emailOrNickname,
    password,
    companyId
  });
};

const loginWithId = async (_: any, args: any, { em }: ContextProps) => {
  const { id } = args;
  const user = await em.findOne(User, { id }, { populate: ["password"] });

  return await login(
    _,
    { emailOrNickname: user.email, password: process.env.DEFAULT_PASSWORD || "123456" },
    em
  );
};

const me = async (_: any, __: any, { currentUser, em }: ContextProps) => {
  const authService = new AuthService(em);

  return await authService.getCurrentUser(currentUser.id);
};

// ===== MUTATION RESOLVERS =====
const selectCompany = async (_: any, args: any, { currentUser, em }: ContextProps) => {
  const { companyId } = args;

  const authService = new AuthService(em);

  return await authService.selectCompany({
    userId: currentUser.id,
    companyId
  });
};

const forgotPassword = async (_: any, { email }: PasswordResetProps, { em }: ContextProps) => {
  const authService = new AuthService(em);

  return await authService.forgotPassword(email);
};

const updatePassword = async (_: any, { password }: UpdatePasswordProps, { currentUser, em }: ContextProps) => {

  const authService = new AuthService(em);
  return await authService.updatePassword(currentUser.id, password);
};

const sendChangePasswordEmail = async (_: any, { email }: PasswordResetProps, { em }: ContextProps) => {
  const authService = new AuthService(em);
  return await authService.sendChangePasswordEmail(email);

};

const loginWithGoogle = async (_: any, args: any, { em }: ContextProps) => {
  const { id_token } = args;

  const authService = new AuthService(em);
  return await authService.loginWithGoogle({ id_token });

};


export const authResolvers = {
  Query: {
    login,
    loginWithId,
  },
  Mutation: {
    forgotPassword,
    updatePassword,
    loginWithGoogle,
    sendChangePasswordEmail,
  },
};
