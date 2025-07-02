import { PubSub, withFilter } from "graphql-subscriptions";
import {
  FIXED_MESSAGE_EVENT,
  MESSAGE_EVENT,
  myPubsub,
} from "../../../constants/subscriptions";
import { FORUM } from "../../../constants/forum";

export const newMessage = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      return (
        payload.newMessage.receiver.id === currentUser.id ||
        payload.newMessage.sender.id === currentUser.id ||
        payload.newMessage.receiver.id === process.env.DB_FORUM_ID
      );
    }
  ),
};

export const fixedMessages = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(FIXED_MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      // Suponiendo que payload.newMessage contiene sender y receiver con sus respectivos ids.
      return (
        payload.newMessage.receiver.id === currentUser.id ||
        payload.newMessage.sender.id === currentUser.id ||
        payload.newMessage.receiver.id === process.env.DB_FORUM_ID
      );
    }
  ),
};
