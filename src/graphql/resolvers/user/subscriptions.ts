import { PubSub, withFilter } from "graphql-subscriptions";
import { MESSAGE_EVENT, myPubsub } from "../../../constants/subscriptions";
import { FORUM } from "../../../constants/forum";

export const newMessage = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      // Suponiendo que payload.newMessage contiene sender y receiver con sus respectivos ids.
      return (
        payload.newMessage.receiver.id === currentUser.id ||
        payload.newMessage.receiver.id === FORUM.id
      );
    }
  ),
};
