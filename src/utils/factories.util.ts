import { randomInt } from 'node:crypto';

import { Poll } from '../entities/Poll';
import { User } from '../entities/User';

export const randomUser = (users: User[]) => {
  if (users.length === 0) return undefined;

  const index = randomInt(0, users.length);
  return users[index];
};

export const randomPoll = (polls: Poll[]) => {
  if (polls.length === 0) return undefined;

  const index = randomInt(0, polls.length);

  return polls[index];
};

export const randomSenderAndReceiver = (users: User[]) => {
  const sender = randomUser(users);
  let receiver = randomUser(users);
  while (sender === receiver) {
    receiver = randomUser(users);
  }
  return { sender, receiver };
};
