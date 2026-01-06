import { User } from "../../entities/User";
import { CustomResponse } from "./errors";
import { GraphQLError } from "graphql";
import {AuthService} from "../../services/AuthService";
import {ContextProps, LoginProps, PasswordResetProps, UpdatePasswordProps} from "../../types/resolvers";

// ===== QUERY RESOLVERS =====
const login = async (_: any, args: LoginProps, { em }: ContextProps) => {
  const { emailOrNickname, password } = args;

  const authService = new AuthService(em);
  const result = await authService.login({ emailOrNickname, password });

  return CustomResponse(
      parseInt(result.code),
      result.message,
      result.success,
      result.data
  );
};

const loginWithCompany = async (_: any, args: any, { em }: ContextProps) => {
  const { emailOrNickname, password, companyId } = args;

  const authService = new AuthService(em);
  const result = await authService.loginWithCompany({
    emailOrNickname,
    password,
    companyId
  });

  return CustomResponse(
      parseInt(result.code),
      result.message,
      result.success,
      result.data
  );
};

const loginWithId = async (_: any, args: any, { em }: ContextProps) => {
  const { id } = args;
  const user = await em.findOne(User, { id }, { populate: ["password"] });
  return login(
    _,
    { emailOrNickname: user.email, password: process.env.DEFAULT_PASSWORD || "123456" },
    em
  );
};

const me = async (_: any, __: any, { currentUser, em }: ContextProps) => {
  if (!currentUser) {
    throw new GraphQLError('Not authenticated', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }

  const authService = new AuthService(em);
  return await authService.getCurrentUser(currentUser.id);
};

// ===== MUTATION RESOLVERS =====
const selectCompany = async (_: any, args: any, { currentUser, em }: ContextProps) => {
  if (!currentUser) {
    throw new GraphQLError('Not authenticated', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }

  const { companyId } = args;

  const authService = new AuthService(em);
  const result = await authService.selectCompany({
    userId: currentUser.id,
    companyId
  });

  return CustomResponse(
      parseInt(result.code),
      result.message,
      result.success,
      result.data
  );
};

const forgotPassword = async (_: any, { email }: PasswordResetProps, { em }: ContextProps) => {
  const authService = new AuthService(em);
  const result = await authService.forgotPassword(email);

  return CustomResponse(
      parseInt(result.code),
      result.message,
      result.success,
      result.data
  );
};

const updatePassword = async (_: any, { password }: UpdatePasswordProps, { currentUser, em }: ContextProps) => {
  if (!currentUser) {
    throw new GraphQLError('Please login, token_expired', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }

  const authService = new AuthService(em);
  const result = await authService.updatePassword(currentUser.id, password);

  return CustomResponse(
      parseInt(result.code),
      result.message,
      result.success,
      result.data
  );
};

const sendChangePasswordEmail = async (_: any, { email }: PasswordResetProps, { em }: ContextProps) => {
  const authService = new AuthService(em);
  const result = await authService.sendChangePasswordEmail(email);

  return CustomResponse(
      parseInt(result.code),
      result.message,
      result.success,
      result.data
  );
};

const loginWithGoogle = async (_: any, args: any, { em }: ContextProps) => {
  const { id_token } = args;

  const authService = new AuthService(em);
  const result = await authService.loginWithGoogle({ id_token });

  return CustomResponse(
      parseInt(result.code),
      result.message,
      result.success,
      result.data
  );
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
