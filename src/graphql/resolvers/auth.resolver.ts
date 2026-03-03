import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { RefreshToken } from '../../entities/RefreshToken';
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

const loginWithCompany = async (_: any, args: any, { em }: ContextProps) => {
  try {
    const { emailOrNickname, password, companyId } = args;

    const authService = new AuthService(em);

    return await authService.loginWithCompany({
      emailOrNickname,
      password,
      companyId,
    });
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
        emailOrNickname: user.email,
        password: process.env.DEFAULT_PASSWORD || '123456',
      },
      em
    );
  } catch (error: any) {
    return handleError(error);
  }
};

const me = async (_: any, __: any, { currentUser, em }: ContextProps) => {
  try {
    const authService = new AuthService(em);

    return await authService.getCurrentUser(currentUser.id);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====
const selectCompany = async (
  _: any,
  args: any,
  { currentUser, em }: ContextProps
) => {
  try {
    const { companyId } = args;

    const authService = new AuthService(em);

    return await authService.selectCompany({
      userId: currentUser.id,
      companyId,
    });
  } catch (error: any) {
    return handleError(error);
  }
};

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

const refreshAccessToken = async (
  _: any,
  { inputToken }: { inputToken: string },
  { em }: ContextProps
) => {
  try {
    if (!inputToken) {
      return {
        success: false,
        code: '400',
        message: 'Refresh token is required',
      };
    }

    const storedRefreshToken = await em.findOne(
      RefreshToken,
      { token: inputToken },
      { populate: ['user'] }
    );

    if (!storedRefreshToken) {
      return {
        success: false,
        code: '401',
        message: 'Invalid refresh token',
      };
    }

    if (storedRefreshToken.expiresAt < new Date()) {
      await em.removeAndFlush(storedRefreshToken);
      return {
        success: false,
        code: '401',
        message: 'Refresh token expired',
      };
    }

    const user = storedRefreshToken.user;
    const userForToken = {
      id: user.id,
      userId: user.id,
      email: user.email,
    };

    const token = jwt.sign(userForToken, process.env.JWT_SECRET!, {
      expiresIn: '30m',
    });

    const newRefreshTokenString = crypto.randomBytes(64).toString('hex');
    storedRefreshToken.token = newRefreshTokenString;
    storedRefreshToken.expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ); // 30 days

    await em.flush();

    return {
      success: true,
      code: '200',
      message: 'Token refreshed successfully',
      tokens: {
        token,
        refreshToken: newRefreshTokenString,
      },
    };
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
    sendChangePasswordEmail,
    refreshAccessToken,
  },
};
