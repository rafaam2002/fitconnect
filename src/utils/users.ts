import { randomInt } from 'node:crypto';

import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import moment from 'moment';

import { User } from '../entities/User';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const setNotActiveUsers = async (
  em: EntityManager<IDatabaseDriver<Connection>>
) => {
  const userRepo = em.getRepository(User);
  const users = await userRepo.findAll({ filters: false });

  const deadline = moment().subtract(1, 'month');

  for (const user of users) {
    if (!user.schedules || user.schedules.length === 0) user.isActive = false;
    else if (user.schedules && user.schedules.length > 0)
      user.schedules.getItems().forEach(schedule => {
        if (moment(Number(schedule.startDate)).isBefore(deadline)) {
          user.isActive = false;
        }
      });
    else user.isActive = true;
  }
};

export const generateTempPassword = (length: number = 6): string => {
  const characters = process.env.PASSWORD_KEY_ENTRY || 'asdfasdfqweqwe12341234';
  let result = '';
  for (let i = 0; i < length; i++) {
    const index = randomInt(0, characters.length);
    result += characters.charAt(index);
  }
  return result;
};

export function decodeAppleToken(idToken: string): {
  appleId: string;
  email?: string;
} | null {
  try {
    // Apple tokens are verified client-side by the native SDK.
    // We decode to extract the stable `sub` (Apple User ID) and email.
    const payload = jwt.decode(idToken) as {
      sub?: string;
      email?: string;
    } | null;

    if (!payload?.sub) return null;

    return {
      appleId: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    console.error('Apple token decode failed:', error);
    return null;
  }
}

export async function verifyGoogleToken(idToken: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return null;

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    return null;
  }
}
