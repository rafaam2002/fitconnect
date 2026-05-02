import { User } from '../../entities/User';
import { AuthService } from '../../services/auth.service';
import {
  ContextProps,
  LoginProps,
  PasswordResetProps,
  UpdatePasswordProps,
} from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====
const login = async (_: any, args: LoginProps, { em }: ContextProps) => {
  try {
    const { emailOrNickname, password } = args;

    const authService = new AuthService(em);

    return await authService.login({ emailOrNickname, password });
  } catch (error: any) {
    return handleError(error);
  }
};

const loginWithId = async (_: any, args: any, { em }: ContextProps) => {
  try {
    const { id } = args;
    const user = await em.findOne(User, { id }, { populate: ['password'] });

    return await login(
      _,
      {
        emailOrNickname: user?.email ?? 'rafa@mail.com',
        password: process.env.DEFAULT_PASSWORD || '123456',
      },
      em as any
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

const forgotPassword = async (
  _: any,
  { email }: PasswordResetProps,
  { em }: ContextProps
) => {
  try {
    const authService = new AuthService(em);

    return await authService.forgotPassword(email);
  } catch (error: any) {
    return handleError(error);
  }
};

const updatePassword = async (
  _: any,
  { password }: UpdatePasswordProps,
  { currentUser, em }: ContextProps
) => {
  try {
    const authService = new AuthService(em);
    return await authService.updatePassword(currentUser.id, password);
  } catch (error: any) {
    return handleError(error);
  }
};

const sendChangePasswordEmail = async (
  _: any,
  { email }: PasswordResetProps,
  { em }: ContextProps
) => {
  try {
    const authService = new AuthService(em);
    return await authService.sendChangePasswordEmail(email);
  } catch (error: any) {
    return handleError(error);
  }
};

const loginWithGoogle = async (_: any, args: any, { em }: ContextProps) => {
  try {
    const { id_token } = args;

    const authService = new AuthService(em);
    return await authService.loginWithGoogle({ id_token });
  } catch (error: any) {
    return handleError(error);
  }
};

const loginWithApple = async (_: any, args: any, { em }: ContextProps) => {
  try {
    const { idToken, user } = args;
    const authService = new AuthService(em);
    return await authService.loginWithApple({ idToken, user });
  } catch (error: any) {
    return handleError(error);
  }
};

const refreshAccessToken = async (
  _: any,
  { inputToken }: { inputToken: string },
  { em }: ContextProps
) => {
  try {
    const authService = new AuthService(em);
    return await authService.refreshAccessToken(inputToken);
  } catch (error: any) {
    return handleError(error);
  }
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
    loginWithApple,
    sendChangePasswordEmail,
    refreshAccessToken,
  },
};
