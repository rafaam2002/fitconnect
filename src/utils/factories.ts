import { Poll } from "../entities/Poll";
import { User } from "../entities/User";

export const randomUser = (users: User[]) =>
  users[Math.floor(Math.random() * users.length)];

export const randomPoll = (polls: Poll[]) =>
  polls[Math.floor(Math.random() * polls.length)];

export const randomSenderAndReceiver = (users: User[]) => {
  const sender = randomUser(users);
  let receiver = randomUser(users);
  while (sender === receiver) {
    receiver = randomUser(users);
  }
  return { sender, receiver };
};

export const randomUserAndPoll = (usersAndPolls: [User, Poll][]) => {
  const index = Math.floor(Math.random() * usersAndPolls.length);
  if (usersAndPolls.length === 0) {
    throw new Error("No more users and polls aviable");
  }
  const userAndPull = usersAndPolls[index];
  usersAndPolls.splice(index, 1);
  return { user: userAndPull[0], poll: userAndPull[1] };
}